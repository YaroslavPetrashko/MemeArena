import type {
  BattleState,
  GameModeId,
  Reward,
  RewardFormulaInputs,
} from "@/types";
import { getBoss } from "@/data/bosses";
import { ECONOMY_CONFIG, MODE_REWARD_RULES } from "@/data/rewardEconomy";
import { createRng } from "./rng";
import { computeScore, turnEfficiency, remainingHpMultiplier } from "./scoring";

/**
 * The canonical reward formula. Kept as a pure function so the client can
 * *preview* rewards and the submit-battle-result Edge Function can compute the
 * authoritative value with identical math (the Edge Function holds its own copy
 * for the Deno runtime — keep them in sync when rebalancing).
 *
 * finalReward = min(
 *   baseReward * difficultyMultiplier * scoreMultiplier + comboBonus,
 *   walletDailyCapRemaining,
 *   modeDailyCapRemaining
 * ) * remainingHpBonus * turnEfficiencyBonus * entryTypeModifier * antiFarmModifier
 */
export function computeFinalReward(i: RewardFormulaInputs): number {
  const core =
    i.baseReward * i.difficultyMultiplier * i.scoreMultiplier + i.comboBonus;
  const shaped =
    core *
    i.remainingHpBonus *
    i.turnEfficiencyBonus *
    i.entryTypeModifier *
    i.antiFarmModifier;
  const capped = Math.min(
    shaped,
    i.dailyCapRemaining,
    i.weeklyCapRemaining,
    i.modeDailyCapRemaining,
  );
  return Math.max(0, Math.round(capped * 100) / 100);
}

export interface RewardContext {
  mode: GameModeId;
  entryType: "free" | "ticket" | "gems";
  /** Number of easy wins already today (drives diminishing returns). */
  easyWinsToday: number;
  /** Remaining caps (pass Infinity client-side; server passes real values). */
  walletDailyRemaining: number;
  walletWeeklyRemaining: number;
  modeDailyRemaining: number;
  /** Whether a wallet is connected (no token rewards for guests). */
  walletConnected: boolean;
}

/** Difficulty multiplier from the boss's numeric/categorical difficulty. */
function difficultyMultiplier(bossId: string): number {
  const boss = getBoss(bossId);
  if (!boss) return 1;
  const d = boss.difficulty;
  if (typeof d === "number") return 0.8 + d * 0.18;
  if (d === "daily boss") return 1.6;
  if (d === "limited event") return 2.2;
  if (d === "challenge") return 1.9;
  return 1;
}

/** Diminishing-returns modifier after too many easy wins. */
function antiFarmModifier(mode: GameModeId, easyWinsToday: number): number {
  const { easyWinThreshold, decayPerWin, minMultiplier } = ECONOMY_CONFIG.diminishing;
  if (mode !== "boss_rush") return 1;
  if (easyWinsToday <= easyWinThreshold) return 1;
  const over = easyWinsToday - easyWinThreshold;
  return Math.max(minMultiplier, 1 - over * decayPerWin);
}

/**
 * Compute the full battle reward (Coins/XP/Shards/Tickets/pending MEMEARENA).
 * For Survival, `wave` gates token rewards (min wave 5). Token = 0 for guests.
 */
export function computeBattleReward(
  state: BattleState,
  ctx: RewardContext,
): { reward: Reward; tokenReason: string } {
  const boss = getBoss(state.bossId);
  const rule = MODE_REWARD_RULES[ctx.mode];
  const score = computeScore(state).total;
  const rngSeed = createRng(`${state.seed}_reward`);
  const won = state.result === "win";

  // --- Non-token currencies (still awarded on loss at reduced rates) ---
  let coins = 0;
  let xp = 0;
  let shards = 0;
  let tickets = 0;

  if (boss) {
    const cfg = boss.rewards_config;
    const winMult = won ? 1 : 0.3;
    coins = Math.round(rngSeed.range(cfg.coins[0], cfg.coins[1]) * winMult);
    xp = Math.round(cfg.xp * (won ? 1 : 0.4));
    shards = won ? rngSeed.range(cfg.shards[0], cfg.shards[1]) : 0;
    if (won && rngSeed.chance(cfg.ticketChance)) tickets += 1;
  }
  // Survival wave 10 guarantees a ticket.
  if (ctx.mode === "survival" && (state.wave ?? 0) >= 10) tickets += 1;

  // --- Pending MEMEARENA token reward ---
  let memearena = 0;
  let tokenReason = "ok";

  const survivalGate = ctx.mode === "survival" ? (state.wave ?? 0) : Infinity;
  const meetsMinScore =
    ctx.mode === "survival" ? survivalGate >= rule.minScoreForToken : won;

  if (!won && ctx.mode !== "survival") {
    tokenReason = "loss";
  } else if (!ctx.walletConnected) {
    tokenReason = "guest_no_wallet";
  } else if (!meetsMinScore) {
    tokenReason = ctx.mode === "survival" ? "below_min_wave" : "loss";
  } else {
    const inputs: RewardFormulaInputs = {
      baseReward: boss ? (boss.rewards_config.memearenaMin + boss.rewards_config.memearenaMax) / 2 : rule.baseReward,
      difficultyMultiplier: difficultyMultiplier(state.bossId),
      scoreMultiplier: 1 + Math.min(1.5, score / 3000),
      comboBonus: state.combosTriggered.length * 0.5,
      remainingHpBonus: remainingHpMultiplier(state),
      turnEfficiencyBonus: turnEfficiency(state),
      entryTypeModifier: rule.entryTypeModifier[ctx.entryType],
      antiFarmModifier: antiFarmModifier(ctx.mode, ctx.easyWinsToday),
      dailyCapRemaining: ctx.walletDailyRemaining,
      weeklyCapRemaining: ctx.walletWeeklyRemaining,
      modeDailyCapRemaining: ctx.modeDailyRemaining,
    };
    memearena = computeFinalReward(inputs);

    // Clamp to the boss's advertised band so previews match expectations.
    if (boss) {
      const { memearenaMin, memearenaMax } = boss.rewards_config;
      memearena = Math.max(memearenaMin, Math.min(memearena, memearenaMax));
      memearena = Math.min(memearena, ctx.walletDailyRemaining, ctx.modeDailyRemaining);
      memearena = Math.round(memearena * 100) / 100;
    }
    if (memearena <= 0) tokenReason = "cap_reached";
  }

  return {
    reward: { coins, xp, shards, tickets, memearena },
    tokenReason,
  };
}
