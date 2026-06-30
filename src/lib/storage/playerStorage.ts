import type { RewardLedgerEntry, TokenClaim } from "@/types";
import { SNAP_CARDS, SNAP_FREE_STARTER_IDS, SNAP_DECK_SIZE } from "@/data/snapCards";
import { currentSeasonId, seasonReset } from "@/data/ranks";
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
// v3: replaced card pool with 15 meme cards; deck and ownedCards re-seeded.
// v4: card ownership — only the starter cards are unlocked; the rest unlock via
// mystery boxes. Re-seed ownedCards so the unlock state is applied.
// v5: new players own just 6 free cards; the rest are won in-game, bought, or
// pulled from boxes. Re-seed ownership + deck.
// v6: competitive ranks — add rankPoints / streaks / season + winsToday taper.
// v7: starter ownership is the full 12-card deck; min deck size is 12.
const SAVE_VERSION = 7;

export interface OwnedCardState {
  level: number;
  unlocked: boolean;
  cosmetic_frame_id: string | null;
}

export interface DailyState {
  dateKey: string;
  freeDailyBossUsed: boolean;
  freeSurvivalRunsUsed: number;
  easyWins: number;
  /** Wins so far today — drives the soft-currency (Coins) anti-inflation taper. */
  winsToday: number;
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
    coins: number;
    gems: number;
    /** Competitive ladder Rank Points (see data/ranks.ts). */
    rankPoints: number;
    /** Highest rankPoints reached this season (for season-end rewards). */
    peakRankPoints: number;
    /** Season the rankPoints belong to (monthly id, e.g. "2026-06"). */
    seasonId: string;
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
    /** Current win streak (resets on a loss). */
    currentStreak: number;
    /** Best win streak ever. */
    bestStreak: number;
  };
  lastBattleAt: number | null;
}

function freshDaily(): DailyState {
  return {
    dateKey: todayKey(),
    freeDailyBossUsed: false,
    freeSurvivalRunsUsed: 0,
    easyWins: 0,
    winsToday: 0,
    rewardsByMode: {},
    totalRewards: 0,
  };
}

export function createDefaultSave(): GameSave {
  const freeSet = new Set(SNAP_FREE_STARTER_IDS);
  const ownedCards: Record<string, OwnedCardState> = {};
  for (const card of SNAP_CARDS) {
    ownedCards[card.id] = {
      level: 1,
      unlocked: freeSet.has(card.id),
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
      coins: 100,
      gems: 0,
      rankPoints: 0,
      peakRankPoints: 0,
      seasonId: currentSeasonId(),
    },
    ownedCards,
    deck: [...SNAP_FREE_STARTER_IDS],
    defeatedBossIds: [],
    highestWave: 0,
    daily: freshDaily(),
    rewardLedger: [],
    claims: [],
    cosmeticsOwned: ["frame_default"],
    stats: { battlesPlayed: 0, wins: 0, losses: 0, lifetimeMemearena: 0, currentStreak: 0, bestStreak: 0 },
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
    // Roll over the competitive season: soft-reset RP and reset the peak.
    const season = currentSeasonId();
    if (parsed.profile.seasonId !== season) {
      parsed.profile.rankPoints = seasonReset(parsed.profile.rankPoints);
      parsed.profile.peakRankPoints = parsed.profile.rankPoints;
      parsed.profile.seasonId = season;
    }
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
  // v6→v7: grant the full 12-card starter set without wiping other unlocks.
  if (old.version === 6) {
    const base = createDefaultSave();
    const merged: GameSave = {
      ...base,
      ...old,
      version: SAVE_VERSION,
      profile: { ...base.profile, ...(old.profile ?? {}) },
      stats: { ...base.stats, ...(old.stats ?? {}) },
      daily: old.daily?.dateKey === todayKey() ? { ...base.daily, ...old.daily } : base.daily,
      ownedCards: { ...base.ownedCards, ...(old.ownedCards ?? {}) },
    };
    for (const id of SNAP_FREE_STARTER_IDS) {
      const oc = merged.ownedCards[id];
      if (oc) oc.unlocked = true;
      else merged.ownedCards[id] = { level: 1, unlocked: true, cosmetic_frame_id: null };
    }
    for (const card of SNAP_CARDS) {
      if (!merged.ownedCards[card.id]) {
        merged.ownedCards[card.id] = { level: 1, unlocked: false, cosmetic_frame_id: null };
      }
    }
    const owned = new Set(
      SNAP_CARDS.filter((c) => merged.ownedCards[c.id]?.unlocked).map((c) => c.id),
    );
    merged.deck = sanitizeDeck(old.deck, owned);
    return merged;
  }

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
    stats: { ...base.stats, ...(old.stats ?? {}) },
    daily: old.daily?.dateKey === todayKey() ? { ...base.daily, ...old.daily } : base.daily,
    // Force the SNAP card pool + deck (legacy ids/levels are dropped). Ownership
    // resets to the 12-card starter set; the deck is filtered to owned cards.
    ownedCards: base.ownedCards,
    deck: sanitizeDeck(old.deck, new Set(SNAP_FREE_STARTER_IDS)),
  };
  return merged;
}

/** Keep only valid, OWNED SNAP card ids, dedupe, pad with free cards, cap at 12. */
function sanitizeDeck(deck: string[] | undefined, owned: Set<string>): string[] {
  const valid = new Set(SNAP_CARDS.map((c) => c.id));
  const out: string[] = [];
  for (const id of deck ?? []) {
    if (valid.has(id) && owned.has(id) && !out.includes(id)) out.push(id);
  }
  for (const id of SNAP_FREE_STARTER_IDS) {
    if (out.length >= SNAP_DECK_SIZE) break;
    if (!out.includes(id)) out.push(id);
  }
  return out.slice(0, SNAP_DECK_SIZE);
}
