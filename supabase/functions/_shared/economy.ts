// Server-side copy of the reward economy used by submit-battle-result.
// Keep these values in sync with /src/data/rewardEconomy.ts when rebalancing.
// (Deno Edge Functions can't import from the Next.js `@/` alias, so this is a
// deliberate, documented duplication.)

export const CAPS = {
  walletDaily: 60,
  walletWeekly: 300,
  modeDaily: {
    arena: 25,
  } as Record<string, number>,
};

export const DIMINISHING = {
  easyWinThreshold: 5,
  decayPerWin: 0.12,
  minMultiplier: 0.25,
};

export interface RewardFormulaInputs {
  baseReward: number;
  difficultyMultiplier: number;
  scoreMultiplier: number;
  comboBonus: number;
  remainingHpBonus: number;
  turnEfficiencyBonus: number;
  entryTypeModifier: number;
  antiFarmModifier: number;
  dailyCapRemaining: number;
  weeklyCapRemaining: number;
  modeDailyCapRemaining: number;
}

export function computeFinalReward(i: RewardFormulaInputs): number {
  const core = i.baseReward * i.difficultyMultiplier * i.scoreMultiplier + i.comboBonus;
  const shaped =
    core * i.remainingHpBonus * i.turnEfficiencyBonus * i.entryTypeModifier * i.antiFarmModifier;
  const capped = Math.min(shaped, i.dailyCapRemaining, i.weeklyCapRemaining, i.modeDailyCapRemaining);
  return Math.max(0, Math.round(capped * 100) / 100);
}

/**
 * Plausibility bounds for anti-cheat. Reported battle stats must fall inside
 * these ranges or the battle is flagged for review instead of approved.
 */
export function isBattlePlausible(b: {
  turns: number;
  damage_dealt: number;
  bossMaxHp: number;
  result: string;
}): boolean {
  if (b.turns < 1 || b.turns > 60) return false;
  if (b.damage_dealt < 0) return false;
  // A win must have dealt at least the boss's HP worth of damage.
  if (b.result === "win" && b.damage_dealt < b.bossMaxHp * 0.9) return false;
  // Cap absurd damage (50x boss HP is not believable for this engine).
  if (b.damage_dealt > b.bossMaxHp * 50) return false;
  return true;
}
