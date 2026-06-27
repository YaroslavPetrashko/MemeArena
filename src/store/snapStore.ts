"use client";

import { create } from "zustand";
import type { SnapMatchState, SnapModeId } from "@/types/snap";
import type { Reward } from "@/types";
import {
  createSnapMatch,
  startTurn,
  stagePlayerCard,
  unstagePlayerCard,
  endPlayerTurn,
  canPlayCard,
  remainingEnergy,
  apeIn,
} from "@/lib/game/snap/snapEngine";

/** A lightweight, immutable snapshot is stored; engine mutates a clone. */
function clone(state: SnapMatchState): SnapMatchState {
  return structuredClone(state);
}

export interface StartMatchArgs {
  matchId: string;
  mode: SnapModeId;
  bossId: string;
  seed: string;
  deck: { cardId: string; level: number }[];
  profileId: string;
  survivalWave?: number;
  isEvent?: boolean;
}

type Phase = "idle" | "staging" | "revealing" | "complete";

export interface SnapOutcome {
  reward: Reward;
  tokenReason: string;
  leveledUp: boolean;
  newLevel: number;
}

interface SnapStore {
  match: SnapMatchState | null;
  phase: Phase;
  /** Currently selected hand card (click-to-place flow). */
  selectedInstanceId: string | null;
  /** Drives invalid-move shake feedback on a location. */
  invalidLocationId: string | null;
  /** Set after the result has been applied to the profile/ledger once. */
  outcomeApplied: boolean;
  /** The computed reward outcome, stored here so the screen reads it reactively. */
  outcome: SnapOutcome | null;

  start: (args: StartMatchArgs) => void;
  select: (instanceId: string | null) => void;
  place: (locationId: string) => boolean;
  unstage: (instanceId: string) => void;
  endTurn: () => void;
  toggleApeIn: () => void;
  reset: () => void;
  setOutcome: (outcome: SnapOutcome) => void;

  // Derived helpers.
  energyLeft: () => number;
  canPlace: (instanceId: string, locationId: string) => boolean;
}

export const useSnapStore = create<SnapStore>((set, get) => ({
  match: null,
  phase: "idle",
  selectedInstanceId: null,
  invalidLocationId: null,
  outcomeApplied: false,
  outcome: null,

  start: (args) => {
    const match = createSnapMatch({ ...args, apeInAvailable: true });
    set({
      match,
      phase: match.status === "complete" ? "complete" : "staging",
      selectedInstanceId: null,
      invalidLocationId: null,
      outcomeApplied: false,
      outcome: null,
    });
  },

  select: (instanceId) => set({ selectedInstanceId: instanceId }),

  place: (locationId) => {
    const { match, selectedInstanceId } = get();
    if (!match || !selectedInstanceId) return false;
    if (!canPlayCard(match, selectedInstanceId, locationId).ok) {
      set({ invalidLocationId: locationId });
      setTimeout(() => set({ invalidLocationId: null }), 450);
      return false;
    }
    const next = clone(match);
    stagePlayerCard(next, selectedInstanceId, locationId);
    set({ match: next, selectedInstanceId: null });
    return true;
  },

  unstage: (instanceId) => {
    const { match } = get();
    if (!match) return;
    const next = clone(match);
    unstagePlayerCard(next, instanceId);
    set({ match: next });
  },

  endTurn: () => {
    const { match } = get();
    if (!match || match.status === "complete") return;
    set({ phase: "revealing" });
    const next = clone(match);
    endPlayerTurn(next);
    set({
      match: next,
      phase: next.status === "complete" ? "complete" : "staging",
      selectedInstanceId: null,
    });
  },

  toggleApeIn: () => {
    const { match } = get();
    if (!match) return;
    const next = clone(match);
    apeIn(next);
    set({ match: next });
  },

  reset: () =>
    set({
      match: null,
      phase: "idle",
      selectedInstanceId: null,
      invalidLocationId: null,
      outcomeApplied: false,
      outcome: null,
    }),

  setOutcome: (outcome) => set({ outcomeApplied: true, outcome }),

  energyLeft: () => {
    const { match } = get();
    return match ? remainingEnergy(match) : 0;
  },

  canPlace: (instanceId, locationId) => {
    const { match } = get();
    return match ? canPlayCard(match, instanceId, locationId).ok : false;
  },
}));

/** Re-export so UI doesn't reach into the engine directly. */
export { startTurn };
