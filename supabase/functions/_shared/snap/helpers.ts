// MIRROR of the SNAP engine — keep in sync with src/lib/game/snap/helpers.ts
// Pure board-query and mutation helpers shared across the SNAP engine.
// Isomorphic: no @/ alias, no Math.random, no Date. Mirrored to the server.

import type {
  SnapCard,
  SnapLocation,
  SnapMatchState,
  SnapEventLogEntry,
  SnapEventType,
} from "./types.ts";

export type Side = "player" | "boss";

export function otherSide(side: Side): Side {
  return side === "player" ? "boss" : "player";
}

export function sideCards(loc: SnapLocation, side: Side): SnapCard[] {
  return side === "player" ? loc.playerCards : loc.bossCards;
}

export function setSideCards(loc: SnapLocation, side: Side, cards: SnapCard[]): void {
  if (side === "player") loc.playerCards = cards;
  else loc.bossCards = cards;
}

export function findLocation(state: SnapMatchState, locationId: string): SnapLocation | undefined {
  return state.locations.find((l) => l.id === locationId);
}

/** Locate a card instance anywhere on the board. */
export function findCardOnBoard(
  state: SnapMatchState,
  instanceId: string,
): { card: SnapCard; loc: SnapLocation; side: Side } | undefined {
  for (const loc of state.locations) {
    for (const side of ["player", "boss"] as const) {
      const card = sideCards(loc, side).find((c) => c.instanceId === instanceId);
      if (card) return { card, loc, side };
    }
  }
  return undefined;
}

/** Free slots remaining for a side at a location (respects effective max). */
export function openSlots(loc: SnapLocation, side: Side): number {
  return Math.max(0, loc.maxSlotsPerSide - sideCards(loc, side).length);
}

/** Add a flat permanent modifier (baked in, not recomputed). */
export function addPermanentModifier(card: SnapCard, source: string, amount: number): void {
  card.modifiers.push({ source, amount, kind: "permanent" });
}

/** True if a card is protected from power reduction (Moo Deng / location). */
export function isReductionImmune(card: SnapCard, loc: SnapLocation): boolean {
  if (card.abilityId === "ongoingCannotReducePower" && card.isRevealed) return true;
  void loc;
  return false;
}

/** True if a card can't be moved (Diamond Hands card/location). */
export function isMoveLocked(card: SnapCard, loc: SnapLocation, side: Side): boolean {
  if (loc.effectId === "diamondHands") return true;
  // A revealed friendly Diamond Hands card on this side locks moves.
  return sideCards(loc, side).some(
    (c) => c.abilityId === "ongoingPreventMoveHere" && c.isRevealed,
  );
}

/** True if a card can't be destroyed (Diamond Hands location). */
export function isDestroyLocked(loc: SnapLocation): boolean {
  return loc.effectId === "diamondHands";
}

let _logCounter = 0;
/** Deterministic id: counter is reset at match creation. */
export function resetLogCounter(): void {
  _logCounter = 0;
}

export function logEvent(
  state: SnapMatchState,
  type: SnapEventType,
  message: string,
  payload?: Record<string, unknown>,
): void {
  const entry: SnapEventLogEntry = {
    id: `e${_logCounter++}`,
    turn: state.turn,
    type,
    message,
    payload,
  };
  state.eventLog.push(entry);
}

/** Sum effective power for a side at a location. */
export function recalcLocationPower(loc: SnapLocation): void {
  loc.playerPower = loc.playerCards.reduce((s, c) => s + Math.max(0, c.currentPower), 0);
  loc.bossPower = loc.bossCards.reduce((s, c) => s + Math.max(0, c.currentPower), 0);
}

/** Winning side at a location right now ("tie" if equal). */
export function locationLeader(loc: SnapLocation): Side | "tie" {
  if (loc.playerPower > loc.bossPower) return "player";
  if (loc.bossPower > loc.playerPower) return "boss";
  return "tie";
}

export function totalBoardPower(state: SnapMatchState, side: Side): number {
  return state.locations.reduce(
    (s, loc) => s + (side === "player" ? loc.playerPower : loc.bossPower),
    0,
  );
}

export function locationsLeadCount(state: SnapMatchState, side: Side): number {
  return state.locations.filter((loc) => loc.isRevealed && locationLeader(loc) === side).length;
}
