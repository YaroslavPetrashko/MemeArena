// SNAP location effect resolution. Isomorphic & pure.
//
// Locations contribute three kinds of effect:
//  1. Ongoing power modifiers (recomputed every recompute pass).
//  2. Placement rules (cost/slot changes) — read by the engine when staging.
//  3. Turn-based & end-game triggers (run at specific points).
// Keep in sync with the server mirror.

import type { SnapCard, SnapLocation, SnapMatchState } from "../../../types/snap";
import type { Rng } from "./prng";
import {
  sideCards,
  setSideCards,
  isReductionImmune,
  isDestroyLocked,
  logEvent,
  type Side,
} from "./helpers";
import { makeToken, moveCardToRandomLocation } from "./engineOps";

/**
 * Ongoing location power modifier applied to a single card during a recompute
 * pass. Returns a flat delta (may be negative). Reduction is suppressed for
 * cards that are reduction-immune.
 */
export function locationPowerModifier(
  loc: SnapLocation,
  card: SnapCard,
): number {
  let delta = 0;
  switch (loc.effectId) {
    case "pumpPlaza":
      delta += 1;
      break;
    case "bearMarketLoc":
      if (card.basePower >= 5) delta -= 2;
      break;
    case "bullRunLoc":
      if (card.basePower <= 3) delta += 2;
      break;
    case "hypeChamber": {
      // +1 to the side that is currently winning here.
      const side: Side = card.owner;
      const myPower = side === "player" ? loc.playerPower : loc.bossPower;
      const theirPower = side === "player" ? loc.bossPower : loc.playerPower;
      if (myPower > theirPower) delta += 1;
      break;
    }
    default:
      break;
  }
  if (delta < 0 && isReductionImmune(card, loc)) return 0;
  return delta;
}

/** Extra cost to play at this location (Gas War). */
export function locationExtraCost(loc: SnapLocation): number {
  return loc.effectId === "gasWar" ? 1 : 0;
}

/** Can a side still place a card here this turn? */
export function locationAllowsPlacement(
  loc: SnapLocation,
  turn: number,
): boolean {
  if (!loc.isRevealed) return false;
  if (loc.effectId === "trenches" && turn > 4) return false;
  return true;
}

/** Whale Wall etc. collapse max slots — applied when the location reveals. */
export function resolveLocationReveal(state: SnapMatchState, loc: SnapLocation): void {
  loc.isRevealed = true;
  if (loc.effectId === "whaleWall") loc.maxSlotsPerSide = 1;
  logEvent(state, "location_reveal", `${loc.name} revealed — ${loc.effectText}`, {
    locationId: loc.id,
  });
}

/**
 * End-of-turn location triggers (Rug Zone destroy, Liquidity Pool buff, Bot
 * Farm fill, Jeet Street move). Runs AFTER reveal/abilities each turn.
 */
export function resolveTurnBasedLocationEffects(
  state: SnapMatchState,
  turn: number,
  rng: Rng,
): void {
  for (const loc of state.locations) {
    if (!loc.isRevealed) continue;
    switch (loc.effectId) {
      case "rugZone": {
        if (turn === 4) destroyLowestCardHere(state, loc, rng);
        break;
      }
      case "liquidityPool": {
        const all = [...loc.playerCards, ...loc.bossCards];
        if (all.length) {
          const target = all[Math.floor(rng.next() * all.length)];
          target.modifiers.push({ source: `loc:${loc.id}`, amount: 1, kind: "permanent" });
          logEvent(state, "location_effect", `${loc.name} pumped ${target.name} +1 Power.`, {
            locationId: loc.id,
          });
        }
        break;
      }
      case "botFarm": {
        if (turn === 3) {
          for (const side of ["player", "boss"] as const) {
            const cards = sideCards(loc, side);
            while (cards.length < loc.maxSlotsPerSide) {
              cards.push(makeToken("bot_token", side, state, rng));
            }
            setSideCards(loc, side, cards);
          }
          logEvent(state, "location_effect", `${loc.name} filled both sides with Bots.`, {
            locationId: loc.id,
          });
        }
        break;
      }
      case "jeetStreet": {
        if (turn === 5) {
          const all = [...loc.playerCards, ...loc.bossCards];
          if (all.length) {
            const strongest = all.reduce((a, b) => (b.currentPower > a.currentPower ? b : a));
            moveCardToRandomLocation(state, strongest, loc, rng);
            logEvent(state, "location_effect", `${loc.name} jeeted ${strongest.name} elsewhere.`, {
              locationId: loc.id,
            });
          }
        }
        break;
      }
      default:
        break;
    }
  }
}

/** Final Candle / per-card end-game location effects are handled at scoring. */
export function resolveEndGameLocationEffects(state: SnapMatchState): void {
  // Currently no location-specific end-game math beyond ongoing modifiers,
  // which the final recompute already applies. Hook kept for symmetry.
  void state;
}

function destroyLowestCardHere(
  state: SnapMatchState,
  loc: SnapLocation,
  rng: Rng,
): void {
  if (isDestroyLocked(loc)) return;
  const all = [
    ...loc.playerCards.map((c) => ({ c, side: "player" as const })),
    ...loc.bossCards.map((c) => ({ c, side: "boss" as const })),
  ].filter(({ c }) => c.isRevealed);
  if (!all.length) return;
  // Lowest currentPower; deterministic tiebreak by a seeded roll over index.
  let lowest = all[0];
  for (const item of all) {
    if (item.c.currentPower < lowest.c.currentPower) lowest = item;
    else if (item.c.currentPower === lowest.c.currentPower && rng.next() < 0.5) lowest = item;
  }
  const cards = sideCards(loc, lowest.side).filter((c) => c.instanceId !== lowest.c.instanceId);
  setSideCards(loc, lowest.side, cards);
  logEvent(state, "location_effect", `${loc.name} destroyed ${lowest.c.name}.`, {
    locationId: loc.id,
  });
}

/** True if Final Candle should buff cards played here on turn 6. */
export function finalCandleBonus(loc: SnapLocation, turn: number): number {
  return loc.effectId === "finalCandle" && turn === 6 ? 3 : 0;
}
