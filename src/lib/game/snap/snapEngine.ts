// SNAP deterministic match engine. Isomorphic & pure — same code runs on the
// client (for rendering) and in the Supabase Edge Function (authoritative
// replay). No @/ alias, no Math.random, no Date.
//
// Flow per turn:
//   startTurn -> player stages cards -> endPlayerTurn -> generateBossTurn ->
//   revealStagedCards (deterministic order, abilities) -> recompute ongoing ->
//   turn-based location effects -> recompute -> advance.
// Turn 6 additionally runs end-game effects and final scoring.

import type {
  SnapMatchState,
  SnapLocation,
  SnapCard,
  SnapStagedPlay,
  SnapAction,
  PlayerSnapState,
  BossSnapState,
  SnapModeId,
} from "../../../types/snap";
import { createRng, shuffle, seededTieBreak, type Rng } from "./prng";
import { SNAP_LOCATIONS } from "../../../data/snapLocations";
import { getSnapBoss, bossDifficultyValue } from "../../../data/snapBosses";
import {
  instantiateCard,
  resetInstanceCounter,
} from "./engineOps";
import {
  resetLogCounter,
  logEvent,
  findLocation,
  sideCards,
  setSideCards,
  openSlots,
  recalcLocationPower,
  totalBoardPower,
  locationsLeadCount,
  type Side,
} from "./helpers";
import {
  resolveLocationReveal,
  resolveTurnBasedLocationEffects,
  resolveEndGameLocationEffects,
  locationPowerModifier,
  locationExtraCost,
  locationAllowsPlacement,
  finalCandleBonus,
} from "./snapLocations";
import {
  resolveOnReveal,
  resolveConditionalOnReveal,
  ongoingPowerContribution,
  resolveEndGameEffects,
} from "./snapAbilities";
import { generateBossTurn } from "./snapBossAI";
import { applyBossPassivePreReveal, applyBossPassivePostReveal } from "./bossPassives";
import { calculateSnapScore } from "./snapScoring";

const MAX_TURNS = 6;
const STARTING_HAND = 3;

export interface CreateMatchOpts {
  matchId: string;
  mode: SnapModeId;
  bossId: string;
  seed: string;
  /** Player deck as {cardId, level} — order is shuffled by seed. */
  deck: { cardId: string; level: number }[];
  profileId: string;
}

/* ----------------------------- Creation ----------------------------- */

export function createSnapMatch(opts: CreateMatchOpts): SnapMatchState {
  resetInstanceCounter(0);
  resetLogCounter();
  const rng = createRng(opts.seed + ":setup");

  const boss = getSnapBoss(opts.bossId);
  if (!boss) throw new Error(`unknown boss ${opts.bossId}`);

  // Deterministic location selection (3 of 15).
  const chosen = shuffle(SNAP_LOCATIONS, rng).slice(0, 3);
  const locations: SnapLocation[] = chosen.map((def, idx) => ({
    id: def.id,
    defId: def.id,
    name: def.name,
    effectText: def.effectText,
    effectId: def.effectId,
    revealTurn: idx + 1,
    isRevealed: idx === 0, // location 1 visible from turn 1
    maxSlotsPerSide: def.maxSlotsPerSide,
    theme: def.theme,
    playerCards: [],
    bossCards: [],
    playerPower: 0,
    bossPower: 0,
  }));

  // Player deck: instantiate + deterministic shuffle.
  const playerDeck = shuffle(
    opts.deck.map((d) => instantiateCard(d.cardId, "player", d.level)),
    createRng(opts.seed + ":pdeck"),
  );
  const bossDeck = shuffle(
    boss.deck.map((id) => instantiateCard(id, "boss", 1)),
    createRng(opts.seed + ":bdeck"),
  );

  const player: PlayerSnapState = {
    profileId: opts.profileId,
    deck: playerDeck,
    hand: [],
    energy: 1,
    hasEndedTurn: false,
    pendingEnergy: 0,
    nextCardBonus: 0,
  };
  const bossState: BossSnapState = {
    bossId: boss.id,
    deck: bossDeck,
    hand: [],
    personality: boss.personality,
    energy: 1,
    pendingEnergy: 0,
  };

  const state: SnapMatchState = {
    matchId: opts.matchId,
    mode: opts.mode,
    bossId: boss.id,
    turn: 0,
    maxTurns: MAX_TURNS,
    energy: 1,
    player,
    boss: bossState,
    locations,
    stagedPlays: [],
    seed: opts.seed,
    initialDeck: opts.deck.map((d) => ({ cardId: d.cardId, level: d.level })),
    status: "staging",
    scoring: null,
    eventLog: [],
    actionLog: [],
    flags: {},
  };

  // Opening draw of 3, then boss passive setup, then begin turn 1.
  for (let i = 0; i < STARTING_HAND; i++) drawCard(state, "player");
  for (let i = 0; i < STARTING_HAND; i++) drawCard(state, "boss");
  applyBossPassivePreReveal(state, rng, "setup");
  startTurn(state);
  return state;
}

