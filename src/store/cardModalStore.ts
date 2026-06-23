"use client";

import { create } from "zustand";

/** Global card-profile modal: any card click opens it. */
interface CardModalStore {
  cardId: string | null;
  open: (cardId: string) => void;
  close: () => void;
}

export const useCardModal = create<CardModalStore>((set) => ({
  cardId: null,
  open: (cardId) => set({ cardId }),
  close: () => set({ cardId: null }),
}));
