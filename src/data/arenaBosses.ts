import type { HazardEffect, HazardTheme, ArenaStatusType, ArenaRole } from "@/types/arena";

/**
 * Arena boss definitions. Each boss has a core HP pool, phase thresholds, and a
 * weighted cast cycle. The boss AI (arenaBossAI.ts) reads these to telegraph and
 * resolve lane hazards + minion waves. Core HP is derived from the legacy boss's
 * max_hp (scaled up for the longer real-time fights).
 */

export interface MinionSpec {
  cardId: string;
  role: ArenaRole;
  hp: number;
  damage: number;
  attackSpeed: number;
  moveSpeed: number;
  attackRange: number;
}

export type BossCast =
  | {
      kind: "hazard";
      id: string;
      name: string;
      weight: number;
      /** Lanes to target: "random", "all", "spread" (n distinct), or fixed list. */
      lanes: "random" | "all" | { spread: number };
      effect: HazardEffect;
      theme: HazardTheme;
      warningMs: number;
      activeMs: number;
      damagePerTick: number;
      tickMs: number;
      applyStatus?: ArenaStatusType;
      /** Fraction of the lane covered, anchored near player base. */
      coverage?: number;
      intent: string;
      /** Can be interrupted by a stun on the boss core proxy (Tung Tung). */
      interruptible?: boolean;
    }
  | {
      kind: "spawn";
      id: string;
      name: string;
      weight: number;
      lanes: "random" | "all" | { spread: number };
      count: number;
      minion: MinionSpec;
      intent: string;
    }
  | {
      kind: "buff";
      id: string;
      name: string;
      weight: number;
      /** Shield added to the boss core (acts as damage reduction buffer). */
      coreShield?: number;
      /** Heal the core. */
      heal?: number;
      intent: string;
    };

export interface ArenaBossDef {
  bossId: string;
  coreMaxHp: number;
  /** HP fraction thresholds that trigger phase escalation. */
  phaseThresholds: number[];
  /** Base ms between casts; shrinks with phase. */
  baseCastInterval: number;
  casts: BossCast[];
}

const weakBot: MinionSpec = {
  cardId: "_bot", role: "melee", hp: 28, damage: 6, attackSpeed: 1, moveSpeed: 12, attackRange: 6,
};
const scamMinion: MinionSpec = {
  cardId: "_scam", role: "melee", hp: 40, damage: 9, attackSpeed: 0.9, moveSpeed: 10, attackRange: 6,
};
const splasher: MinionSpec = {
  cardId: "_splash", role: "ranged", hp: 55, damage: 8, attackSpeed: 0.8, moveSpeed: 8, attackRange: 22,
};

