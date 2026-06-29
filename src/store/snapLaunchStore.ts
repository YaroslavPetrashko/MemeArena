"use client";

import { create } from "zustand";
import type { SnapModeId } from "@/types/snap";

/** Pending match config handed from the /play screen to /battle. */
export interface SnapLaunchConfig {
  mode: SnapModeId;
  bossId: string;
  deck: { cardId: string; level: number }[];
  entryType: "free" | "gems";
}

interface SnapLaunchStore {
  config: SnapLaunchConfig | null;
  setConfig: (c: SnapLaunchConfig) => void;
  clear: () => void;
}

export const useSnapLaunch = create<SnapLaunchStore>((set) => ({
  config: null,
  setConfig: (config) => set({ config }),
  clear: () => set({ config: null }),
}));
