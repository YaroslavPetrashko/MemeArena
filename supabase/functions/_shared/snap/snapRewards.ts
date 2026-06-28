// MIRROR of the SNAP engine — keep in sync with src/lib/game/snap/snapRewards.ts
// SNAP reward mapping. Pure & deterministic.
//
// Non-token currencies (Coins/XP/Shards/Tickets) are computed here and applied
// optimistically client-side. MEMEARENA is ALWAYS recomputed server-side in the
// replay edge function (this same function), and never trusted from the client.

import type { SnapScore, SnapModeId } from "./types.ts";

export interface SnapRewardOutput {
  coins: number;
  xp: number;
  shards: number;
  tickets: number;
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
  survivalWave?: number;
  isEvent?: boolean;
  caps: RewardCaps;
  /** Diminishing-returns multiplier for easy-win farming. */
  antiFarm?: number;
}

/** Per-mode base MEMEARENA reward (mirrors MODE_REWARD_RULES). */
const MODE_BASE: Record<SnapModeId, number> = {
  boss_rush: 1,
  daily_boss: 4,
  survival: 1,
  limited_event: 10,
  high_roller: 50,
};

const MODE_TOKEN_CAP: Record<SnapModeId, number> = {
  boss_rush: 25,
  daily_boss: 20,
  survival: 30,
  limited_event: 75,
  high_roller: 250,
};

/** Coins/XP/Shards/Tickets from score + difficulty. Deterministic (no RNG). */
export function mapScoreToRewards(
  score: SnapScore,
  ctx: RewardContext,
): SnapRewardOutput {
  const won = score.result === "win";

  const coins = Math.round((won ? 40 : 12) * score.difficultyMultiplier)
    + score.locationsWon * 10;
  const xp = Math.round(won ? 35 : 10);
  const shards = won ? Math.max(1, Math.round(score.difficultyMultiplier)) : 0;
  let tickets = 0;
  // Deterministic ticket grant: high-score wins occasionally drop a ticket.
  if (won && score.total >= 1800) tickets = 1;
  if (ctx.mode === "survival" && (ctx.survivalWave ?? 0) >= 10) tickets += 1;

  const memearena = mapModeToMemearenaReward(score, ctx);

  return { coins, xp, shards, tickets, memearena: memearena.amount, reason: memearena.reason };
}

/** MEMEARENA reward — the value the SERVER recomputes authoritatively. */
export function mapModeToMemearenaReward(
  score: SnapScore,
  ctx: RewardContext,
): { amount: number; reason: string } {
  const won = score.result === "win";
  const survivalGate = ctx.mode === "survival" ? (ctx.survivalWave ?? 0) >= 5 : true;

  if (!won && ctx.mode !== "survival") return { amount: 0, reason: "loss" };
  if (!ctx.walletConnected) return { amount: 0, reason: "guest_no_wallet" };
  if (!survivalGate) return { amount: 0, reason: "below_min_wave" };

  const base = MODE_BASE[ctx.mode];
  const scoreMult = 1 + Math.min(1.5, score.total / 4000);
  const antiFarm = ctx.antiFarm ?? 1;
  let amount = base * score.difficultyMultiplier * scoreMult * score.eventMultiplier
    * score.streakMultiplier * antiFarm;

  const cap = MODE_TOKEN_CAP[ctx.mode];
  amount = Math.min(amount, cap, ctx.caps.modeDailyRemaining, ctx.caps.walletDailyRemaining);
  amount = Math.max(0, Math.round(amount * 100) / 100);

  if (amount <= 0) return { amount: 0, reason: "cap_reached" };
  return { amount, reason: "ok" };
}
