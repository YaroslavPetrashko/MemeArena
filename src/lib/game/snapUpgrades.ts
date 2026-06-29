import { getSnapCardDef, snapCardPowerAtLevel, snapCardAbilityBonusAtLevel } from "@/data/snapCards";
import { getUpgradeCost, MAX_CARD_LEVEL } from "@/data/upgrades";

/** Whether a SNAP card can be upgraded and what the next level costs. */
export function getNextSnapUpgrade(cardId: string, level: number) {
  const def = getSnapCardDef(cardId);
  if (!def || level >= MAX_CARD_LEVEL) return null;
  const cost = getUpgradeCost(level + 1);
  return cost ? { toLevel: level + 1, cost } : null;
}

/** Deck-power metric for SNAP decks: sum of base Strength (levels are cosmetic). */
export function snapDeckPower(cardLevels: { card_id: string; level: number }[]): number {
  return cardLevels.reduce((sum, c) => {
    const def = getSnapCardDef(c.card_id);
    if (!def) return sum;
    return sum + snapCardPowerAtLevel(def, c.level);
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
