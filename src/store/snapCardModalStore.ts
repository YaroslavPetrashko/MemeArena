"use client";

import { create } from "zustand";

/** Global SNAP card-detail modal: any card click opens it. */
interface SnapCardModalStore {
  cardId: string | null;
  open: (cardId: string) => void;
  close: () => void;
}

export const useSnapCardModal = create<SnapCardModalStore>((set) => ({
  cardId: null,
  open: (cardId) => set({ cardId }),
  close: () => set({ cardId: null }),
}));
