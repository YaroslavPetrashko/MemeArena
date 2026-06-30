"use client";

import { create } from "zustand";
import type { SnapMatchState, SnapStagedPlay } from "@/types/snap";
import { canPlayCard } from "@/lib/game/snap/snapEngine";
import { viewFromSide, type PvpSide } from "@/lib/game/snap/pvpView";
import {
  joinQueue,
  cancelQueue,
  submitTurn,
  subscribeMatch,
  type PvpMatch,
  type PvpTurnAction,
  type PvpDeckCard,
} from "@/lib/api/pvp";

type Phase = "idle" | "searching" | "playing" | "complete";

interface PvpStore {
  guestId: string;
  username: string;
  phase: Phase;
  match: PvpMatch | null;
  mySide: PvpSide;
  /** Authoritative snapshot from the server (player A = "player" side). */
  synced: SnapMatchState | null;
  /** My staged plays this turn (not yet submitted). */
  localStaged: PvpTurnAction[];
  /** True once I've submitted and am waiting for my opponent. */
  submitted: boolean;
  /** Internal: realtime unsubscribe + matchmaking poll timer. */
  _unsub: (() => void) | null;
  _poll: ReturnType<typeof setTimeout> | null;

  /** Board from MY perspective with my staged cards applied (for rendering). */
  displayState: () => SnapMatchState | null;
  /** Energy I have left this turn. */
  energyLeft: () => number;

  findMatch: (guestId: string, username: string, deck: PvpDeckCard[]) => void;
  stage: (instanceId: string, locationId: string) => boolean;
  unstage: (instanceId: string) => void;
  submit: () => Promise<void>;
  leave: () => void;
}

/** Build SnapStagedPlay[] (owner "player") from my local staged actions. */
function toStagedPlays(view: SnapMatchState, local: PvpTurnAction[]): SnapStagedPlay[] {
  return local.map((p, i) => ({
    instanceId: p.instanceId,
    cardId: view.player.hand.find((c) => c.instanceId === p.instanceId)?.cardId ?? "",
    locationId: p.locationId,
    owner: "player" as const,
    orderIndex: i,
  }));
}

export const usePvpStore = create<PvpStore>((set, get) => ({
  guestId: "",
  username: "Guest",
  phase: "idle",
  match: null,
  mySide: "player",
  synced: null,
  localStaged: [],
  submitted: false,
  _unsub: null,
  _poll: null,

  displayState: () => {
    const { synced, mySide, localStaged } = get();
    if (!synced) return null;
    const view = viewFromSide(synced, mySide);
    view.stagedPlays = toStagedPlays(view, localStaged);
    return view;
  },

  energyLeft: () => {
    const view = get().displayState();
    if (!view) return 0;
    const staged = view.stagedPlays.reduce((sum, sp) => {
      const card = view.player.hand.find((c) => c.instanceId === sp.instanceId);
      const loc = view.locations.find((l) => l.id === sp.locationId);
      if (!card || !loc) return sum;
      return sum + Math.max(0, card.cost + (loc.effectId === "gasWar" ? 1 : 0));
    }, 0);
    return view.player.energy - staged;
  },

  findMatch: (guestId, username, deck) => {
    set({ guestId, username, phase: "searching", match: null, synced: null, localStaged: [], submitted: false });

    const poll = async () => {
      if (get().phase !== "searching") return;
      const res = await joinQueue(guestId, username, deck);
      if (get().phase !== "searching") return; // cancelled while awaiting
      if (res.matched && res.match) {
        setMatchFromServer(set, get, res.match);
        return;
      }
      const t = setTimeout(poll, 2500);
      set({ _poll: t });
    };
    void poll();
  },

  stage: (instanceId, locationId) => {
    const { synced, mySide, localStaged, submitted } = get();
    if (!synced || submitted) return false;
    const view = viewFromSide(synced, mySide);
    view.stagedPlays = toStagedPlays(view, localStaged);
    // Slot guard counts both committed and already-staged cards at the lane.
    const loc = view.locations.find((l) => l.id === locationId);
    if (!loc) return false;
    const stagedHere = localStaged.filter((p) => p.locationId === locationId).length;
    if (loc.playerCards.length + stagedHere >= loc.maxSlotsPerSide) return false;
    if (!canPlayCard(view, instanceId, locationId).ok) return false;
    set({ localStaged: [...localStaged, { instanceId, locationId, orderIndex: localStaged.length }] });
    return true;
  },

  unstage: (instanceId) => {
    const { localStaged } = get();
    set({
      localStaged: localStaged
        .filter((p) => p.instanceId !== instanceId)
        .map((p, i) => ({ ...p, orderIndex: i })),
    });
  },

  submit: async () => {
    const { match, guestId, localStaged, submitted } = get();
    if (!match || submitted) return;
    set({ submitted: true });
    await submitTurn(match.id, guestId, match.current_turn, localStaged);
    // The authoritative new board arrives via Realtime (onMatchUpdate).
  },

  leave: () => {
    const { _unsub, _poll, guestId } = get();
    _unsub?.();
    if (_poll) clearTimeout(_poll);
    if (guestId) void cancelQueue(guestId);
    set({ phase: "idle", match: null, synced: null, localStaged: [], submitted: false, _unsub: null, _poll: null });
  },
}));

/** Wire a freshly-matched match: set perspective, snapshot, and Realtime sub. */
function setMatchFromServer(
  set: (partial: Partial<PvpStore>) => void,
  get: () => PvpStore,
  match: PvpMatch,
) {
  const { guestId } = get();
  const mySide: PvpSide = match.player_a === guestId ? "player" : "boss";
  get()._unsub?.();
  const unsub = subscribeMatch(match.id, (m) => onMatchUpdate(set, get, m));
  set({
    match,
    mySide,
    synced: match.state,
    localStaged: [],
    submitted: false,
    phase: match.status === "complete" ? "complete" : "playing",
    _unsub: unsub,
  });
}

/** Apply an authoritative match update from Realtime. */
function onMatchUpdate(
  set: (partial: Partial<PvpStore>) => void,
  get: () => PvpStore,
  m: PvpMatch,
) {
  const prev = get().match;
  const turnAdvanced = !prev || m.current_turn !== prev.current_turn || m.status !== prev.status;
  set({
    match: m,
    synced: m.state ?? get().synced,
    ...(turnAdvanced ? { localStaged: [], submitted: false } : {}),
    phase: m.status === "complete" ? "complete" : "playing",
  });
}
