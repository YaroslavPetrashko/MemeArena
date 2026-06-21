import type { Card, CardEffectDef, OwnedCard, Rarity } from "@/types";
import { getCard } from "@/data/cards";
import {
  STAT_GROWTH_PER_LEVEL,
  MAX_CARD_LEVEL,
  getUpgradeCost,
} from "@/data/upgrades";

/**
 * Resolves a card's *effective* effect at a given level. Implements the
 * universal upgrade rules:
 *   L2: +10% main stats (damage/shield/heal scale cumulatively).
 *   L3: passive trait flag enabled (consumed by cardEffects/battleEngine).
 *   L4: cost reduction / improved secondary effect.
 *   L5: ultimate variant numbers.
 *
 * Card-specific ultimate behaviors live in cardEffects.ts which also reads the
 * level; this resolver handles the numeric scaling + cost so the math is
 * centralized and easy to rebalance.
 */
export interface ResolvedCard {
  card: Card;
  level: number;
  cost: number;
  effect: CardEffectDef;
  hasPassive: boolean; // L3+
  isUltimate: boolean; // L5
}

function scale(value: number | undefined, level: number): number | undefined {
  if (value === undefined) return undefined;
  const mult = 1 + STAT_GROWTH_PER_LEVEL * (level - 1);
  return Math.round(value * mult);
}

export function resolveCard(cardId: string, level: number): ResolvedCard | null {
  const card = getCard(cardId);
  if (!card) return null;
  const lvl = Math.min(Math.max(level, 1), MAX_CARD_LEVEL);
  const base = card.base_effect;

  const effect: CardEffectDef = {
    ...base,
    damage: scale(base.damage, lvl),
    shield: scale(base.shield, lvl),
    heal: scale(base.heal, lvl),
    burn: base.burn,
  };

  // L3 crit/stun bumps for the relevant cards.
  if (lvl >= 3 && base.critChance) effect.critChance = Math.min(1, base.critChance + 0.15);
  if (lvl >= 3 && base.stunChance) effect.stunChance = Math.min(1, base.stunChance + 0.1);

  // L4 cost reduction for cards that get cheaper.
  let cost = card.base_cost;
  if (lvl >= 4 && ["moo_deng_hippo", "gigachad"].includes(card.id)) {
    cost = Math.max(1, cost - 1);
  }

  return {
    card,
    level: lvl,
    cost,
    effect,
    hasPassive: lvl >= 3,
    isUltimate: lvl >= 5,
  };
}

/** Whether a card can be upgraded and what it costs. */
export function getNextUpgrade(owned: Pick<OwnedCard, "level" | "card_id">) {
  const card = getCard(owned.card_id);
  if (!card || owned.level >= MAX_CARD_LEVEL) return null;
  const cost = getUpgradeCost(owned.level + 1, card.rarity as Rarity);
  return cost ? { toLevel: owned.level + 1, cost } : null;
}

/**
 * Check affordability against balances (Coins/Shards from owned card, Gems
 * from profile). Real deduction happens server-side / via the upgrade store.
 */
export function canAfford(
  cost: { coins: number; shards: number; gems: number },
  balances: { coins: number; shards: number; gems: number },
): boolean {
  return (
    balances.coins >= cost.coins &&
    balances.shards >= cost.shards &&
    balances.gems >= cost.gems
  );
}

/** Simple deck power metric used for unlock gating + UI. */
export function deckPower(cardLevels: { card_id: string; level: number }[]): number {
  const rarityWeight: Record<Rarity, number> = {
    Common: 1,
    Rare: 2,
    Epic: 3,
    Legendary: 5,
  };
  return cardLevels.reduce((sum, c) => {
    const card = getCard(c.card_id);
    if (!card) return sum;
    return sum + rarityWeight[card.rarity as Rarity] * c.level;
  }, 0);
}