/* ----------------------------- Turn flow ---------------------------- */

export function startTurn(state: SnapMatchState): void {
  state.turn += 1;
  state.status = "staging";
  state.stagedPlays = [];
  state.player.hasEndedTurn = false;

  // Reveal scheduled location.
  for (const loc of state.locations) {
    if (!loc.isRevealed && loc.revealTurn <= state.turn) {
      resolveLocationReveal(state, loc);
    }
  }

  // Energy = turn number + queued pending energy.
  state.player.energy = state.turn + state.player.pendingEnergy;
  state.player.pendingEnergy = 0;
  state.boss.energy = state.turn + state.boss.pendingEnergy;
  state.boss.pendingEnergy = 0;
  // Per-turn boss passives (e.g. turn-6 bonus energy) before staging.
  applyBossPassivePreReveal(state, createRng(`${state.seed}:turnstart${state.turn}`), "turn");
  state.energy = state.player.energy;

  // Draw one each (turn 1 already drew opening hand; still draw the turn card).
  drawCard(state, "player");
  drawCard(state, "boss");

  logEvent(state, "turn_start", `Turn ${state.turn} — ${state.player.energy} Meme Energy.`);
  recomputeOngoingPower(state);
}

export function drawCard(state: SnapMatchState, side: Side): SnapCard | null {
  const who = side === "player" ? state.player : state.boss;
  if (who.deck.length === 0 || who.hand.length >= 7) return null;
  const card = who.deck.shift()!;
  who.hand.push(card);
  return card;
}

/* --------------------------- Player staging ------------------------- */

export function canPlayCard(
  state: SnapMatchState,
  instanceId: string,
  locationId: string,
): { ok: boolean; reason?: string } {
  const card = state.player.hand.find((c) => c.instanceId === instanceId);
  if (!card) return { ok: false, reason: "not_in_hand" };
  const loc = findLocation(state, locationId);
  if (!loc) return { ok: false, reason: "no_location" };
  if (!locationAllowsPlacement(loc, state.turn)) return { ok: false, reason: "locked" };
  if (openSlots(loc, "player") <= 0) return { ok: false, reason: "full" };
  const cost = effectiveCost(card, loc);
  if (cost > remainingEnergy(state)) return { ok: false, reason: "energy" };
  return { ok: true };
}

/** Energy already committed by staged plays this turn. */
export function stagedEnergy(state: SnapMatchState): number {
  return state.stagedPlays.reduce((sum, sp) => {
    const card = state.player.hand.find((c) => c.instanceId === sp.instanceId);
    const loc = findLocation(state, sp.locationId);
    if (!card || !loc) return sum;
    return sum + effectiveCost(card, loc);
  }, 0);
}