export const ARENA_BOSSES: ArenaBossDef[] = [
  {
    bossId: "rug_pull_goblin",
    coreMaxHp: 1800,
    phaseThresholds: [0.5],
    baseCastInterval: 3570,
    casts: [
      {
        kind: "spawn", id: "scam_wave", name: "Scam Minions", weight: 3,
        lanes: "random", count: 1, minion: scamMinion,
        intent: "Spawning Scam Minions",
      },
      {
        kind: "hazard", id: "rug_zone", name: "Rug Zone", weight: 3,
        lanes: { spread: 1 }, effect: "drain", theme: "rug",
        warningMs: 1100, activeMs: 3500, damagePerTick: 4, tickMs: 500,
        applyStatus: "slow", coverage: 0.45,
        intent: "Rug Zone — drains energy in a lane",
      },
      {
        kind: "hazard", id: "lane_lock", name: "Lane Lock", weight: 1,
        lanes: { spread: 1 }, effect: "lock", theme: "rug",
        warningMs: 1300, activeMs: 5000, damagePerTick: 2, tickMs: 800,
        applyStatus: "slow", coverage: 1,
        intent: "Locking a lane!", interruptible: true,
      },
    ],
  },
  {
    bossId: "bot_swarm",
    coreMaxHp: 2280,
    phaseThresholds: [0.6, 0.3],
    baseCastInterval: 3060,
    casts: [
      {
        kind: "spawn", id: "bot_flood", name: "Bot Flood", weight: 4,
        lanes: { spread: 1 }, count: 3, minion: weakBot,
        intent: "Flooding a lane with bots",
      },
      {
        kind: "spawn", id: "bot_spread", name: "gm Spam", weight: 2,
        lanes: "all", count: 1, minion: weakBot,
        intent: "gm gm gm — bots in every lane",
      },
      {
        kind: "hazard", id: "ping", name: "Spam Ping", weight: 2,
        lanes: "random", effect: "splash", theme: "digital",
        warningMs: 900, activeMs: 600, damagePerTick: 14, tickMs: 600, coverage: 0.6,
        intent: "Spam Ping incoming",
      },
    ],
  },
  {
    bossId: "jeet_dragon",
    coreMaxHp: 1824,
    phaseThresholds: [0.5],
    baseCastInterval: 3230,
    casts: [
      {
        kind: "hazard", id: "candle_fire", name: "Red Candle Breath", weight: 4,
        lanes: { spread: 1 }, effect: "fire", theme: "fire",
        warningMs: 1100, activeMs: 1600, damagePerTick: 10, tickMs: 400,
        applyStatus: "burn", coverage: 1,
        intent: "Red Candle Breath down a lane",
      },
      {
        kind: "hazard", id: "panic_dive", name: "Panic Dive", weight: 2,
        lanes: "random", effect: "explosion", theme: "chart",
        warningMs: 800, activeMs: 500, damagePerTick: 26, tickMs: 500, coverage: 0.7,
        intent: "Panic Dive — sudden strike",
      },
      {
        kind: "spawn", id: "jeet_minions", name: "Paper Hands", weight: 2,
        lanes: "random", count: 2, minion: scamMinion,
        intent: "Summoning paper-hand minions",
      },
    ],
  },
  {
    bossId: "whale_lord",
    coreMaxHp: 2640,
    phaseThresholds: [0.6, 0.3],
    baseCastInterval: 3570,
    casts: [
      {
        kind: "hazard", id: "splash_wave", name: "Splash Wave", weight: 3,
        lanes: { spread: 2 }, effect: "splash", theme: "water",
        warningMs: 1200, activeMs: 900, damagePerTick: 18, tickMs: 450, coverage: 0.8,
        applyStatus: "slow",
        intent: "Splash Wave across two lanes",
      },
      {
        kind: "buff", id: "shield_wall", name: "Shield Wall", weight: 2,
        coreShield: 120, intent: "Raising a Shield Wall",
      },
      {
        kind: "spawn", id: "whale_guards", name: "Tide Guards", weight: 2,
        lanes: { spread: 2 }, count: 1, minion: splasher,
        intent: "Summoning Tide Guards",
      },
    ],
  },
  {
    bossId: "market_maker",
    coreMaxHp: 3360,
    phaseThresholds: [0.66, 0.33],
    baseCastInterval: 3060,
    casts: [
      {
        kind: "buff", id: "pump", name: "Pump Phase", weight: 2,
        coreShield: 90, heal: 40, intent: "Pump Phase — shields & heals",
      },
      {
        kind: "hazard", id: "dump", name: "Dump Phase", weight: 3,
        lanes: { spread: 2 }, effect: "explosion", theme: "chart",
        warningMs: 1000, activeMs: 700, damagePerTick: 30, tickMs: 700, coverage: 0.7,
        intent: "Dump Phase — liquidation beams",
      },
      {
        kind: "hazard", id: "stop_hunt", name: "Stop Hunt", weight: 2,
        lanes: "random", effect: "stun", theme: "chart",
        warningMs: 900, activeMs: 400, damagePerTick: 16, tickMs: 400,
        applyStatus: "stun", coverage: 1,
        intent: "Stop Hunt — targeting your stacked lane",
      },
      {
        kind: "spawn", id: "mm_bots", name: "MM Bots", weight: 2,
        lanes: "all", count: 1, minion: splasher,
        intent: "Deploying market-maker bots",
      },
    ],
  },
  {
    bossId: "pepe_the_ancient",
    coreMaxHp: 2520,
    phaseThresholds: [0.5],
    baseCastInterval: 3400,
    casts: [
      {
        kind: "buff", id: "ancient_shield", name: "Ancient Shield", weight: 3,
        coreShield: 110, intent: "Ancient Shield rising",
      },
      {
        kind: "buff", id: "rejuvenate", name: "Rejuvenate", weight: 2,
        heal: 70, intent: "Rejuvenate — healing the core",
      },
      {
        kind: "hazard", id: "chill_glyph", name: "Chill Glyph", weight: 3,
        lanes: { spread: 2 }, effect: "slow", theme: "energy",
        warningMs: 1200, activeMs: 2600, damagePerTick: 6, tickMs: 600,
        applyStatus: "slow", coverage: 0.9,
        intent: "Chill Glyph — slowing your units",
      },
    ],
  },
  {
    bossId: "moo_deng_rampage",
    coreMaxHp: 3000,
    phaseThresholds: [0.5, 0.2],
    baseCastInterval: 2890,
    casts: [
      {
        kind: "hazard", id: "stomp_charge", name: "Stomp Charge", weight: 4,
        lanes: { spread: 1 }, effect: "explosion", theme: "stomp",
        warningMs: 1000, activeMs: 700, damagePerTick: 28, tickMs: 700, coverage: 1,
        applyStatus: "stun",
        intent: "Charging down a lane!",
      },
      {
        kind: "buff", id: "harden", name: "Harden", weight: 3,
        coreShield: 100, intent: "Harden — shield grows",
      },
      {
        kind: "spawn", id: "calf", name: "Calf Stampede", weight: 1,
        lanes: { spread: 2 }, count: 2, minion: scamMinion,
        intent: "Calf Stampede",
      },
    ],
  },
  {
    bossId: "liquidity_vampire",
    coreMaxHp: 2352,
    phaseThresholds: [0.5],
    baseCastInterval: 3060,
    casts: [
      {
        kind: "hazard", id: "drain_tether", name: "Drain Tether", weight: 4,
        lanes: { spread: 2 }, effect: "drain", theme: "vampire",
        warningMs: 1000, activeMs: 3000, damagePerTick: 8, tickMs: 500,
        applyStatus: "slow", coverage: 1,
        intent: "Drain Tether — siphoning energy",
      },
      {
        kind: "buff", id: "lifesteal", name: "Lifesteal", weight: 2,
        heal: 60, intent: "Lifesteal — draining your lanes",
      },
      {
        kind: "hazard", id: "blood_moon", name: "Blood Moon", weight: 1,
        lanes: "all", effect: "explosion", theme: "vampire",
        warningMs: 1400, activeMs: 800, damagePerTick: 24, tickMs: 800, coverage: 0.6,
        intent: "BLOOD MOON — all lanes!",
      },
    ],
  },
];

export const ARENA_BOSSES_BY_ID: Record<string, ArenaBossDef> = Object.fromEntries(
  ARENA_BOSSES.map((b) => [b.bossId, b]),
);

export function getArenaBoss(bossId: string): ArenaBossDef | undefined {
  return ARENA_BOSSES_BY_ID[bossId];
}
