import type { SnapBoss } from "@/types/snap";

/**
 * SNAP PvE bosses. Decks pull from the 15-card meme pool. Boss art uses
 * /public/bosses/<slug>.png. Keep in sync with the server mirror.
 */
export const SNAP_BOSSES: SnapBoss[] = [
  {
    id: "rug_pull_goblin",
    name: "Rug Pull Goblin",
    slug: "rug-pull-goblin",
    difficulty: 1,
    personality: "disruptive",
    deck: [
      "john_pork", "moodeng", "retardio", "pnut",
      "chillguy", "tung", "popcat", "john_pork",
      "moodeng", "chillguy", "retardio", "pnut",
    ],
    passiveId: "movePlayerCardAfterTurn4",
    passiveText: "Once after turn 4, moves a random card of yours.",
    preferredLocations: ["backrooms", "wall_street"],
    signatureCardId: "retardio",
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
      "john_pork", "moodeng", "pnut", "chillguy",
      "john_pork", "moodeng", "popcat", "retardio",
      "tung", "chillguy", "pnut", "dogwifhat",
    ],
    passiveId: "startWithBot",
    passiveText: "Starts with a 1-Power Bot at a random location.",
    preferredLocations: ["agartha", "miami"],
    signatureCardId: "john_pork",
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
      "pnut", "retardio", "popcat", "tung",
      "dogwifhat", "wojak", "chillguy", "john_pork",
      "moodeng", "retardio", "popcat", "tung",
    ],
    passiveId: "earlyTurnsPlusOne",
    passiveText: "Boss cards played on turns 1-3 have +1 Power.",
    preferredLocations: ["miami", "solangeles"],
    signatureCardId: "dogwifhat",
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
      "floki", "pepe", "pengu", "kekius_maximus",
      "troll", "doge", "wojak", "dogwifhat",
      "floki", "pepe", "pengu", "kekius_maximus",
    ],
    passiveId: "turn6BonusEnergy",
    passiveText: "On turn 6, the boss has +1 Energy.",
    preferredLocations: ["garage_with_supercars", "wall_street"],
    signatureCardId: "doge",
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
      "doge", "troll", "kekius_maximus", "pengu",
      "pepe", "floki", "wojak", "dogwifhat",
      "retardio", "tung", "popcat", "pnut",
    ],
    passiveId: "revealLastOnTurn6",
    passiveText: "On turn 6, the boss reveals after you, no matter what.",
    preferredLocations: ["crypto_bro_room", "wall_street"],
    signatureCardId: "kekius_maximus",
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
      "pepe", "kekius_maximus", "doge", "troll",
      "pengu", "floki", "wojak", "pepe",
      "kekius_maximus", "doge", "troll", "pengu",
    ],
    passiveId: "firstOngoingPlusTwo",
    passiveText: "The boss's first Ongoing card has +2 Power.",
    preferredLocations: ["chillhouse", "crypto_bro_room"],
    signatureCardId: "pepe",
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
      "moodeng", "popcat", "dogwifhat", "wojak",
      "floki", "pepe", "pengu", "kekius_maximus",
      "troll", "doge", "moodeng", "popcat",
    ],
    passiveId: "firstCardEachLocationPlusTwo",
    passiveText: "The boss's first card at each location gets +2 Power.",
    preferredLocations: ["miami", "solangeles"],
    signatureCardId: "moodeng",
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
      "retardio", "tung", "dogwifhat", "wojak",
      "floki", "pepe", "pengu", "kekius_maximus",
      "troll", "doge", "retardio", "tung",
    ],
    passiveId: "stealFromWinningLocationsTurn5",
    passiveText: "At end of turn 5, steals 1 Power from each location you're winning.",
    preferredLocations: ["backrooms", "crypto_bro_room"],
    signatureCardId: "troll",
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
