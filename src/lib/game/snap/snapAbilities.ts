// SNAP card ability resolution. Isomorphic & pure.
//
// Three phases:
//  - On Reveal: fired once when a card flips face-up (resolveOnReveal).
//  - Ongoing: recomputed every recompute pass as flat power modifiers
//    (ongoingPowerContribution), never mutating basePower.
//  - End of Game: fired at final scoring (resolveEndGameEffects).
// Conditional abilities resolve as ongoing modifiers or on reveal depending on
// the card. Keep in sync with the server mirror.

import type { SnapCard, SnapLocation, SnapMatchState } from "../../../types/snap";
import type { Rng } from "./prng";
import {
  sideCards,
  otherSide,
  isReductionImmune,
  isDestroyLocked,
  logEvent,
  type Side,
} from "./helpers";
import {
  spawnTokenAt,
  moveCardToRandomLocation,
  destroyCard,
} from "./engineOps";

/* ----------------------------- On Reveal ----------------------------- */

export interface OnRevealCtx {
  state: SnapMatchState;
  card: SnapCard;
  loc: SnapLocation;
  side: Side;
  rng: Rng;
}

type OnRevealHandler = (ctx: OnRevealCtx) => void;

const ON_REVEAL: Record<string, OnRevealHandler> = {
  // Pepe / Bull Run: give your OTHER cards here +N power (permanent).
  buffOthersHere: ({ state, card, loc, side }) => {
    const amount = (card.cardId === "bull_run" ? 2 : 1) + card.abilityBonus;
    for (const other of sideCards(loc, side)) {
      if (other.instanceId === card.instanceId) continue;
      other.modifiers.push({ source: `card:${card.instanceId}`, amount, kind: "permanent" });
    }
    logEvent(state, "ability", `${card.name} buffed allies here +${amount}.`);
  },

  // Mog Cat: if an enemy here is weaker, gain +2.
  bonusIfEnemyWeaker: ({ state, card, loc, side }) => {
    const enemies = sideCards(loc, otherSide(side));
    const amount = 2 + card.abilityBonus;
    if (enemies.some((e) => e.currentPower < card.currentPower)) {
      card.modifiers.push({ source: `self:${card.instanceId}`, amount, kind: "permanent" });
      logEvent(state, "ability", `${card.name} mogged a weaker enemy: +${amount}.`);
    }
  },

  // Popcat: spawn a Pop Token here.
  spawnPopToken: ({ state, card, loc, side, rng }) => {
    if (spawnTokenAt("pop_token", side, loc, state, rng)) {
      logEvent(state, "ability", `${card.name} popped a token here.`);
    }
  },

  // Peanut: +1 energy next turn.
  rampEnergy: ({ state, card, side }) => {
    const amt = 1 + card.abilityBonus;
    if (side === "player") state.player.pendingEnergy += amt;
    else state.boss.pendingEnergy += amt;
    logEvent(state, "ability", `${card.name} ramps +${amt} Energy next turn.`);
  },

  // Tung Tung: disable next enemy on-reveal here this turn.
  disableEnemyOnReveal: ({ state, card, loc, side }) => {
    state.flags[`disableOnReveal:${loc.id}:${otherSide(side)}`] = true;
    logEvent(state, "ability", `${card.name} silenced the enemy's next play here.`);
  },

  // Ballerina: move self to another location and gain +2.
  moveSelfGainPower: ({ state, card, loc, rng }) => {
    const dest = moveCardToRandomLocation(state, card, loc, rng);
    if (dest) {
      const amt = 2 + card.abilityBonus;
      card.modifiers.push({ source: `self:${card.instanceId}`, amount: amt, kind: "permanent" });
      logEvent(state, "ability", `${card.name} pirouetted to ${dest.name}: +${amt}.`);
    }
  },

  // Tralalero: random friendly +N or random enemy -N.
  chaosBuffOrDebuff: ({ state, card, loc, side, rng }) => {
    const amt = 3 + card.abilityBonus;
    if (rng.chance(0.5)) {
      const friends = sideCards(loc, side).filter((c) => c.instanceId !== card.instanceId);
      if (friends.length) {
        const t = friends[Math.floor(rng.next() * friends.length)];
        t.modifiers.push({ source: `card:${card.instanceId}`, amount: amt, kind: "permanent" });
        logEvent(state, "ability", `${card.name} blessed ${t.name} +${amt}.`);
        return;
      }
    }
    const enemies = sideCards(loc, otherSide(side));
    if (enemies.length) {
      const t = enemies[Math.floor(rng.next() * enemies.length)];
      applyReduction(t, loc, `card:${card.instanceId}`, amt);
      logEvent(state, "ability", `${card.name} cursed ${t.name} -${amt}.`);
    }
  },

  // Bombardino / (also Bear Market on-reveal variant): all enemies here -N.
  debuffEnemiesHere: ({ state, card, loc, side }) => {
    const amt = 1 + card.abilityBonus;
    for (const e of sideCards(loc, otherSide(side))) {
      applyReduction(e, loc, `card:${card.instanceId}`, amt);
    }
    logEvent(state, "ability", `${card.name} bombed enemies here -${amt}.`);
  },

  // Wojak: buff the next card you play +2.
  buffNextPlayed: ({ state, card, side }) => {
    const amt = 2 + card.abilityBonus;
    if (side === "player") state.player.nextCardBonus += amt;
    logEvent(state, "ability", `${card.name} hyped your next card +${amt}.`);
  },

  // Cappuccino Assassin: destroy lowest-power enemy here.
  destroyLowestEnemyHere: ({ state, card, loc, side, rng }) => {
    if (isDestroyLocked(loc)) return;
    const enemies = sideCards(loc, otherSide(side)).filter((c) => c.isRevealed);
    if (!enemies.length) return;
    let lowest = enemies[0];
    for (const e of enemies) {
      if (e.currentPower < lowest.currentPower) lowest = e;
      else if (e.currentPower === lowest.currentPower && rng.next() < 0.5) lowest = e;
    }
    destroyCard(loc, lowest, otherSide(side));
    logEvent(state, "ability", `${card.name} executed ${lowest.name}.`);
  },

  // Degen Trader: draw a card.
  drawCard: ({ state, card, side }) => {
    const n = 1 + card.abilityBonus;
    state.flags[`pendingDraw:${side}`] = ((state.flags[`pendingDraw:${side}`] as number) ?? 0) + n;
    logEvent(state, "ability", `${card.name} drew ${n} card(s).`);
  },

  // Rug Pull Goblin: move an enemy card here to a random other location.
  moveEnemyCard: ({ state, card, loc, side, rng }) => {
    const enemies = sideCards(loc, otherSide(side));
    if (!enemies.length) return;
    // Level 4+ targets strongest; otherwise random.
    let target = enemies[Math.floor(rng.next() * enemies.length)];
    if (card.abilityBonus > 0) {
      target = enemies.reduce((a, b) => (b.currentPower > a.currentPower ? b : a));
    }
    const dest = moveCardToRandomLocation(state, target, loc, rng);
    if (dest) logEvent(state, "ability", `${card.name} rugged ${target.name} to ${dest.name}.`);
  },

  // Liquidity Vampire: steal N power from strongest enemy here.
  stealPower: ({ state, card, loc, side }) => {
    const enemies = sideCards(loc, otherSide(side));
    if (!enemies.length) return;
    const strongest = enemies.reduce((a, b) => (b.currentPower > a.currentPower ? b : a));
    const amt = 2 + card.abilityBonus;
    const taken = applyReduction(strongest, loc, `card:${card.instanceId}`, amt);
    card.modifiers.push({ source: `self:${card.instanceId}`, amount: taken, kind: "permanent" });
    logEvent(state, "ability", `${card.name} drained ${taken} Power from ${strongest.name}.`);
  },

  // Hype Man: give a card in hand +2.
  buffHandCard: ({ state, card, side }) => {
    if (side !== "player") return;
    const amt = 2 + card.abilityBonus;
    const hand = state.player.hand;
    if (hand.length) {
      // Hand cards aren't on board, so bump basePower directly; recompute will
      // re-derive currentPower from basePower + on-board modifiers later.
      hand[0].basePower += amt;
      hand[0].currentPower += amt;
      logEvent(state, "ability", `${card.name} hyped ${hand[0].name} in hand +${amt}.`);
    }
  },

  // Alpha Caller: leftmost hand card +1.
  buffLeftmostHand: ({ state, card, side }) => {
    if (side !== "player") return;
    const amt = 1 + card.abilityBonus;
    const hand = state.player.hand;
    if (hand.length) {
      hand[0].basePower += amt;
      hand[0].currentPower += amt;
      logEvent(state, "ability", `${card.name} called alpha on ${hand[0].name} +${amt}.`);
    }
  },
};

