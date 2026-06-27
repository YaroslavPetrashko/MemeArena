import type { SnapCard, SnapCardDef } from "@/types/snap";
import { snapCardPowerAtLevel, snapCardCostAtLevel, snapCardAbilityBonusAtLevel } from "@/data/snapCards";

/**
 * Build a static, non-interactive SnapCard view-model from a card definition +
 * level. Used in the deck builder and card modal where there's no live match.
 */
export function displayCard(def: SnapCardDef, level = 1): SnapCard {
  const power = snapCardPowerAtLevel(def, level);
  return {
    instanceId: `display_${def.id}`,
    cardId: def.id,
    owner: "player",
    name: def.name,
    cost: snapCardCostAtLevel(def, level),
    basePower: power,
    currentPower: power,
    abilityText: def.abilityText,
    abilityType: def.abilityType,
    abilityId: def.abilityId,
    tags: def.tags,
    rarity: def.rarity,
    level,
    imagePath: def.imagePath,
    abilityBonus: snapCardAbilityBonusAtLevel(def, level),
    locationId: null,
    isRevealed: true,
    modifiers: [],
    isToken: !!def.isToken,
  };
}
