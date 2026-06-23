"use client";

import { create } from "zustand";
import type { ArenaBattleState, Lane } from "@/types/arena";
import {
  createArenaBattle,
  tickArenaBattle,
  deployCard,
  activateHype,
  chooseWaveReward,
  endArenaBattle,
  type CreateArenaArgs,
} from "@/lib/game/arenaEngine";

/**
 * Real-time arena store. The engine mutates a single state object in place; this
 * store owns the rAF loop and bumps `frame` so subscribed components re-render.
 * Simulation runs at a fixed timestep (accumulator) for determinism while the
 * render frequency follows the display refresh rate.
 */
const SIM_STEP_MS = 50; // 20 ticks/sec
const MAX_STEPS_PER_FRAME = 6;

interface ArenaStore {
  state: ArenaBattleState | null;
  /** Monotonic render counter (engine mutates in place). */
  frame: number;
  running: boolean;
  /** Currently selected hand card uid (deploy-then-tap-lane flow). */
  selectedUid: string | null;
  /** Internal loop handles. */
  _raf: number | null;
  _last: number;
  _acc: number;

  start: (args: CreateArenaArgs) => void;
  selectCard: (uid: string | null) => void;
  deployToLane: (lane: Lane) => boolean;
  useHype: () => void;
  pickWaveReward: (choice: "energy" | "heal" | "hype") => void;
  forceEnd: (outcome: "won" | "lost") => void;
  clear: () => void;
  _loop: (now: number) => void;
}

export const useArenaStore = create<ArenaStore>((set, get) => ({
  state: null,
  frame: 0,
  running: false,
  selectedUid: null,
  _raf: null,
  _last: 0,
  _acc: 0,

  start: (args) => {
    const prev = get()._raf;
    if (prev != null && typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(prev);
    const state = createArenaBattle(args);
    set({ state, frame: 0, running: true, selectedUid: null, _last: performance.now(), _acc: 0 });
    const raf = requestAnimationFrame((t) => get()._loop(t));
    set({ _raf: raf });
  },

  _loop: (now) => {
    const s = get();
    if (!s.state || !s.running) return;
    let acc = s._acc + (now - s._last);
    let steps = 0;
    while (acc >= SIM_STEP_MS && steps < MAX_STEPS_PER_FRAME) {
      tickArenaBattle(s.state, SIM_STEP_MS);
      acc -= SIM_STEP_MS;
      steps += 1;
    }
    // Drop leftover backlog if we hit the cap (tab was backgrounded).
    if (steps >= MAX_STEPS_PER_FRAME) acc = 0;

    const ended = s.state.status === "won" || s.state.status === "lost";
    set({ _last: now, _acc: acc, frame: s.frame + 1, running: !ended });

    if (!ended) {
      const raf = requestAnimationFrame((t) => get()._loop(t));
      set({ _raf: raf });
    } else {
      set({ _raf: null });
    }
  },

  selectCard: (uid) => set({ selectedUid: get().selectedUid === uid ? null : uid }),

  deployToLane: (lane) => {
    const s = get();
    if (!s.state || !s.selectedUid) return false;
    const res = deployCard(s.state, s.selectedUid, lane);
    if (res.ok) {
      set({ selectedUid: null, frame: s.frame + 1 });
      return true;
    }
    // Keep selection so the player can retry; bump frame for shake feedback.
    set({ frame: s.frame + 1 });
    return false;
  },

  useHype: () => {
    const s = get();
    if (!s.state) return;
    activateHype(s.state);
    set({ frame: s.frame + 1 });
  },

  pickWaveReward: (choice) => {
    const s = get();
    if (!s.state) return;
    chooseWaveReward(s.state, choice);
    // Resume the loop if it paused on the wave-choice gate.
    set({ frame: s.frame + 1, running: true, _last: performance.now(), _acc: 0 });
    if (s._raf == null) {
      const raf = requestAnimationFrame((t) => get()._loop(t));
      set({ _raf: raf });
    }
  },

  forceEnd: (outcome) => {
    const s = get();
    if (!s.state) return;
    endArenaBattle(s.state, outcome);
    if (s._raf != null && typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(s._raf);
    set({ running: false, _raf: null, frame: s.frame + 1 });
  },

  clear: () => {
    const s = get();
    if (s._raf != null && typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(s._raf);
    set({ state: null, frame: 0, running: false, selectedUid: null, _raf: null });
  },
}));
