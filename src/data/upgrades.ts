import type { UpgradeCost, Rarity } from "@/types";

/**
 * Card upgrade costs (levels 2-5). Costs scale with rarity via a multiplier so
 * legendaries cost more to max. All values are config — rebalance here.
 *
 * Level effects (applied by /lib/game/upgrades.ts):
 *   L2: +10% main stat
 *   L3: passive trait unlocked
 *   L4: reduced cost / improved secondary effect
 *   L5: ultimate variant + cosmetic frame
 */
export const BASE_UPGRADE_COSTS: UpgradeCost[] = [
  { level: 2, coins: 100, shards: 0, gems: 0 },
  { level: 3, coins: 250, shards: 4, gems: 0 },
  { level: 4, coins: 500, shards: 8, gems: 0 },
  { level: 5, coins: 1000, shards: 16, gems: 10 },
];

export const RARITY_COST_MULTIPLIER: Record<Rarity, number> = {
  Common: 0.7,
  Rare: 1,
  Epic: 1.4,
  Legendary: 2,
};

export const MAX_CARD_LEVEL = 5;

/** Stat growth per level for the "+10% main stat" rule (cumulative). */
export const STAT_GROWTH_PER_LEVEL = 0.1;

export function getUpgradeCost(toLevel: number, rarity: Rarity): UpgradeCost | null {
  const base = BASE_UPGRADE_COSTS.find((c) => c.level === toLevel);
  if (!base) return null;
  const mult = RARITY_COST_MULTIPLIER[rarity];
  return {
    level: toLevel,
    coins: Math.round(base.coins * mult),
    shards: Math.round(base.shards * mult),
    gems: Math.round(base.gems * mult),
  };
}
