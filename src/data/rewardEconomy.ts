import type { EconomyConfig, GameModeId } from "@/types";

/**
 * MEMEARENA tokenomics + reward emission controls.
 *
 * TOKEN ALLOCATION (placeholders — editable here, not scattered in code):
 *   Total supply ............ 1,000,000,000 MEMEARENA
 *   Gameplay rewards pool .... 10%
 *   Treasury / ecosystem ..... 20%
 *   Liquidity / market ....... 20%
 *   Team / creator ........... 15%
 *   Marketing / community .... 20%
 *   Reserves ................. 15%
 *
 * NOTE: These are placeholders for an MVP and carry NO profit guarantee.
 * MemeArena is a game; rewards are subject to validation, caps, and availability.
 */
export const ECONOMY_CONFIG: EconomyConfig = {
  token: {
    name: "MEMEARENA",
    symbol: "MEMEARENA",
    totalSupply: 1_000_000_000,
    allocations: {
      gameplayRewards: 0.1,
      treasuryEcosystem: 0.2,
      liquidityMarket: 0.2,
      teamCreator: 0.15,
      marketingCommunity: 0.2,
      reserves: 0.15,
    },
  },
  caps: {
    // Global emission ceilings (server-enforced in production).
    globalDaily: 250_000,
    globalWeekly: 1_500_000,
    // Per-wallet ceilings.
    walletDaily: 60,
    walletWeekly: 300,
    // Per-mode daily caps per wallet.
    modeDaily: {
      boss_rush: 25, // 10 from easy bosses, up to 25 total incl. advanced
      daily_boss: 20,
      survival: 30,
      limited_event: 75,
      high_roller: 250,
    },
  },
  diminishing: {
    easyWinThreshold: 5,
    decayPerWin: 0.12,
    minMultiplier: 0.25,
  },
  cooldownSeconds: 20,
};

/**
 * Per-mode reward shaping. The reward formula in /lib/game/rewards.ts reads
 * these values; tune the whole economy from this one file.
 */
export interface ModeRewardRule {
  mode: GameModeId;
  baseReward: number;
  /** Minimum score / wave required to earn any MEMEARENA (anti-farm). */
  minScoreForToken: number;
  /** Maps entry type to a reward modifier. */
  entryTypeModifier: { free: number; ticket: number; gems: number };
  /** Weekly leaderboard bonus pool range. */
  leaderboardBonus?: [number, number];
}

export const MODE_REWARD_RULES: Record<GameModeId, ModeRewardRule> = {
  boss_rush: {
    mode: "boss_rush",
    baseReward: 1,
    minScoreForToken: 1,
    entryTypeModifier: { free: 1, ticket: 1, gems: 1 },
  },
  daily_boss: {
    mode: "daily_boss",
    baseReward: 4,
    minScoreForToken: 1,
    entryTypeModifier: { free: 1, ticket: 1.05, gems: 1.05 },
    leaderboardBonus: [25, 100],
  },
  survival: {
    mode: "survival",
    baseReward: 1,
    minScoreForToken: 5, // must reach wave 5
    entryTypeModifier: { free: 1, ticket: 1.05, gems: 1.05 },
  },
  limited_event: {
    mode: "limited_event",
    baseReward: 10,
    minScoreForToken: 1,
    entryTypeModifier: { free: 1, ticket: 1.1, gems: 1.1 },
    leaderboardBonus: [100, 500],
  },
  high_roller: {
    mode: "high_roller",
    baseReward: 50,
    minScoreForToken: 1,
    entryTypeModifier: { free: 1, ticket: 1.2, gems: 1.2 },
  },
};

/** Legal / safety copy shown in footers and reward UIs. */
export const SAFETY_COPY = {
  game: "MemeArena is a game. Rewards are not guaranteed.",
  rewards:
    "MEMEARENA token rewards are subject to validation, caps, and availability.",
  advice: "Nothing here is financial advice.",
  fun: "Play for fun. Bonk responsibly.",
};