export function remainingEnergy(state: SnapMatchState): number {
  return state.player.energy - stagedEnergy(state);
}

export function effectiveCost(card: SnapCard, loc: SnapLocation): number {
  return Math.max(0, card.cost + locationExtraCost(loc));
}

/** Stage a player card into a location (face-down until reveal). */
export function stagePlayerCard(
  state: SnapMatchState,
  instanceId: string,
  locationId: string,
): { ok: boolean; reason?: string } {
  const check = canPlayCard(state, instanceId, locationId);
  if (!check.ok) return check;
  const orderIndex = state.stagedPlays.length;
  state.stagedPlays.push({
    instanceId,
    cardId: state.player.hand.find((c) => c.instanceId === instanceId)!.cardId,
    locationId,
    owner: "player",
    orderIndex,
  });
  return { ok: true };
}

export function unstagePlayerCard(state: SnapMatchState, instanceId: string): void {
  state.stagedPlays = state.stagedPlays
    .filter((sp) => sp.instanceId !== instanceId)
    .map((sp, i) => ({ ...sp, orderIndex: i }));
}

/* ----------------------------- End turn ----------------------------- */

/**
 * Resolve the turn: boss plans its plays, both sides reveal in deterministic
 * order, abilities + location effects fire, ongoing recomputed, turn advances.
 * Returns the (mutated) state for convenience.
 */
export function endPlayerTurn(state: SnapMatchState): SnapMatchState {
  if (state.status !== "staging") return state;
  state.player.hasEndedTurn = true;
  state.status = "revealing";
  const rng = createRng(`${state.seed}:turn${state.turn}`);

  // Capture the pre-reveal power differential on the final turn so scoring can
  // measure the final-turn swing the player creates.
  if (state.turn === state.maxTurns) {
    state.flags["preFinalDiff"] =
      totalBoardPower(state, "player") - totalBoardPower(state, "boss");
  }

  // Record player actions into the authoritative log.
  for (const sp of state.stagedPlays) {
    const action: SnapAction = {
      turn: state.turn,
      cardInstanceId: sp.instanceId,
      cardId: sp.cardId,
      locationId: sp.locationId,
      orderIndex: sp.orderIndex,
    };
    state.actionLog.push(action);
  }

  // Boss chooses (staged) plays for this turn.
  const bossPlays = generateBossTurn(state, rng);

  // Commit staged cards to the board (face-down).
  const playerStaged = commitStagedToBoard(state, state.stagedPlays, "player");
  const bossStaged = commitStagedToBoard(state, bossPlays, "boss");

  // Determine which side reveals first this turn.
  const firstSide = determineRevealPriority(state, rng);

  logEvent(state, "card_reveal", `Reveal — ${firstSide === "player" ? "you" : "boss"} go first.`);

  // Reveal each side's staged cards in order.
  if (firstSide === "player") {
    revealStagedCards(state, playerStaged, "player", rng);
    revealStagedCards(state, bossStaged, "boss", rng);
  } else {
    revealStagedCards(state, bossStaged, "boss", rng);
    revealStagedCards(state, playerStaged, "player", rng);
  }

  // Resolve queued draws from abilities (e.g. Degen Trader).
  resolvePendingDraws(state);

  recomputeOngoingPower(state);

  // Boss passives that fire after reveal (e.g. movePlayerCardAfterTurn4).
  applyBossPassivePostReveal(state, rng);

  // Turn-based location triggers, then per-turn ongoing (Pump Candle).
  resolveTurnBasedLocationEffects(state, state.turn, rng);
  resolveTurnEndOngoing(state);
  recomputeOngoingPower(state);

  state.stagedPlays = [];

  if (state.turn >= state.maxTurns) {
    finishMatch(state, rng);
  } else {
    startTurn(state);
  }
  return state;
}

interface StagedRef {
  card: SnapCard;
  loc: SnapLocation;
  orderIndex: number;
}

