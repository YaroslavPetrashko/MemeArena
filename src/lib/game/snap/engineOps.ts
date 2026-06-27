// Low-level match mutations shared by abilities, locations, and the engine.
// Kept separate to avoid circular imports. Isomorphic & pure.

import type { SnapCard, SnapLocation, SnapMatchState } from "../../../types/snap";
import type { Rng } from "./prng";
import { getSnapCardDef, snapCardPowerAtLevel } from "../../../data/snapCards";
import { sideCards, setSideCards, isMoveLocked, openSlots, type Side } from "./helpers";

let _instanceCounter = 0;
export function resetInstanceCounter(start = 0): void {
  _instanceCounter = start;
}
export function nextInstanceId(prefix = "i"): string {
  return `${prefix}${_instanceCounter++}`;
}

/** Build a live SnapCard instance from a card def at a level. */
export function instantiateCard(
  cardId: string,
  owner: Side,
  level: number,
): SnapCard {
  const def = getSnapCardDef(cardId);
  if (!def) throw new Error(`unknown card ${cardId}`);
  const basePower = snapCardPowerAtLevel(def, level);
  let abilityBonus = 0;
  for (const lv of def.levels) if (lv.level <= level) abilityBonus += lv.abilityBonus ?? 0;
  return {
    instanceId: nextInstanceId(owner === "player" ? "p" : "b"),
    cardId: def.id,
    owner,
    name: def.name,
    cost: def.cost,
    basePower,
    currentPower: basePower,
    abilityText: def.abilityText,
    abilityType: def.abilityType,
    abilityId: def.abilityId,
    tags: def.tags,
    level,
    imagePath: def.imagePath,
    abilityBonus,
    locationId: null,
    isRevealed: false,
    modifiers: [],
    isToken: !!def.isToken,
  };
}

/** Spawn a 1-power token directly onto a location (already revealed). */
export function makeToken(
  tokenId: string,
  owner: Side,
  state: SnapMatchState,
  rng: Rng,
): SnapCard {
  void state;
  void rng;
  const card = instantiateCard(tokenId, owner, 1);
  card.isRevealed = true;
  return card;
}

/** Place a token at a location if there's space. Returns true if placed. */
export function spawnTokenAt(
  tokenId: string,
  owner: Side,
  loc: SnapLocation,
  state: SnapMatchState,
  rng: Rng,
): boolean {
  if (openSlots(loc, owner) <= 0) return false;
  const token = makeToken(tokenId, owner, state, rng);
  token.locationId = loc.id;
  const cards = sideCards(loc, owner);
  cards.push(token);
  setSideCards(loc, owner, cards);
  return true;
}

/**
 * Move a card to a random OTHER location that has an open slot for its side.
 * Respects move-lock (Diamond Hands). Returns the destination or null.
 */
export function moveCardToRandomLocation(
  state: SnapMatchState,
  card: SnapCard,
  fromLoc: SnapLocation,
  rng: Rng,
): SnapLocation | null {
  const side = card.owner;
  if (isMoveLocked(card, fromLoc, side)) return null;
  const candidates = state.locations.filter(
    (l) => l.id !== fromLoc.id && l.isRevealed && openSlots(l, side) > 0,
  );
  if (!candidates.length) return null;
  const dest = candidates[Math.floor(rng.next() * candidates.length)];
  // Remove from source.
  setSideCards(
    fromLoc,
    side,
    sideCards(fromLoc, side).filter((c) => c.instanceId !== card.instanceId),
  );
  // Add to dest.
  card.locationId = dest.id;
  const destCards = sideCards(dest, side);
  destCards.push(card);
  setSideCards(dest, side, destCards);
  return dest;
}

/** Remove a card from the board entirely (destroy). */
export function destroyCard(
  loc: SnapLocation,
  card: SnapCard,
  side: Side,
): void {
  setSideCards(
    loc,
    side,
    sideCards(loc, side).filter((c) => c.instanceId !== card.instanceId),
  );
}
