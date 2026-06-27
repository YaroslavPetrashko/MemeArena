// SNAP boss AI. Pure & deterministic (all randomness via seeded Rng).
//
// Each turn the boss enumerates legal single/multi-card plays under its energy,
// scores them with a personality-weighted heuristic, and picks among the top
// few with seeded randomness so it's strong but not perfect.

import type {
  SnapMatchState,
  SnapStagedPlay,
  SnapCard,
  SnapLocation,
  BossPersonality,
} from "../../../types/snap";
import { type Rng, pickWeighted } from "./prng";
import { getSnapBoss } from "../../../data/snapBosses";
import {
  findLocation,
  openSlots,
  locationLeader,
  type Side,
} from "./helpers";
import { locationExtraCost, locationAllowsPlacement } from "./snapLocations";

interface PlannedPlay {
  instanceId: string;
  locationId: string;
}

interface Candidate {
  plays: PlannedPlay[];
  energyUsed: number;
  score: number;
}

export interface PersonalityWeights {
  energyGreed: number; // reward spending more energy
  contest: number; // reinforce narrowly-lost locations
  reinforce: number; // pile onto narrowly-won locations
  spread: number; // prefer spreading across locations
  ability: number; // value ability cards
  randomness: number; // exploration temperature
}

const PERSONALITY: Record<BossPersonality, PersonalityWeights> = {
  aggressive: { energyGreed: 1.4, contest: 1.2, reinforce: 1.4, spread: 0.6, ability: 0.6, randomness: 0.5 },
  disruptive: { energyGreed: 1.0, contest: 1.3, reinforce: 0.8, spread: 0.8, ability: 1.6, randomness: 0.7 },
  greedy: { energyGreed: 0.7, contest: 0.8, reinforce: 1.0, spread: 0.7, ability: 0.9, randomness: 0.6 },
  wide: { energyGreed: 1.2, contest: 1.0, reinforce: 0.7, spread: 1.6, ability: 0.8, randomness: 0.7 },
  stacker: { energyGreed: 1.1, contest: 0.7, reinforce: 1.6, spread: 0.3, ability: 1.0, randomness: 0.5 },
  chaotic: { energyGreed: 1.0, contest: 1.0, reinforce: 1.0, spread: 1.0, ability: 1.0, randomness: 1.4 },
};

/** Plan and stage the boss's plays for the current turn. */
export function generateBossTurn(state: SnapMatchState, rng: Rng): SnapStagedPlay[] {
  const boss = getSnapBoss(state.bossId)!;
  const weights = PERSONALITY[boss.personality];
  const energy = state.boss.energy;

  const candidates = generateLegalBossPlays(state, energy);
  if (!candidates.length) return [];

  for (const cand of candidates) {
    cand.score = scoreBossPlay(state, cand, weights, boss.preferredLocations);
  }
  candidates.sort((a, b) => b.score - a.score);

  // Weighted pick among the top 3 (greedy on energy as a tiebreak baseline).
  const top = candidates.slice(0, 3);
  const chosen = pickWeighted(
    top,
    (c) => Math.max(0.01, c.score) * (1 + weights.randomness * rng.next()),
    rng,
  );

  return chosen.plays.map((p, i) => ({
    instanceId: p.instanceId,
    cardId: state.boss.hand.find((c) => c.instanceId === p.instanceId)?.cardId ?? "",
    locationId: p.locationId,
    owner: "boss" as Side,
    orderIndex: i,
  }));
}

/**
 * Enumerate legal play sets. To keep this tractable we consider: every single
 * card to every legal location, plus a greedy multi-card "spend it all" set.
 */
export function generateLegalBossPlays(state: SnapMatchState, energy: number): Candidate[] {
  const hand = state.boss.hand;
  const locs = state.locations.filter((l) => locationAllowsPlacement(l, state.turn));
  const out: Candidate[] = [{ plays: [], energyUsed: 0, score: 0 }]; // pass option

  // Single-card placements.
  for (const card of hand) {
    for (const loc of locs) {
      const cost = bossCost(card, loc);
      if (cost <= energy && openSlots(loc, "boss") > 0) {
        out.push({ plays: [{ instanceId: card.instanceId, locationId: loc.id }], energyUsed: cost, score: 0 });
      }
    }
  }

  // Greedy multi-card sets: sort hand by cost desc, then asc, fill legal locs.
  for (const order of [
    [...hand].sort((a, b) => b.cost - a.cost),
    [...hand].sort((a, b) => a.cost - b.cost),
  ]) {
    const set = greedyFill(state, order, locs, energy);
    if (set.plays.length > 1) out.push(set);
  }

  return out;
}

function greedyFill(
  state: SnapMatchState,
  order: SnapCard[],
  locs: SnapLocation[],
  energy: number,
): Candidate {
  const used = new Map<string, number>(); // locId -> placed count this plan
  const plays: PlannedPlay[] = [];
  let spent = 0;
  for (const card of order) {
    let best: SnapLocation | null = null;
    for (const loc of locs) {
      const placed = used.get(loc.id) ?? 0;
      if (openSlots(loc, "boss") - placed <= 0) continue;
      const cost = bossCost(card, loc);
      if (spent + cost > energy) continue;
      // Prefer locations the boss is losing or contested.
      if (!best || locationLeader(loc) !== "boss") best = loc;
    }
    if (best) {
      const cost = bossCost(card, best);
      plays.push({ instanceId: card.instanceId, locationId: best.id });
      used.set(best.id, (used.get(best.id) ?? 0) + 1);
      spent += cost;
    }
  }
  void state;
  return { plays, energyUsed: spent, score: 0 };
}

export function scoreBossPlay(
  state: SnapMatchState,
  cand: Candidate,
  w: PersonalityWeights,
  preferred: string[],
): number {
  let score = 0;
  // Reward energy spend (greed varies by personality).
  score += cand.energyUsed * w.energyGreed;

  for (const play of cand.plays) {
    const card = state.boss.hand.find((c) => c.instanceId === play.instanceId);
    const loc = findLocation(state, play.locationId);
    if (!card || !loc) continue;

    // Raw power contribution.
    score += card.basePower * 0.5;

    // Contest / reinforce based on current margin.
    const leader = locationLeader(loc);
    const margin = Math.abs(loc.playerPower - loc.bossPower);
    if (leader === "player" && margin <= 4) score += w.contest * (5 - margin);
    if (leader === "boss" && margin <= 3) score += w.reinforce * (4 - margin);
    if (leader === "tie") score += w.contest * 2;

    // Ability cards have intrinsic value.
    if (card.abilityType !== "none") score += w.ability * 1.5;

    // Preferred locations nudge.
    if (preferred.includes(loc.id)) score += 1.5;

    // Spread bonus: playing into a location with no boss cards yet.
    if (loc.bossCards.length === 0) score += w.spread;

    // Don't over-commit to a single already-won location.
    if (leader === "boss" && margin > 6) score -= 2;
  }

  // Greedy: prefer not wasting late high-cost cards early (turn-aware).
  if (state.turn < 4) {
    for (const play of cand.plays) {
      const card = state.boss.hand.find((c) => c.instanceId === play.instanceId);
      if (card && card.cost >= 5) score -= (4 - state.turn) * 0.6;
    }
  }
  return score;
}

export function applyBossPersonality(): void {
  // Personality is applied inline via PERSONALITY weights; kept for API parity.
}

function bossCost(card: SnapCard, loc: SnapLocation): number {
  return Math.max(0, card.cost + locationExtraCost(loc));
}