/** Fire a card's On Reveal (respecting Degen Alley double + Tung disable). */
export function resolveOnReveal(ctx: OnRevealCtx): void {
  const { state, card, loc, side } = ctx;
  if (card.abilityType !== "on_reveal") return;
  const handler = card.abilityId ? ON_REVEAL[card.abilityId] : undefined;
  if (!handler) return;

  // Tung Tung silence: consume one disable flag for this side at this loc.
  const disableKey = `disableOnReveal:${loc.id}:${side}`;
  if (state.flags[disableKey]) {
    delete state.flags[disableKey];
    logEvent(state, "ability", `${card.name}'s On Reveal was silenced.`);
    return;
  }

  handler(ctx);
  // Degen Alley: On Reveal triggers twice here.
  if (loc.effectId === "degenAlley") handler(ctx);
}

/* --------------------- Conditional (on reveal time) ------------------ */

/** Conditionals that bake a one-time modifier at reveal (Trenches Rat). */
export function resolveConditionalOnReveal(ctx: OnRevealCtx): void {
  const { state, card } = ctx;
  if (card.abilityId === "penaltyIfLate") {
    const penalty = 2 - card.abilityBonus;
    if (state.turn > 3 && penalty > 0) {
      card.modifiers.push({ source: `self:${card.instanceId}`, amount: -penalty, kind: "permanent" });
      logEvent(state, "ability", `${card.name} arrived late: -${penalty}.`);
    }
  }
}

