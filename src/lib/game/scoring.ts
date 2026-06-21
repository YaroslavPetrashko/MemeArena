import type { BattleState } from "@/types";

/**
 * Battle score — feeds reward brackets and leaderboards. Rewards efficiency:
 * high remaining HP, fewer turns, more damage, and combos all push score up.
 */
export interface ScoreBreakdown {
  total: number;
  damageScore: number;
  hpBonus: number;
  speedBonus: number;
  comboBonus: number;
  waveBonus: number;
}

export function computeScore(state: BattleState): ScoreBreakdown {
  const won = state.result === "win";
  const damageScore = Math.round(state.damageDealt * 4);
  const hpFrac = state.player.hp / state.player.maxHp;
  const hpBonus = won ? Math.round(hpFrac * 600) : 0;
  // Faster wins score more; clamp so very long fights still score.
  const speedBonus = won ? Math.max(0, 800 - state.turn * 40) : 0;
  const comboBonus = state.combosTriggered.length * 150;
  const waveBonus = (state.wave ?? 0) * 200;

  const total = Math.max(0, damageScore + hpBonus + speedBonus + comboBonus + waveBonus);
  return { total, damageScore, hpBonus, speedBonus, comboBonus, waveBonus };
}

/** Turn-efficiency multiplier in [0.8, 1.4] for the reward formula. */
export function turnEfficiency(state: BattleState): number {
  if (state.result !== "win") return 0.8;
  if (state.turn <= 4) return 1.4;
  if (state.turn <= 7) return 1.2;
  if (state.turn <= 11) return 1.05;
  return 0.9;
}

/** Remaining-HP bonus multiplier in [1.0, 1.3]. */
export function remainingHpMultiplier(state: BattleState): number {
  const frac = state.player.hp / state.player.maxHp;
  return 1 + Math.max(0, frac) * 0.3;
}
