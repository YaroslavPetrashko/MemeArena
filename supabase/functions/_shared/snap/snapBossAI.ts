// MIRROR of the SNAP engine — keep in sync with src/lib/game/snap/snapBossAI.ts
// SNAP boss AI. Pure & deterministic (all randomness via seeded Rng).
//
// The bot plays to WIN THE MATCH (take 2 of 3 lanes), not just to pile power.
// Each turn it enumerates legal plays, evaluates the resulting board with a
// lane-control heuristic (contest the decisive lane, don't overkill a won lane,
// hold finishers for later, close hard on the last turn), and then picks a play
// with a strength that scales with `botSkill` (state.flags.botSkill).

import type {
  SnapMatchState,
  SnapStagedPlay,
  SnapCard,
  SnapLocation,
  BossPersonality,
} from "./types.ts";
import { type Rng, pickWeighted } from "./prng.ts";
import { getSnapBoss } from "./data_snapBosses.ts";
import {
  openSlots,
  locationLeader,
  type Side,
} from "./helpers.ts";
import { locationExtraCost, locationAllowsPlacement } from "./snapLocations.ts";

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
  energyGreed: number;
  contest: number;
  reinforce: number;
  spread: number;
  ability: number;
  randomness: number;
}

const PERSONALITY: Record<BossPersonality, PersonalityWeights> = {
  aggressive: { energyGreed: 1.4, contest: 1.3, reinforce: 1.2, spread: 0.6, ability: 0.6, randomness: 0.5 },
  disruptive: { energyGreed: 1.0, contest: 1.4, reinforce: 0.8, spread: 0.8, ability: 1.6, randomness: 0.7 },
  greedy: { energyGreed: 0.8, contest: 1.0, reinforce: 1.1, spread: 0.7, ability: 0.9, randomness: 0.6 },
  wide: { energyGreed: 1.2, contest: 1.1, reinforce: 0.7, spread: 1.6, ability: 0.8, randomness: 0.7 },
  stacker: { energyGreed: 1.1, contest: 0.9, reinforce: 1.6, spread: 0.4, ability: 1.0, randomness: 0.5 },
  chaotic: { energyGreed: 1.0, contest: 1.0, reinforce: 1.0, spread: 1.0, ability: 1.0, randomness: 1.4 },
};

export function computeBotSkill(opts: {
  difficultyValue: number;
  rankTierIndex: number;
  winStreak: number;
}): number {
  let skill = 0.4 + (opts.difficultyValue - 1) * 0.09;
  skill += Math.min(0.1, Math.max(0, opts.rankTierIndex) * 0.013);
  skill += Math.min(0.12, Math.max(0, opts.winStreak) * 0.03);
  return clamp(0.3, 0.95, skill);
}

export function defaultBotSkill(difficultyValue: number): number {
  return clamp(0.3, 0.95, 0.4 + (difficultyValue - 1) * 0.09);
}

export function generateBossTurn(state: SnapMatchState, rng: Rng): SnapStagedPlay[] {
  const boss = getSnapBoss(state.bossId)!;
  const weights = PERSONALITY[boss.personality];
  const skill = clamp(0.3, 0.95, (state.flags["botSkill"] as number) ?? 0.6);

  const candidates = generateLegalBossPlays(state, state.boss.energy);
  const playable = candidates.filter((c) => c.plays.length > 0);
  if (!playable.length) return [];

  for (const cand of candidates) {
    cand.score = scoreBossPlay(state, cand, weights, boss.preferredLocations);
  }

  // Blunder: a weaker bot sometimes makes a SUB-OPTIMAL SINGLE play — never a
  // whole-hand dump (that's what felt like "spam").
  if (rng.chance((1 - skill) * 0.3)) {
    const singles = playable.filter((c) => c.plays.length === 1);
    const pool = singles.length ? singles : playable;
    const blunder = pool[Math.floor(rng.next() * pool.length)];
    return materialize(state, blunder);
  }

  candidates.sort((a, b) => b.score - a.score);
  const topK = skill > 0.8 ? 1 : skill > 0.55 ? 2 : 3;
  const top = candidates.slice(0, Math.max(1, topK));
  const temp = weights.randomness * (1 - skill);
  const chosen = pickWeighted(top, (c) => Math.max(0.01, c.score + 10) * (1 + temp * rng.next()), rng);

  return materialize(state, chosen);
}

function materialize(state: SnapMatchState, cand: Candidate): SnapStagedPlay[] {
  return cand.plays.map((p, i) => ({
    instanceId: p.instanceId,
    cardId: state.boss.hand.find((c) => c.instanceId === p.instanceId)?.cardId ?? "",
    locationId: p.locationId,
    owner: "boss" as Side,
    orderIndex: i,
  }));
}

