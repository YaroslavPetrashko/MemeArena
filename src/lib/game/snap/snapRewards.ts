// SNAP reward mapping. Pure & deterministic.
//
// Only Coins and Gems are soft currencies. MEMEARENA is always recomputed
// server-side in the replay edge function and never trusted from the client.

import type { SnapScore, SnapModeId } from "../../../types/snap";

export interface SnapRewardOutput {
  coins: number;
  gems: number;
  /** Pending (unvalidated client-side) MEMEARENA. Server is authoritative. */
  memearena: number;
  reason: string;
}

export interface RewardCaps {
  walletDailyRemaining: number;
  modeDailyRemaining: number;
}

export interface RewardContext {
  mode: SnapModeId;
  difficultyValue: number;
  walletConnected: boolean;
  caps: RewardCaps;
  /** Diminishing-returns multiplier for easy-win farming. */
  antiFarm?: number;
}

/** Base MEMEARENA reward for the Arena mode. */
const ARENA_BASE = 1;
const ARENA_TOKEN_CAP = 25;

/** Coins and Gems from score + difficulty. Deterministic (no RNG). */
export function mapScoreToRewards(
  score: SnapScore,
  ctx: RewardContext,
): SnapRewardOutput {
  const won = score.result === "win";

  const coins = Math.round((won ? 40 : 12) * score.difficultyMultiplier)
    + score.locationsWon * 10;
  // Gem drop: winning gives a small gem bonus based on difficulty
  const gems = won ? Math.max(0, Math.round((score.difficultyMultiplier - 1) * 2)) : 0;

  const memearena = mapModeToMemearenaReward(score, ctx);

  return { coins, gems, memearena: memearena.amount, reason: memearena.reason };
}

/** MEMEARENA reward — the value the SERVER recomputes authoritatively. */
export function mapModeToMemearenaReward(
  score: SnapScore,
  ctx: RewardContext,
): { amount: number; reason: string } {
  const won = score.result === "win";

  if (!won) return { amount: 0, reason: "loss" };
  if (!ctx.walletConnected) return { amount: 0, reason: "guest_no_wallet" };

  const scoreMult = 1 + Math.min(1.5, score.total / 4000);
  const antiFarm = ctx.antiFarm ?? 1;
  let amount = ARENA_BASE * score.difficultyMultiplier * scoreMult * score.eventMultiplier
    * score.streakMultiplier * antiFarm;

  amount = Math.min(amount, ARENA_TOKEN_CAP, ctx.caps.modeDailyRemaining, ctx.caps.walletDailyRemaining);
  amount = Math.max(0, Math.round(amount * 100) / 100);

  if (amount <= 0) return { amount: 0, reason: "cap_reached" };
  return { amount, reason: "ok" };
}