/* ------------------------------ Ongoing ------------------------------ */

/**
 * Flat power contribution a card grants to a target during a recompute pass.
 * Returns 0 if not applicable. Computed fresh each pass (never mutates base).
 */
export function ongoingPowerContribution(
  source: SnapCard,
  target: SnapCard,
  loc: SnapLocation,
  targetSide: Side,
): number {
  if (!source.isRevealed) return 0;
  const sourceSide = source.owner;
  switch (source.abilityId) {
    case "ongoingBuffOthersHere": // Sigma Cat
      if (sourceSide === targetSide && source.instanceId !== target.instanceId) {
        return 1 + source.abilityBonus;
      }
      return 0;
    case "ongoingBuffOnRevealHere": // Rare Pepe
      if (
        sourceSide === targetSide &&
        source.instanceId !== target.instanceId &&
        target.abilityType === "on_reveal"
      ) {
        return 1 + source.abilityBonus;
      }
      return 0;
    case "ongoingDebuffEnemiesHere": // Bear Market card
      if (sourceSide !== targetSide) {
        return reductionAllowed(target, loc, -(1 + source.abilityBonus));
      }
      return 0;
    case "ongoingDebuffSmallEnemiesHere": // Whale
      if (sourceSide !== targetSide && target.basePower <= 2 + source.abilityBonus) {
        return reductionAllowed(target, loc, -1);
      }
      return 0;
    default:
      return 0;
  }
}

/* ----------------------------- End of Game --------------------------- */

export function resolveEndGameEffects(state: SnapMatchState, rng: Rng): void {
  // Market Maker: swap this card's power with strongest enemy here.
  for (const loc of state.locations) {
    for (const side of ["player", "boss"] as const) {
      for (const card of sideCards(loc, side)) {
        if (card.abilityId !== "swapPowerEndGame" || !card.isRevealed) continue;
        const enemies = sideCards(loc, otherSide(side)).filter((c) => c.isRevealed);
        if (!enemies.length) continue;
        const strongest = enemies.reduce((a, b) => (b.currentPower > a.currentPower ? b : a));
        const mine = card.currentPower;
        const theirs = strongest.currentPower;
        const delta = theirs - mine;
        card.modifiers.push({ source: `endgame:${card.instanceId}`, amount: delta, kind: "permanent" });
        strongest.modifiers.push({ source: `endgame:${card.instanceId}`, amount: -delta, kind: "permanent" });
        logEvent(state, "ability", `${card.name} swapped Power with ${strongest.name}.`);
      }
    }
  }
  void rng;
}

/* ------------------------------ Helpers ------------------------------ */

/** Apply a reduction respecting reduction-immunity; returns amount actually applied. */
function applyReduction(card: SnapCard, loc: SnapLocation, source: string, amount: number): number {
  if (isReductionImmune(card, loc)) return 0;
  const applied = Math.min(amount, Math.max(0, card.currentPower));
  card.modifiers.push({ source, amount: -applied, kind: "permanent" });
  return applied;
}

/** Gate an ongoing negative delta against reduction immunity. */
function reductionAllowed(card: SnapCard, loc: SnapLocation, delta: number): number {
  if (delta < 0 && isReductionImmune(card, loc)) return 0;
  return delta;
}
