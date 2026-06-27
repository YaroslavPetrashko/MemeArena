import type { RewardLedgerEntry, TokenClaim } from "@/types";
import { SNAP_CARDS, SNAP_STARTER_DECK_IDS, SNAP_DECK_SIZE } from "@/data/snapCards";
import { todayKey } from "@/lib/utils/format";

/**
 * Local-first persistence. This is the guest fallback/cache: the playable loop
 * works fully offline. When Supabase + a wallet are connected, sensitive writes
 * (rewards, claims, purchases) go through Edge Functions and this acts as a
 * cache/optimistic mirror.
 */
const STORAGE_KEY = "memearena:save:v1";
// v2: migrated from the legacy combat cards/8-card deck to the SNAP card pool
// and 12-card decks. Older saves are re-seeded with the SNAP pool on load.
const SAVE_VERSION = 2;

export interface OwnedCardState {
  level: number;
  shards: number;
  unlocked: boolean;
  cosmetic_frame_id: string | null;
}

export interface DailyState {
  dateKey: string;
  freeDailyBossUsed: boolean;
  freeSurvivalRunsUsed: number;
  easyWins: number;
  rewardsByMode: Record<string, number>;
  totalRewards: number;
}

export interface GameSave {
  version: number;
  profile: {
    id: string;
    username: string;
    walletAddress: string | null;
    avatarUrl: string | null;
    player_level: number;
    xp: number;
    coins: number;
    gems: number;
    arena_tickets: number;
    shards: number;
  };
  ownedCards: Record<string, OwnedCardState>;
  deck: string[];
  defeatedBossIds: string[];
  highestWave: number;
  daily: DailyState;
  rewardLedger: RewardLedgerEntry[];
  claims: TokenClaim[];
  cosmeticsOwned: string[];
  stats: {
    battlesPlayed: number;
    wins: number;
    losses: number;
    lifetimeMemearena: number;
  };
  lastBattleAt: number | null;
}

function freshDaily(): DailyState {
  return {
    dateKey: todayKey(),
    freeDailyBossUsed: false,
    freeSurvivalRunsUsed: 0,
    easyWins: 0,
    rewardsByMode: {},
    totalRewards: 0,
  };
}

export function createDefaultSave(): GameSave {
  const ownedCards: Record<string, OwnedCardState> = {};
  for (const card of SNAP_CARDS) {
    // MVP: all cards unlocked so deck-building is meaningful from the start.
    // (DB `owned_cards.unlocked` exists for a future gacha/unlock mechanic.)
    ownedCards[card.id] = {
      level: 1,
      shards: 0,
      unlocked: true,
      cosmetic_frame_id: null,
    };
  }
  return {
    version: SAVE_VERSION,
    profile: {
      id: `guest_${Math.random().toString(36).slice(2, 10)}`,
      username: "Anon Degen",
      walletAddress: null,
      avatarUrl: null,
      player_level: 1,
      xp: 0,
      coins: 100,
      gems: 0,
      arena_tickets: 0,
      shards: 0,
    },
    ownedCards,
    deck: [...SNAP_STARTER_DECK_IDS],
    defeatedBossIds: [],
    highestWave: 0,
    daily: freshDaily(),
    rewardLedger: [],
    claims: [],
    cosmeticsOwned: ["frame_default"],
    stats: { battlesPlayed: 0, wins: 0, losses: 0, lifetimeMemearena: 0 },
    lastBattleAt: null,
  };
}

export function loadSave(): GameSave {
  if (typeof window === "undefined") return createDefaultSave();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSave();
    const parsed = JSON.parse(raw) as GameSave;
    if (parsed.version !== SAVE_VERSION) return migrate(parsed);
    // Roll over daily limits if the day changed.
    if (parsed.daily.dateKey !== todayKey()) parsed.daily = freshDaily();
    return parsed;
  } catch {
    return createDefaultSave();
  }
}

export function saveSave(save: GameSave): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Storage full / disabled — ignore (in-memory state still works).
  }
}

export function resetSave(): GameSave {
  const fresh = createDefaultSave();
  saveSave(fresh);
  return fresh;
}

function migrate(old: Partial<GameSave>): GameSave {
  // Best-effort merge of an older save into the current default shape. The v1→v2
  // jump replaces the legacy combat card pool with the SNAP pool, so we always
  // re-seed ownedCards and rebuild a valid 12-card SNAP deck (keeping the
  // player's currencies, ledger, progression, etc.).
  const base = createDefaultSave();
  const merged: GameSave = {
    ...base,
    ...old,
    version: SAVE_VERSION,
    profile: { ...base.profile, ...(old.profile ?? {}) },
    daily: old.daily?.dateKey === todayKey() ? { ...base.daily, ...old.daily } : base.daily,
    // Force the SNAP card pool + deck (legacy ids/levels are dropped).
    ownedCards: base.ownedCards,
    deck: sanitizeDeck(old.deck),
  };
  return merged;
}

/** Keep only valid SNAP card ids, dedupe, and pad to exactly 12. */
function sanitizeDeck(deck: string[] | undefined): string[] {
  const valid = new Set(SNAP_CARDS.map((c) => c.id));
  const out: string[] = [];
  for (const id of deck ?? []) {
    if (valid.has(id) && !out.includes(id)) out.push(id);
  }
  for (const id of SNAP_STARTER_DECK_IDS) {
    if (out.length >= SNAP_DECK_SIZE) break;
    if (!out.includes(id)) out.push(id);
  }
  return out.slice(0, SNAP_DECK_SIZE);
}
