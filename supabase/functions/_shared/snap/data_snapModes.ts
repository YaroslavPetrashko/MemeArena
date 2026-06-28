// MIRROR of src/data/snapModes.ts — keep in sync.
import type { SnapModeId } from "./types.ts";
import { BOSS_RUSH_ORDER, DAILY_BOSS_ID, EVENT_BOSS_ID } from "./data_snapBosses.ts";

/**
 * SNAP-specific mode configuration. The meta-level mode cards (entry gating,
 * descriptions) still live in /data/modes.ts and drive the /play screen; this
 * file maps a mode to the boss(es) and special rules a SNAP match should use.
 */

export interface SurvivalRewardChoice {
  id: string;
  label: string;
  description: string;
  /** Engine effect applied to the next match in the run. */
  kind:
    | "add_temp_card"
    | "upgrade_card"
    | "score_multiplier"
    | "remove_weak_card"
    | "reveal_location_early"
    | "start_power_bonus";
}

/** The three reward picks offered between Survival matches (seeded subset). */
export const SURVIVAL_REWARD_POOL: SurvivalRewardChoice[] = [
  { id: "temp_gigachad", label: "Recruit GigaChad", description: "Add a temporary GigaChad to your deck for this run.", kind: "add_temp_card" },
  { id: "temp_whale", label: "Recruit Whale", description: "Add a temporary Whale to your deck for this run.", kind: "add_temp_card" },
  { id: "upgrade_random", label: "Sharpen a Card", description: "Upgrade one of your cards for this run.", kind: "upgrade_card" },
  { id: "score_x", label: "Greed Multiplier", description: "+25% score multiplier for the rest of the run.", kind: "score_multiplier" },
  { id: "trim", label: "Trim the Fat", description: "Remove your weakest card from this run's deck.", kind: "remove_weak_card" },
  { id: "scout", label: "Scout Ahead", description: "Reveal one location early next match.", kind: "reveal_location_early" },
  { id: "head_start", label: "Head Start", description: "Begin next match with +2 Power at a random location.", kind: "start_power_bonus" },
];

/** Maps a mode to its boss source. */
export function bossesForMode(mode: SnapModeId, survivalWave = 0): string[] {
  switch (mode) {
    case "boss_rush":
      return BOSS_RUSH_ORDER;
    case "daily_boss":
      return [DAILY_BOSS_ID];
    case "limited_event":
      return [EVENT_BOSS_ID];
    case "survival": {
      // Cycle through the rush ladder, getting harder each wave.
      const idx = survivalWave % BOSS_RUSH_ORDER.length;
      return [BOSS_RUSH_ORDER[idx]];
    }
    case "high_roller":
      return BOSS_RUSH_ORDER;
  }
}

/** Limited event modifiers (Brainrot Week). */
export const SNAP_ACTIVE_EVENT = {
  id: "brainrot_week",
  name: "Brainrot Week",
  bossId: EVENT_BOSS_ID,
  /** Brainrot-tagged cards get this flat Power bonus during the event. */
  brainrotPowerBonus: 1,
  durationDays: 7,
};

export const SNAP_MAX_TURNS = 6;
export const SNAP_LOCATION_COUNT = 3;
export const SNAP_STARTING_HAND = 3;
export const SNAP_SLOTS_PER_SIDE = 4;
