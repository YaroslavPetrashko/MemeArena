import type { Boss } from "@/types";

/**
 * Bot-controlled bosses. AI is a weighted-random move table interpreted by
 * /lib/game/bossAI.ts. Rewards are read by /lib/game/rewards.ts.
 * Image paths are placeholder slots in /public/bosses/*.png.
 */
export const BOSSES: Boss[] = [
  {
    id: "rug_pull_goblin",
    name: "Rug Pull Goblin",
    slug: "rug-pull-goblin",
    difficulty: 1,
    max_hp: 45,
    mode_availability: ["boss_rush"],
    unlock_requirement: { always: true },
    image_path: "/bosses/rug-pull-goblin.png",
    is_active: true,
    flavor: "Promised 1000x. Delivered 0x. Disappeared with the LP.",
    ai_pattern: {
      moves: [
        { id: "fake_pump", name: "Fake Pump", damage: 4, weight: 3, intentText: "Fake Pump — 4 dmg" },
        { id: "liquidity_slip", name: "Liquidity Slip", applyStatus: ["Rugged"], weight: 2, intentText: "Liquidity Slip — applies Rugged" },
        { id: "scam_minion", name: "Scam Minion", damage: 2, shield: 4, weight: 2, intentText: "Scam Minion — chip + shield" },
        { id: "mini_rug", name: "Mini Rug", damage: 8, weight: 1, isBigAttack: true, intentText: "Mini Rug — 8 dmg!" },
      ],
    },
    rewards_config: { memearenaMin: 0.5, memearenaMax: 1.5, coins: [20, 40], xp: 20, shards: [1, 2], ticketChance: 0.15, tier: "low" },
  },
  {
    id: "bot_swarm",
    name: "Bot Swarm",
    slug: "bot-swarm",
    difficulty: 2,
    max_hp: 60,
    mode_availability: ["boss_rush"],
    unlock_requirement: { defeatBossId: "rug_pull_goblin" },
    image_path: "/bosses/bot-swarm.png",
    is_active: true,
    flavor: "gm gm gm gm gm gm gm gm gm gm gm gm.",
    ai_pattern: {
      moves: [
        { id: "summon_bots", name: "Summon Bots", shield: 6, weight: 2, intentText: "Summon Bots — +6 shield" },
        { id: "chip_damage", name: "Chip Damage", damage: 3, weight: 3, intentText: "Chip Damage — 3 dmg" },
        { id: "spam_report", name: "Spam Report", applyStatus: ["Confused"], damage: 2, weight: 2, intentText: "Spam Report — Confused" },
        { id: "swarm_strike", name: "Swarm Strike", damage: 7, weight: 1, isBigAttack: true, intentText: "Swarm Strike — 7 dmg!" },
      ],
    },
    rewards_config: { memearenaMin: 1, memearenaMax: 2.5, coins: [30, 55], xp: 30, shards: [1, 3], ticketChance: 0.2, tier: "low" },
  },
  {
    id: "jeet_dragon",
    name: "Jeet Dragon",
    slug: "jeet-dragon",
    difficulty: 3,
    max_hp: 75,
    mode_availability: ["boss_rush"],
    unlock_requirement: { defeatBossId: "bot_swarm", playerLevel: 2 },
    image_path: "/bosses/jeet-dragon.png",
    is_active: true,
    flavor: "Sold the bottom. Bought the top. Breathes red candles.",
    ai_pattern: {
      moves: [
        { id: "paper_hands", name: "Paper Hands Swipe", damage: 6, weight: 3, intentText: "Paper Hands Swipe — 6 dmg" },
        { id: "panic_sell", name: "Panic Sell", damage: 5, scalesWithMissingHp: true, weight: 2, intentText: "Panic Sell — scales with your missing HP" },
        { id: "red_candle", name: "Red Candle Breath", damage: 3, applyStatus: ["Burn"], weight: 2, intentText: "Red Candle Breath — Burn" },
        { id: "capitulation", name: "Capitulation", damage: 12, weight: 1, isBigAttack: true, intentText: "Capitulation — 12 dmg!" },
      ],
    },
    rewards_config: { memearenaMin: 2, memearenaMax: 5, coins: [45, 80], xp: 45, shards: [2, 4], ticketChance: 0.3, tier: "medium" },
  },
  {
    id: "whale_lord",
    name: "Whale Lord",
    slug: "whale-lord",
    difficulty: 4,
    max_hp: 120,
    mode_availability: ["boss_rush"],
    unlock_requirement: { defeatBossId: "jeet_dragon", playerLevel: 3 },
    image_path: "/bosses/whale-lord.png",
    is_active: true,
    flavor: "Moves markets by sneezing. Tanky. Slow. Inevitable.",
    ai_pattern: {
      moves: [
        { id: "shield_wall", name: "Shield Wall", shield: 12, weight: 3, intentText: "Shield Wall — +12 shield" },
        { id: "splash", name: "Big Splash", damage: 9, weight: 3, intentText: "Big Splash — 9 dmg" },
        { id: "wake", name: "Tidal Wake", damage: 5, applyStatus: ["Chill"], weight: 2, intentText: "Tidal Wake — 5 dmg + Chill" },
        { id: "breach", name: "Breach", damage: 16, weight: 1, isBigAttack: true, intentText: "Breach — 16 dmg!" },
      ],
    },
    rewards_config: { memearenaMin: 4, memearenaMax: 8, coins: [70, 120], xp: 70, shards: [3, 5], ticketChance: 0.4, tier: "high" },
  },
  {
    id: "market_maker",
    name: "Market Maker",
    slug: "market-maker",
    difficulty: 5,
    max_hp: 150,
    mode_availability: ["boss_rush"],
    unlock_requirement: { defeatBossId: "whale_lord", playerLevel: 4 },
    image_path: "/bosses/market-maker.png",
    is_active: true,
    flavor: "Pumps your bags, then dumps your soul. Resets the chart for fun.",
    ai_pattern: {
      moves: [
        { id: "pump", name: "Pump Phase", shield: 10, heal: 6, weight: 2, intentText: "Pump Phase — heal + shield" },
        { id: "dump", name: "Dump Phase", damage: 11, weight: 3, intentText: "Dump Phase — 11 dmg" },
        { id: "stop_hunt", name: "Stop Hunt", damage: 6, applyStatus: ["Confused"], weight: 2, intentText: "Stop Hunt — 6 dmg + Confused" },
        { id: "liquidation", name: "Liquidation Cascade", damage: 18, weight: 1, isBigAttack: true, intentText: "Liquidation Cascade — 18 dmg!" },
        { id: "reset_chart", name: "Reset the Chart", heal: 12, weight: 1, intentText: "Reset the Chart — heals 12" },
      ],
    },
    rewards_config: { memearenaMin: 6, memearenaMax: 12, coins: [100, 160], xp: 100, shards: [4, 6], ticketChance: 0.5, tier: "high" },
  },
  {
    id: "pepe_the_ancient",
    name: "Pepe the Ancient",
    slug: "pepe-the-ancient",
    difficulty: "challenge",
    max_hp: 110,
    mode_availability: ["boss_rush"],
    unlock_requirement: { playerLevel: 5, defeatBossId: "market_maker" },
    image_path: "/bosses/pepe-the-ancient.png",
    is_active: true,
    flavor: "The original. Sees the dip before it happens. Heals through your cope.",
    ai_pattern: {
      moves: [
        { id: "ancient_shield", name: "Ancient Shield", shield: 14, weight: 3, intentText: "Ancient Shield — +14 shield" },
        { id: "rejuvenate", name: "Rejuvenate", heal: 10, weight: 2, intentText: "Rejuvenate — heals 10" },
        { id: "chill_aura", name: "Chill Aura", damage: 4, applyStatus: ["Chill"], weight: 2, intentText: "Chill Aura — 4 dmg + Chill" },
        { id: "cleanse", name: "Cleanse", shield: 6, weight: 2, intentText: "Cleanse — sheds debuffs, +6 shield" },
        { id: "ribbit_smash", name: "Ribbit Smash", damage: 13, weight: 1, isBigAttack: true, intentText: "Ribbit Smash — 13 dmg!" },
      ],
    },
    rewards_config: { memearenaMin: 8, memearenaMax: 20, coins: [120, 200], xp: 130, shards: [5, 8], ticketChance: 0.5, tier: "event" },
  },
  {
    id: "moo_deng_rampage",
    name: "Moo Deng Rampage",
    slug: "moo-deng-rampage",
    difficulty: "daily boss",
    max_hp: 130,
    mode_availability: ["daily_boss"],
    unlock_requirement: { always: true },
    image_path: "/bosses/moo-deng-rampage.png",
    is_active: true,
    flavor: "She's had enough. The hippo charges. Shield grows by the minute.",
    ai_pattern: {
      moves: [
        { id: "charge", name: "Charge", damage: 9, weight: 3, intentText: "Charge — 9 dmg" },
        { id: "harden", name: "Harden", shield: 10, weight: 3, intentText: "Harden — +10 shield (grows every 2 turns)" },
        { id: "confuse_splash", name: "Confuse Splash", damage: 4, applyStatus: ["Confused"], weight: 2, intentText: "Confuse Splash — 4 dmg + Confused" },
        { id: "rampage", name: "Rampage", damage: 15, weight: 1, isBigAttack: true, intentText: "Rampage — 15 dmg!" },
      ],
    },
    rewards_config: { memearenaMin: 3, memearenaMax: 20, coins: [80, 150], xp: 90, shards: [3, 6], ticketChance: 0.4, tier: "daily" },
  },
  {
    id: "liquidity_vampire",
    name: "Liquidity Vampire",
    slug: "liquidity-vampire",
    difficulty: "limited event",
    max_hp: 100,
    mode_availability: ["limited_event"],
    unlock_requirement: { playerLevel: 3 },
    image_path: "/bosses/liquidity-vampire.png",
    is_active: true,
    flavor: "Brainrot Week's apex predator. Drains your energy and your bags.",
    ai_pattern: {
      moves: [
        { id: "drain_energy", name: "Energy Drain", damage: 5, applyStatus: ["Rugged"], weight: 3, intentText: "Energy Drain — 5 dmg + Rugged" },
        { id: "lifesteal", name: "Lifesteal", damage: 7, heal: 7, weight: 3, intentText: "Lifesteal — 7 dmg, heals self" },
        { id: "steal_shield", name: "Shield Siphon", damage: 4, shield: 8, weight: 2, intentText: "Shield Siphon — steals shield" },
        { id: "blood_moon", name: "Blood Moon", damage: 14, heal: 6, weight: 1, isBigAttack: true, intentText: "Blood Moon — 14 dmg + heals!" },
      ],
    },
    rewards_config: { memearenaMin: 10, memearenaMax: 75, coins: [150, 280], xp: 150, shards: [6, 10], ticketChance: 0.5, tier: "special" },
  },
];

export const BOSSES_BY_ID: Record<string, Boss> = Object.fromEntries(
  BOSSES.map((b) => [b.id, b]),
);

export function getBoss(id: string): Boss | undefined {
  return BOSSES_BY_ID[id];
}

/** Boss Rush progression order. */
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
