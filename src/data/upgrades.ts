import type { UpgradeCost, Rarity } from "@/types";

/**
 * Card upgrade costs (levels 2-5). Scales with rarity. Only Coins and Gems.
 */
export const BASE_UPGRADE_COSTS: UpgradeCost[] = [
  { level: 2, coins: 100, gems: 0 },
  { level: 3, coins: 250, gems: 0 },
  { level: 4, coins: 500, gems: 0 },
  { level: 5, coins: 1000, gems: 10 },
];

export const RARITY_COST_MULTIPLIER: Record<Rarity, number> = {
  Common: 0.7,
  Rare: 1,
  Epic: 1.4,
  Legendary: 2,
};

export const MAX_CARD_LEVEL = 5;

export const STAT_GROWTH_PER_LEVEL = 0.1;

export function getUpgradeCost(toLevel: number, rarity: Rarity): UpgradeCost | null {
  const base = BASE_UPGRADE_COSTS.find((c) => c.level === toLevel);
  if (!base) return null;
  const mult = RARITY_COST_MULTIPLIER[rarity];
  return {
    level: toLevel,
    coins: Math.round(base.coins * mult),
    gems: Math.round(base.gems * mult),
  };
}