/** Move staged plays onto the board face-down; return refs in play order. */
function commitStagedToBoard(
  state: SnapMatchState,
  plays: SnapStagedPlay[],
  side: Side,
): StagedRef[] {
  const refs: StagedRef[] = [];
  const who = side === "player" ? state.player : state.boss;
  for (const sp of plays) {
    const idx = who.hand.findIndex((c) => c.instanceId === sp.instanceId);
    if (idx < 0) continue;
    const card = who.hand.splice(idx, 1)[0];
    const loc = findLocation(state, sp.locationId);
    if (!loc) continue;
    if (openSlots(loc, side) <= 0) {
      who.hand.push(card); // bounce back if somehow full
      continue;
    }
    card.locationId = loc.id;
    card.isRevealed = false;
    const cards = sideCards(loc, side);
    cards.push(card);
    setSideCards(loc, side, cards);
    refs.push({ card, loc, orderIndex: sp.orderIndex });
  }
  return refs.sort((a, b) => a.orderIndex - b.orderIndex);
}

/** Flip a side's cards face-up in order and fire their On Reveal abilities. */
export function revealStagedCards(
  state: SnapMatchState,
  refs: StagedRef[],
  side: Side,
  rng: Rng,
): void {
  for (const ref of refs) {
    const { card, loc } = ref;
    card.isRevealed = true;

    // Apply pending "next card" buff (Wojak) to the player's first played card.
    if (side === "player" && state.player.nextCardBonus > 0) {
      card.modifiers.push({ source: "wojak", amount: state.player.nextCardBonus, kind: "permanent" });
      state.player.nextCardBonus = 0;
    }
    // Final Candle turn-6 bonus.
    const fc = finalCandleBonus(loc, state.turn);
    if (fc > 0) card.modifiers.push({ source: `loc:${loc.id}`, amount: fc, kind: "permanent" });

    logEvent(state, "card_reveal", `${side === "player" ? "You" : "Boss"} revealed ${card.name}.`, {
      instanceId: card.instanceId,
      locationId: loc.id,
    });

    // Conditional-at-reveal (Trenches Rat), then On Reveal abilities.
    resolveConditionalOnReveal({ state, card, loc, side, rng });
    resolveOnReveal({ state, card, loc, side, rng });
    recomputeOngoingPower(state);
  }
}

/* --------------------------- Reveal priority ------------------------ */

/**
 * MVP priority: more locations led reveals first → higher total power → seeded
 * tie-break. Turn 1 uses pure seeded tie-break. Market Maker passive overrides
 * on turn 6 (handled via boss passive flag).
 */
export function determineRevealPriority(state: SnapMatchState, rng: Rng): Side {
  // Market Maker: boss reveals last on turn 6 → player first.
  if (state.turn === 6 && state.flags["bossRevealsLastTurn6"]) return "player";

  if (state.turn === 1) {
    return seededTieBreak(state.seed, "reveal1") < 0.5 ? "player" : "boss";
  }
  const pLead = locationsLeadCount(state, "player");
  const bLead = locationsLeadCount(state, "boss");
  if (pLead !== bLead) return pLead > bLead ? "player" : "boss";
  const pPow = totalBoardPower(state, "player");
  const bPow = totalBoardPower(state, "boss");
  if (pPow !== bPow) return pPow > bPow ? "player" : "boss";
  void rng;
  return seededTieBreak(state.seed, `reveal${state.turn}`) < 0.5 ? "player" : "boss";
}

/* --------------------------- Recompute power ------------------------ */

/**
 * Recompute currentPower for every card on the board: start from basePower,
 * add permanent modifiers, then apply ongoing (card + location) contributions.
 * Pure and idempotent — safe to call repeatedly.
 */
