// MIRROR of the SNAP engine — keep in sync with src/lib/game/snap/snapRewards.ts
// SNAP reward mapping. Pure & deterministic.
//
// Only Coins and Gems are soft currencies. MEMEARENA is ALWAYS recomputed
// server-side in the replay edge function (this same function), and never
// trusted from the client. The server passes no rank/streak multipliers, so its
// base stays conservative + authoritative; the client's higher value is pending.

import type { SnapScore, SnapModeId } from "./types.ts";

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
  /** Per-tier personal MEMEARENA ceiling (client-optimistic; server uses globals). */
  tierTokenCap?: number;
}

export interface RewardContext {
  mode: SnapModeId;
  difficultyValue: number;
  walletConnected: boolean;
  caps: RewardCaps;
  /** Diminishing-returns multiplier for easy-win farming. */
  antiFarm?: number;
  /** Soft-currency multiplier from the player's rank tier (default 1). */
  rankMultiplier?: number;
  /** Win-streak multiplier (default 1). */
  streakMultiplier?: number;
  /** Daily coin taper multiplier (default 1). */
  coinTaper?: number;
}

/** Base MEMEARENA reward for the Arena mode. */
const ARENA_BASE = 1;
const ARENA_TOKEN_CAP = 25;

/** Coins and Gems from score + difficulty, scaled by rank + streak. Deterministic. */
export function mapScoreToRewards(
  score: SnapScore,
  ctx: RewardContext,
): SnapRewardOutput {
  const won = score.result === "win";
  const rankMult = ctx.rankMultiplier ?? 1;
  const streakMult = ctx.streakMultiplier ?? 1;
  const coinTaper = ctx.coinTaper ?? 1;

  const baseCoins = (won ? 40 : 12) * score.difficultyMultiplier + score.locationsWon * 10;
  const coins = Math.round(baseCoins * rankMult * streakMult * coinTaper);
  const gems = won ? Math.round((1 + Math.floor(ctx.difficultyValue / 2)) * rankMult) : 0;

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
  const streakMult = ctx.streakMultiplier ?? score.streakMultiplier;
  let amount = ARENA_BASE * score.difficultyMultiplier * scoreMult * score.eventMultiplier
    * streakMult * antiFarm;

  amount = Math.min(
    amount,
    ARENA_TOKEN_CAP,
    ctx.caps.tierTokenCap ?? ARENA_TOKEN_CAP,
    ctx.caps.modeDailyRemaining,
    ctx.caps.walletDailyRemaining,
  );
  amount = Math.max(0, Math.round(amount * 100) / 100);

  if (amount <= 0) return { amount: 0, reason: "cap_reached" };
  return { amount, reason: "ok" };
}
