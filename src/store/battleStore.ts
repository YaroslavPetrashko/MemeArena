"use client";

import { create } from "zustand";
import type { BattleState } from "@/types";
import {
  initBattle,
  playCard,
  endTurn,
  advanceWave,
  type InitBattleArgs,
} from "@/lib/game/battleEngine";
import type { BattleFx } from "@/lib/game/cardEffects";

export interface FxEvent extends BattleFx {
  id: string;
}

interface BattleStore {
  state: BattleState | null;
  /** Most recent FX batch (for transient animations). */
  fx: FxEvent[];
  /** Combo banners awaiting display. */
  banners: string[];
  /** Monotonic tick to force re-render after in-place engine mutations. */
  tick: number;
  busy: boolean;

  start: (args: InitBattleArgs) => void;
  play: (uid: string) => void;
  end: () => void;
  nextWave: () => void;
  clearBanner: () => void;
  clear: () => void;
}

let fxCounter = 0;
function tagFx(fx: BattleFx[]): FxEvent[] {
  return fx.map((f) => ({ ...f, id: `fx_${fxCounter++}` }));
}

export const useBattleStore = create<BattleStore>((set, get) => ({
  state: null,
  fx: [],
  banners: [],
  tick: 0,
  busy: false,

  start: (args) => {
    const state = initBattle(args);
    set({ state, fx: [], banners: [], tick: get().tick + 1, busy: false });
  },

  play: (uid) => {
    const state = get().state;
    if (!state || state.result !== "ongoing") return;
    const res = playCard(state, uid);
    if (!res.ok) return;
    set({
      state: { ...state },
      fx: tagFx(res.fx),
      banners: [...get().banners, ...res.banners],
      tick: get().tick + 1,
    });
  },

  end: () => {
    const state = get().state;
    if (!state || state.result !== "ongoing") return;
    set({ busy: true });
    const res = endTurn(state);
    set({
      state: { ...state },
      fx: tagFx(res.fx),
      tick: get().tick + 1,
      busy: false,
    });
  },

  nextWave: () => {
    const state = get().state;
    if (!state) return;
    set({ state: advanceWave(state), fx: [], banners: [], tick: get().tick + 1 });
  },

  clearBanner: () => set({ banners: get().banners.slice(1) }),

  clear: () => set({ state: null, fx: [], banners: [], busy: false }),
}));