export function recomputeOngoingPower(state: SnapMatchState): void {
  // Pass 1: base + permanent modifiers, and refresh location power totals so
  // location-conditional ongoing (Hype Chamber, Dogwifhat) read correct state.
  for (const loc of state.locations) {
    for (const side of ["player", "boss"] as const) {
      for (const card of sideCards(loc, side)) {
        const perm = card.modifiers
          .filter((m) => m.kind === "permanent")
          .reduce((s, m) => s + m.amount, 0);
        card.currentPower = card.basePower + perm;
      }
    }
    recalcLocationPower(loc);
  }

  // Pass 2: ongoing card buffs + location modifiers + conditionals.
  for (const loc of state.locations) {
    for (const side of ["player", "boss"] as const) {
      for (const target of sideCards(loc, side)) {
        let delta = 0;
        // Ongoing card sources on this location (both sides as sources).
        for (const srcSide of ["player", "boss"] as const) {
          for (const source of sideCards(loc, srcSide)) {
            delta += ongoingPowerContribution(source, target, loc, side);
          }
        }
        // Location ongoing modifier.
        delta += locationPowerModifier(loc, target);
        // Conditional ongoing: Dogwifhat (winning here), GigaChad (alone).
        delta += conditionalOngoing(target, loc, side);
        target.currentPower = Math.max(0, target.currentPower + delta);
      }
    }
    recalcLocationPower(loc);
  }
}

/** Conditional abilities that behave as ongoing modifiers (recomputed). */
function conditionalOngoing(card: SnapCard, loc: SnapLocation, side: Side): number {
  if (!card.isRevealed) return 0;
  if (card.abilityId === "winningHereBonus") {
    const myPow = side === "player" ? loc.playerPower : loc.bossPower;
    const theirPow = side === "player" ? loc.bossPower : loc.playerPower;
    if (myPow > theirPow) return 2 + card.abilityBonus;
  }
  if (card.abilityId === "aloneHereBonus") {
    const mine = sideCards(loc, side);
    if (mine.length === 1) return 4 + card.abilityBonus;
  }
  return 0;
}

/* --------------------------- Turn-end ongoing ----------------------- */

/** Per-turn-end card growth (Pump Candle) + Jeet Dragon decay at turn 5. */
function resolveTurnEndOngoing(state: SnapMatchState): void {
  for (const loc of state.locations) {
    for (const side of ["player", "boss"] as const) {
      for (const card of sideCards(loc, side)) {
        if (!card.isRevealed) continue;
        if (card.abilityId === "gainPerTurn") {
          const amt = 1 + card.abilityBonus;
          card.modifiers.push({ source: `growth:${card.instanceId}:t${state.turn}`, amount: amt, kind: "permanent" });
        }
        if (card.abilityId === "losePowerAfterTurn5" && state.turn === 5) {
          const loss = 3 - card.abilityBonus;
          if (loss > 0) {
            card.modifiers.push({ source: `decay:${card.instanceId}`, amount: -loss, kind: "permanent" });
            logEvent(state, "ability", `${card.name} jeeted: -${loss} Power.`);
          }
        }
      }
    }
  }
}

/* --------------------------- Pending draws -------------------------- */

function resolvePendingDraws(state: SnapMatchState): void {
  for (const side of ["player", "boss"] as const) {
    const key = `pendingDraw:${side}`;
    const n = (state.flags[key] as number) ?? 0;
    for (let i = 0; i < n; i++) drawCard(state, side);
    delete state.flags[key];
  }
}

/* ----------------------------- Finish ------------------------------- */

function finishMatch(state: SnapMatchState, rng: Rng): void {
  resolveEndGameEffects(state, rng);
  resolveEndGameLocationEffects(state);
  recomputeOngoingPower(state);

  const boss = getSnapBoss(state.bossId)!;
  state.scoring = calculateSnapScore(state, bossDifficultyValue(boss));
  state.status = "complete";
  logEvent(state, "result", `Match ${state.scoring.result.toUpperCase()} — ${state.scoring.locationsWon}/${state.locations.length} locations.`);
}
