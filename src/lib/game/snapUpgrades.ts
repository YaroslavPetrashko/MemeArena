import type { Rarity } from "@/types";
import { getSnapCardDef, snapCardPowerAtLevel, snapCardAbilityBonusAtLevel } from "@/data/snapCards";
import { getUpgradeCost, MAX_CARD_LEVEL } from "@/data/upgrades";

/** Whether a SNAP card can be upgraded and what the next level costs. */
export function getNextSnapUpgrade(cardId: string, level: number) {
  const def = getSnapCardDef(cardId);
  if (!def || level >= MAX_CARD_LEVEL) return null;
  const cost = getUpgradeCost(level + 1, def.rarity);
  return cost ? { toLevel: level + 1, cost } : null;
}

/** Deck-power metric for SNAP decks: rarity weight × level + base power. */
export function snapDeckPower(cardLevels: { card_id: string; level: number }[]): number {
  const rarityWeight: Record<Rarity, number> = {
    Common: 1,
    Rare: 2,
    Epic: 3,
    Legendary: 5,
  };
  return cardLevels.reduce((sum, c) => {
    const def = getSnapCardDef(c.card_id);
    if (!def) return sum;
    return sum + rarityWeight[def.rarity] * c.level + snapCardPowerAtLevel(def, c.level);
  }, 0);
}

/** Preview text for a card's current vs next level (used in the modal). */
export function snapUpgradePreview(cardId: string, level: number) {
  const def = getSnapCardDef(cardId);
  if (!def) return null;
  const nextLevel = Math.min(level + 1, MAX_CARD_LEVEL);
  return {
    current: {
      level,
      power: snapCardPowerAtLevel(def, level),
      abilityBonus: snapCardAbilityBonusAtLevel(def, level),
    },
    next: {
      level: nextLevel,
      power: snapCardPowerAtLevel(def, nextLevel),
      abilityBonus: snapCardAbilityBonusAtLevel(def, nextLevel),
      description: def.levels.find((l) => l.level === nextLevel)?.description ?? "",
    },
    maxed: level >= MAX_CARD_LEVEL,
  };
}
