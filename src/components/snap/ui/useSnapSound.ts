"use client";

import { useCallback } from "react";

/**
 * Sound event hooks for the SNAP battle scene. This is a no-op implementation
 * (no audio assets are bundled yet) so call sites can be wired now and real
 * audio dropped in later by registering buffers in SOUND_SRC and decoding them.
 *
 *   const sound = useSnapSound();
 *   sound.play("cardReveal");
 */
export type SnapSoundId =
  | "cardHover"
  | "cardPlay"
  | "cardReveal"
  | "abilityTrigger"
  | "locationReveal"
  | "powerChange"
  | "endTurn"
  | "win"
  | "loss"
  | "buttonPress"
  | "invalid";

/** Map of sound id -> asset path. Empty for now (silent placeholder). */
const SOUND_SRC: Partial<Record<SnapSoundId, string>> = {};

export interface SnapSound {
  play: (id: SnapSoundId) => void;
}

export function useSnapSound(): SnapSound {
  const play = useCallback((id: SnapSoundId) => {
    const src = SOUND_SRC[id];
    if (!src || typeof window === "undefined") return;
    try {
      const audio = new Audio(src);
      audio.volume = 0.4;
      void audio.play().catch(() => {});
    } catch {
      /* silent — audio is best-effort */
    }
  }, []);

  return { play };
}