export function generateLegalBossPlays(state: SnapMatchState, energy: number): Candidate[] {
  const hand = state.boss.hand;
  const locs = state.locations.filter((l) => locationAllowsPlacement(l, state.turn));
  const out: Candidate[] = [{ plays: [], energyUsed: 0, score: 0 }];

  for (const card of hand) {
    for (const loc of locs) {
      const cost = bossCost(card, loc);
      if (cost <= energy && openSlots(loc, "boss") > 0) {
        out.push({ plays: [{ instanceId: card.instanceId, locationId: loc.id }], energyUsed: cost, score: 0 });
      }
    }
  }

  const byCostDesc = [...hand].sort((a, b) => b.cost - a.cost);
  const byCostAsc = [...hand].sort((a, b) => a.cost - b.cost);
  for (const set of [
    greedyFill(byCostDesc, locs, energy, "contest"),
    greedyFill(byCostAsc, locs, energy, "contest"),
    greedyFill(byCostAsc, locs, energy, "spread"),
  ]) {
    if (set.plays.length > 1) out.push(set);
  }

  return out;
}

function greedyFill(
  order: SnapCard[],
  locs: SnapLocation[],
  energy: number,
  mode: "contest" | "spread",
): Candidate {
  const used = new Map<string, number>();
  const plays: PlannedPlay[] = [];
  let spent = 0;
  for (const card of order) {
    let best: SnapLocation | null = null;
    let bestKey = -Infinity;
    for (const loc of locs) {
      const placed = used.get(loc.id) ?? 0;
      if (openSlots(loc, "boss") - placed <= 0) continue;
      const cost = bossCost(card, loc);
      if (spent + cost > energy) continue;
      const margin = loc.bossPower - loc.playerPower;
      const key =
        mode === "spread"
          ? -(loc.bossCards.length + placed) * 2 - Math.max(0, margin)
          : (locationLeader(loc) === "boss" ? -margin : 6 - margin);
      if (key > bestKey) {
        bestKey = key;
        best = loc;
      }
    }
    if (best) {
      const cost = bossCost(card, best);
      plays.push({ instanceId: card.instanceId, locationId: best.id });
      used.set(best.id, (used.get(best.id) ?? 0) + 1);
      spent += cost;
    }
  }
  return { plays, energyUsed: spent, score: 0 };
}

export function scoreBossPlay(
  state: SnapMatchState,
  cand: Candidate,
  w: PersonalityWeights,
  preferred: string[],
): number {
  const lastTurn = state.turn >= state.maxTurns;

  const addByLoc = new Map<string, number>();
  let abilityCount = 0;
  for (const play of cand.plays) {
    const card = state.boss.hand.find((c) => c.instanceId === play.instanceId);
    if (!card) continue;
    const nudge = card.abilityType !== "none" ? 1 : 0;
    if (card.abilityType !== "none") abilityCount++;
    addByLoc.set(play.locationId, (addByLoc.get(play.locationId) ?? 0) + card.basePower + nudge);
  }

  // Mild energy-efficiency reward, then a penalty PER EXTRA card so the bot plays
  // a measured 1-2 cards (Marvel-SNAP-like) rather than dumping its hand.
  let score = cand.energyUsed * w.energyGreed * 0.15;
  score -= Math.max(0, cand.plays.length - 1) * 2.5;
  let projWon = 0;
  let curWon = 0;

  for (const loc of state.locations) {
    const curMargin = loc.bossPower - loc.playerPower;
    const added = addByLoc.get(loc.id) ?? 0;
    const projMargin = curMargin + added;
    if (curMargin > 0) curWon++;
    if (projMargin > 0) projWon++;

    if (added === 0) continue;

    const gained = laneUtility(projMargin) - laneUtility(curMargin);
    const leadBefore = locationLeader(loc);
    let laneW = 1;
    if (leadBefore !== "boss") laneW *= w.contest;
    else laneW *= w.reinforce;
    if (loc.bossCards.length === 0) laneW *= 1 + w.spread * 0.15;
    if (preferred.includes(loc.id)) laneW *= 1.25;
    score += gained * laneW;
  }

  if (projWon >= 2 && curWon < 2) score += (lastTurn ? 14 : 8) * (1 + w.reinforce * 0.15);
  else if (projWon >= 2) score += 3;
  score += projWon * 1.0;

  score += abilityCount * w.ability * 1.2;

  if (!lastTurn && state.turn < 4) {
    for (const play of cand.plays) {
      const card = state.boss.hand.find((c) => c.instanceId === play.instanceId);
      if (card && card.cost >= 5) score -= (4 - state.turn) * 0.7;
    }
  }

  return score;
}

function laneUtility(margin: number): number {
  if (margin >= 0) return Math.min(margin, 5) + Math.max(0, margin - 5) * 0.12;
  return margin;
}

export function applyBossPersonality(): void {
  // Personality is applied inline via PERSONALITY weights; kept for API parity.
}

function bossCost(card: SnapCard, loc: SnapLocation): number {
  return Math.max(0, card.cost + locationExtraCost(loc));
}

function clamp(lo: number, hi: number, v: number): number {
  return Math.max(lo, Math.min(hi, v));
}
