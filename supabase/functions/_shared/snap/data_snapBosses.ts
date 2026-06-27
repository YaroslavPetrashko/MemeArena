// MIRROR of src/data/snapBosses.ts — keep in sync.
import type { SnapBoss } from "./types.ts";

/**
 * SNAP PvE bosses. Each is a themed AI opponent with a card pool, personality,
 * and a passive (resolved by passiveId in the engine). Boss art reuses the
 * existing /public/bosses/<slug>.png slots. Keep in sync with the server mirror.
 */
export const SNAP_BOSSES: SnapBoss[] = [
  {
    id: "rug_pull_goblin",
    name: "Rug Pull Goblin",
    slug: "rug-pull-goblin",
    difficulty: 1,
    personality: "disruptive",
    deck: [
      "rug_pull_goblin", "bot_minion", "trenches_rat", "bear_market",
      "cappuccino_assassin", "bonk_dog", "degen_trader", "popcat",
      "dogwifhat", "tung_tung_tung_sahur", "hype_man", "sigma_cat",
    ],
    passiveId: "movePlayerCardAfterTurn4",
    passiveText: "Once after turn 4, moves a random card of yours.",
    preferredLocations: ["rug_zone", "jeet_street"],
    signatureCardId: "rug_pull_goblin",
    rewardTier: "low",
    imagePath: "/bosses/rug-pull-goblin.png",
    flavor: "Wen lambo? Never. Wen rug? Always.",
    unlockAfterBossId: null,
  },
  {
    id: "bot_swarm",
    name: "Bot Swarm",
    slug: "bot-swarm",
    difficulty: 2,
    personality: "wide",
    deck: [
      "popcat", "bot_minion", "bot_minion", "sigma_cat", "alpha_caller",
      "degen_trader", "bonk_dog", "peanut_the_squirrel", "hype_man",
      "pump_candle", "rare_pepe", "whale",
    ],
    passiveId: "startWithBot",
    passiveText: "Starts with a 1-Power Bot at a random location.",
    preferredLocations: ["bot_farm", "meme_factory"],
    signatureCardId: "bot_minion",
    rewardTier: "low",
    imagePath: "/bosses/bot-swarm.png",
    flavor: "gm. gm. gm. gm. gm. gm. gm.",
    unlockAfterBossId: "rug_pull_goblin",
  },
  {
    id: "jeet_dragon",
    name: "Jeet Dragon",
    slug: "jeet-dragon",
    difficulty: 3,
    personality: "aggressive",
    deck: [
      "jeet_dragon", "dogwifhat", "trenches_rat", "pump_candle", "mog_cat",
      "bonk_dog", "popcat", "tralalero_tralala", "bull_run", "bombardino_crocodilo",
      "hype_man", "alpha_caller",
    ],
    passiveId: "earlyTurnsPlusOne",
    passiveText: "Boss cards played on turns 1-3 have +1 Power.",
    preferredLocations: ["trenches", "pump_plaza"],
    signatureCardId: "jeet_dragon",
    rewardTier: "medium",
    imagePath: "/bosses/jeet-dragon.png",
    flavor: "Sells the top. Every top. Including yours.",
    unlockAfterBossId: "bot_swarm",
  },
  {
    id: "whale_lord",
    name: "Whale Lord",
    slug: "whale-lord",
    difficulty: 4,
    personality: "stacker",
    deck: [
      "whale", "gigachad", "market_maker", "bull_run", "moo_deng_hippo",
      "mog_cat", "bombardino_crocodilo", "bear_market", "rare_pepe",
      "diamond_hands", "sigma_cat", "pepe_the_frog",
    ],
    passiveId: "turn6BonusEnergy",
    passiveText: "On turn 6, the boss has +1 Energy.",
    preferredLocations: ["whale_wall", "final_candle"],
    signatureCardId: "whale",
    rewardTier: "medium",
    imagePath: "/bosses/whale-lord.png",
    flavor: "Moves the market by existing.",
    unlockAfterBossId: "jeet_dragon",
  },
  {
    id: "market_maker",
    name: "Market Maker",
    slug: "market-maker",
    difficulty: 5,
    personality: "greedy",
    deck: [
      "market_maker", "rug_pull_goblin", "liquidity_vampire", "bear_market",
      "whale", "mog_cat", "bombardino_crocodilo", "cappuccino_assassin",
      "diamond_hands", "rare_pepe", "bull_run", "gigachad",
    ],
    passiveId: "revealLastOnTurn6",
    passiveText: "On turn 6, the boss reveals after you, no matter what.",
    preferredLocations: ["whale_wall", "hype_chamber"],
    signatureCardId: "market_maker",
    rewardTier: "high",
    imagePath: "/bosses/market-maker.png",
    flavor: "Sets the price. You just pay it.",
    unlockAfterBossId: "whale_lord",
  },
  {
    id: "pepe_the_ancient",
    name: "Pepe the Ancient",
    slug: "pepe-the-ancient",
    difficulty: "challenge",
    personality: "stacker",
    deck: [
      "pepe_the_frog", "rare_pepe", "sigma_cat", "diamond_hands", "moo_deng_hippo",
      "bear_market", "whale", "bull_run", "mog_cat", "hype_man",
      "pump_candle", "gigachad",
    ],
    passiveId: "firstOngoingPlusTwo",
    passiveText: "The boss's first Ongoing card has +2 Power.",
    preferredLocations: ["diamond_hands", "hype_chamber"],
    signatureCardId: "rare_pepe",
    rewardTier: "challenge",
    imagePath: "/bosses/pepe-the-ancient.png",
    flavor: "Feels ancient, man. Has seen every cycle.",
    unlockAfterBossId: "market_maker",
  },
  {
    id: "moo_deng_rampage",
    name: "Moo Deng Rampage",
    slug: "moo-deng-rampage",
    difficulty: "daily",
    personality: "aggressive",
    deck: [
      "moo_deng_hippo", "dogwifhat", "whale", "bull_run", "gigachad",
      "bonk_dog", "mog_cat", "bombardino_crocodilo", "pump_candle",
      "hype_man", "sigma_cat", "pepe_the_frog",
    ],
    passiveId: "firstCardEachLocationPlusTwo",
    passiveText: "The boss's first card at each location gets +2 Power.",
    preferredLocations: ["pump_plaza", "final_candle"],
    signatureCardId: "moo_deng_hippo",
    rewardTier: "daily",
    imagePath: "/bosses/moo-deng-rampage.png",
    flavor: "Bouncy. Unbothered. Absolutely rampaging.",
    unlockAfterBossId: null,
  },
  {
    id: "liquidity_vampire",
    name: "Liquidity Vampire",
    slug: "liquidity-vampire",
    difficulty: "event",
    personality: "disruptive",
    deck: [
      "liquidity_vampire", "bear_market", "market_maker", "bombardino_crocodilo",
      "whale", "cappuccino_assassin", "rug_pull_goblin", "mog_cat",
      "diamond_hands", "rare_pepe", "bull_run", "gigachad",
    ],
    passiveId: "stealFromWinningLocationsTurn5",
    passiveText: "At end of turn 5, steals 1 Power from each location you're winning.",
    preferredLocations: ["liquidity_pool", "hype_chamber"],
    signatureCardId: "liquidity_vampire",
    rewardTier: "event",
    imagePath: "/bosses/liquidity-vampire.png",
    flavor: "Drains the pool. Yours, specifically.",
    unlockAfterBossId: null,
  },
];

export const SNAP_BOSSES_BY_ID: Record<string, SnapBoss> = Object.fromEntries(
  SNAP_BOSSES.map((b) => [b.id, b]),
);

export function getSnapBoss(id: string): SnapBoss | undefined {
  return SNAP_BOSSES_BY_ID[id];
}

/** Bosses available in Boss Rush, in unlock order. */
export const BOSS_RUSH_ORDER: string[] = [
  "rug_pull_goblin",
  "bot_swarm",
  "jeet_dragon",
  "whale_lord",
  "market_maker",
  "pepe_the_ancient",
];

export const DAILY_BOSS_ID = "moo_deng_rampage";
export const EVENT_BOSS_ID = "liquidity_vampire";

/** Numeric difficulty used for reward scaling. */
export function bossDifficultyValue(boss: SnapBoss): number {
  if (typeof boss.difficulty === "number") return boss.difficulty;
  if (boss.difficulty === "challenge") return 6;
  if (boss.difficulty === "daily") return 5;
  if (boss.difficulty === "event") return 6;
  return 1;
}
