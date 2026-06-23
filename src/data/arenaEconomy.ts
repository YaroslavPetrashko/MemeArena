import type { GameModeId } from "@/types";

/** Tunable arena constants. Kept in data so balance lives outside engine code. */
export const ARENA_CONFIG = {
  maxEnergy: 10,
  startEnergy: 3,
  /** Energy regenerated per second (1 every 1.2s). */
  energyRegenPerSec: 1 / 1.2,

  /** Player base HP (the bottom core enemies attack). */
  playerBaseHp: 1000,

  /** Hand: 4 active cards drawn from an 8-card cycling deck. */
  handSize: 4,
  /** Deploy cooldown applied to a card after it's played (ms). */
  deployCooldownMs: 700,

  /** Players may only deploy in the lower fraction of the arena. */
  deployZoneMax: 42, // position 0–42 is friendly deploy territory

  /** Lane unit caps for readability. */
  maxPlayerUnitsPerLane: 5,
  maxTotalUnits: 28,

  /** Hype gained per energy spent and per boss-damage point. */
  hypePerEnergy: 2.2,
  hypePerBossDamage: 0.06,
  hypeMax: 100,

  /** Survival pacing. */
  survival: {
    waveIntervalMs: 18000,
    rewardEveryWaves: 3,
    bossMiniWaveEvery: 5,
    minWaveForTokens: 5,
  },
} as const;

/** Per-mode time limit (ms). 0 = until win/loss. */
export const ARENA_TIME_LIMIT: Record<GameModeId, number> = {
  boss_rush: 0,
  daily_boss: 90_000,
  survival: 0,
  limited_event: 150_000,
  high_roller: 0,
};

/** Spawn lanes are positions 0..100; these are the base anchors. */
export const PLAYER_BASE_POS = 0;
export const BOSS_BASE_POS = 100;
