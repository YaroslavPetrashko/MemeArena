import type { UpgradeCost } from "@/types";

/**
 * Card upgrade costs (levels 2-5). Flat cost for all cards.
 */
export const BASE_UPGRADE_COSTS: UpgradeCost[] = [
  { level: 2, coins: 100, gems: 0 },
  { level: 3, coins: 250, gems: 0 },
  { level: 4, coins: 500, gems: 0 },
  { level: 5, coins: 1000, gems: 10 },
];

export const MAX_CARD_LEVEL = 5;

export const STAT_GROWTH_PER_LEVEL = 0.1;

export function getUpgradeCost(toLevel: number): UpgradeCost | null {
  return BASE_UPGRADE_COSTS.find((c) => c.level === toLevel) ?? null;
}
