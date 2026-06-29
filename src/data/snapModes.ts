import type { SnapModeId } from "@/types/snap";
import { BOSS_RUSH_ORDER } from "./snapBosses";

/**
 * SNAP-specific mode configuration. The meta-level mode card (entry gating,
 * description) lives in /data/modes.ts and drives the /play screen; this file
 * maps the mode to the opponent(s) a match should use. Single Arena mode for
 * now; PvP may replace the bot ladder later.
 */

/** Maps the mode to its opponent source (bot ladder until PvP exists). */
export function bossesForMode(_mode: SnapModeId): string[] {
  return BOSS_RUSH_ORDER;
}

export const SNAP_MAX_TURNS = 6;
export const SNAP_LOCATION_COUNT = 3;
export const SNAP_STARTING_HAND = 3;
export const SNAP_SLOTS_PER_SIDE = 4;
