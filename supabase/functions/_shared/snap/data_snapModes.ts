// MIRROR of src/data/snapModes.ts — keep in sync.
import type { SnapModeId } from "./types.ts";
import { BOSS_RUSH_ORDER } from "./data_snapBosses.ts";

/**
 * SNAP-specific mode configuration. Single Arena mode for now (PvP may replace
 * the bot ladder later); maps the mode to the opponent source.
 */

/** Maps the mode to its opponent source (bot ladder until PvP exists). */
export function bossesForMode(_mode: SnapModeId): string[] {
  return BOSS_RUSH_ORDER;
}

export const SNAP_MAX_TURNS = 6;
export const SNAP_LOCATION_COUNT = 3;
export const SNAP_STARTING_HAND = 3;
export const SNAP_SLOTS_PER_SIDE = 4;
