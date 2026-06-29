"use client";

import { useMemo } from "react";
import { create } from "zustand";
import {
  loadSave,
  saveSave,
  resetSave,
  createDefaultSave,
  type GameSave,
} from "@/lib/storage/playerStorage";
import type {
  CurrencyBalance,
  GameModeId,
  Reward,
  RewardLedgerEntry,
} from "@/types";
import type { SnapMatchState, SnapModeId } from "@/types/snap";
import { getNextSnapUpgrade, snapDeckPower } from "@/lib/game/snapUpgrades";
import { getUpgradeCost } from "@/data/upgrades";
import { getSnapCardDef, SNAP_CARDS, SNAP_DECK_SIZE } from "@/data/snapCards";
import { MYSTERY_BOX } from "@/data/shop";
import { getSnapBoss, bossDifficultyValue } from "@/data/snapBosses";
import { mapScoreToRewards, type RewardContext as SnapRewardContext } from "@/lib/game/snap/snapRewards";
import { ECONOMY_CONFIG } from "@/data/rewardEconomy";
import type { EntryMethod } from "@/lib/game/entryGates";

/** Pure derivation of currency balances from a save (no new identity churn). */
export function computeBalances(s: GameSave): CurrencyBalance {
  let pending = 0;
  let approved = 0;
  for (const r of s.rewardLedger) {
    if (r.currency !== "MEMEARENA" || r.claimed_at) continue;
    if (r.status === "approved") approved += r.amount;
    else if (r.status === "pending" || r.status === "review") pending += r.amount;
  }
  return {
    coins: s.profile.coins,
    gems: s.profile.gems,
    pendingMemearena: Math.round(pending * 100) / 100,
    approvedMemearena: Math.round(approved * 100) / 100,
    claimedMemearena: Math.round(s.stats.lifetimeMemearena * 100) / 100,
  };
}

export interface BattleOutcomeResult {
  reward: Reward;
  tokenReason: string;
  score: number;
}

/** Result of opening a mystery box: a newly-unlocked card, or coins if maxed. */
export type MysteryBoxResult =
  | { ok: false; reason: "gems" }
  | { ok: true; kind: "card"; cardId: string }
  | { ok: true; kind: "coins"; coins: number };

interface GameStore {
  save: GameSave;
  hydrated: boolean;

  hydrate: () => void;
  reset: () => void;
  _commit: (mut: (s: GameSave) => void) => void;

  balances: () => CurrencyBalance;
  isWalletConnected: () => boolean;

  setDeck: (cardIds: string[]) => void;
  linkWallet: (address: string) => void;
  disconnectWallet: () => void;
  setUsername: (name: string) => void;

  canEnterMode: (mode: GameModeId) => boolean;
  consumeEntry: (mode: GameModeId, method: EntryMethod) => boolean;

  applySnapOutcome: (
    match: SnapMatchState,
    opts: { entryType: "free" | "gems" },
  ) => BattleOutcomeResult;

  upgradeCard: (cardId: string) => { ok: boolean; reason?: string };
  creditGems: (amount: number) => void;
  openMysteryBox: () => MysteryBoxResult;
  applyClaim: (amount: number, signature: string) => void;

  deckPower: () => number;

  // Local dev helpers (for /admin/dev-tools only).
  devGrant: (g: Partial<{ coins: number; gems: number }>) => void;
  devMaxCards: () => void;
  devResetDaily: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  save: createDefaultSave(),
  hydrated: false,

  hydrate: () => {
    const save = loadSave();
    set({ save, hydrated: true });
  },

  reset: () => set({ save: resetSave() }),

  _commit: (mut) => {
    const next = structuredClone(get().save);
    mut(next);
    saveSave(next);
    set({ save: next });
  },

  balances: () => computeBalances(get().save),

  isWalletConnected: () => !!get().save.profile.walletAddress,

  setDeck: (cardIds) => get()._commit((s) => { s.deck = cardIds.slice(0, SNAP_DECK_SIZE); }),

  linkWallet: (address) =>
    get()._commit((s) => {
      s.profile.walletAddress = address;
      if (s.profile.username === "Anon Degen") {
        s.profile.username = `${address.slice(0, 4)}…${address.slice(-4)}`;
      }
    }),

  disconnectWallet: () => get()._commit((s) => { s.profile.walletAddress = null; }),

  setUsername: (name) => get()._commit((s) => { s.profile.username = name.slice(0, 24) || "Anon Degen"; }),

  // Unlock/entry checks live in entryGates + UI; kept for API completeness.
  canEnterMode: () => true,

  consumeEntry: (_mode, method) => {
    // Arena is free + unlimited.
    return method === "free";
  },

  applySnapOutcome: (match, opts) => {
    const s = get().save;
    const scoring = match.scoring;
    const mode = match.mode as SnapModeId;
    const boss = getSnapBoss(match.bossId);
    const walletConnected = !!s.profile.walletAddress;
    const modeCap = ECONOMY_CONFIG.caps.modeDaily[mode as GameModeId] ?? 25;
    const modeUsed = s.daily.rewardsByMode[mode] ?? 0;
    const walletDailyRemaining = Math.max(0, ECONOMY_CONFIG.caps.walletDaily - s.daily.totalRewards);

    // Easy-win anti-farm: decay after a threshold of easy wins.
    const easyWins = s.daily.easyWins;
    const antiFarm =
      easyWins > ECONOMY_CONFIG.diminishing.easyWinThreshold
        ? Math.max(
            ECONOMY_CONFIG.diminishing.minMultiplier,
            1 - (easyWins - ECONOMY_CONFIG.diminishing.easyWinThreshold) * ECONOMY_CONFIG.diminishing.decayPerWin,
          )
        : 1;

    const ctx: SnapRewardContext = {
      mode,
      difficultyValue: boss ? bossDifficultyValue(boss) : 1,
      walletConnected,
      antiFarm,
      caps: { walletDailyRemaining, modeDailyRemaining: Math.max(0, modeCap - modeUsed) },
    };

    const rewardOut = scoring
      ? mapScoreToRewards(scoring, ctx)
      : { coins: 0, gems: 0, memearena: 0, reason: "no_score" };
    const reward: Reward = {
      coins: rewardOut.coins,
      gems: rewardOut.gems,
      memearena: rewardOut.memearena,
    };
    const tokenReason = rewardOut.reason;
    const score = scoring?.total ?? 0;
    const won = scoring?.result === "win";

    get()._commit((d) => {
      d.profile.coins += reward.coins;
      d.profile.gems += reward.gems;

      d.stats.battlesPlayed += 1;
      if (won) d.stats.wins += 1; else d.stats.losses += 1;

      if (won && boss && !d.defeatedBossIds.includes(boss.id)) {
        d.defeatedBossIds.push(boss.id);
      }
      if (won && typeof boss?.difficulty === "number" && boss.difficulty <= 2) {
        d.daily.easyWins += 1;
      }

      if (reward.memearena > 0) {
        const now = new Date().toISOString();
        const entry: RewardLedgerEntry = {
          id: `rl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          profile_id: d.profile.id,
          battle_id: match.matchId,
          reward_type: "battle",
          currency: "MEMEARENA",
          amount: reward.memearena,
          // Optimistic local mirror: marked "pending" until the server replay
          // validates and approves (submit-snap-result). Never client-approved.
          status: "pending",
          reason: tokenReason,
          metadata: { mode, bossId: match.bossId, score, entryType: opts.entryType },
          created_at: now,
          approved_at: null,
          claimed_at: null,
        };
        d.rewardLedger.unshift(entry);
        d.daily.rewardsByMode[mode] = (d.daily.rewardsByMode[mode] ?? 0) + reward.memearena;
        d.daily.totalRewards += reward.memearena;
      }
      d.lastBattleAt = Date.now();
    });

    return { reward, tokenReason, score };
  },

  upgradeCard: (cardId) => {
    const s = get().save;
    const owned = s.ownedCards[cardId];
    const card = getSnapCardDef(cardId);
    if (!owned || !card) return { ok: false, reason: "not_owned" };
    const next = getNextSnapUpgrade(cardId, owned.level);
    if (!next) return { ok: false, reason: "max_level" };
    const cost = next.cost;
    if (s.profile.coins < cost.coins) return { ok: false, reason: "coins" };
    if (s.profile.gems < cost.gems) return { ok: false, reason: "gems" };

    get()._commit((d) => {
      d.profile.coins -= cost.coins;
      d.profile.gems -= cost.gems;
      d.ownedCards[cardId].level = next.toLevel;
    });
    return { ok: true };
  },

  creditGems: (amount) => get()._commit((d) => { d.profile.gems += amount; }),

  openMysteryBox: () => {
    const s = get().save;
    if (s.profile.gems < MYSTERY_BOX.costGems) return { ok: false, reason: "gems" };

    // Unlock a random not-yet-owned card; if everything is owned, pay Coins.
    const locked = SNAP_CARDS.filter((c) => !s.ownedCards[c.id]?.unlocked);
    if (locked.length === 0) {
      get()._commit((d) => {
        d.profile.gems -= MYSTERY_BOX.costGems;
        d.profile.coins += MYSTERY_BOX.consolationCoins;
      });
      return { ok: true, kind: "coins", coins: MYSTERY_BOX.consolationCoins };
    }

    const pick = locked[Math.floor(Math.random() * locked.length)];
    get()._commit((d) => {
      d.profile.gems -= MYSTERY_BOX.costGems;
      const existing = d.ownedCards[pick.id];
      if (existing) existing.unlocked = true;
      else d.ownedCards[pick.id] = { level: 1, unlocked: true, cosmetic_frame_id: null };
    });
    return { ok: true, kind: "card", cardId: pick.id };
  },

  applyClaim: (amount, signature) =>
    get()._commit((d) => {
      const now = new Date().toISOString();
      for (const r of d.rewardLedger) {
        if (r.currency === "MEMEARENA" && r.status === "approved" && !r.claimed_at) {
          r.status = "claimed";
          r.claimed_at = now;
        }
      }
      d.claims.unshift({
        id: `claim_${Date.now()}`,
        profile_id: d.profile.id,
        wallet_address: d.profile.walletAddress ?? "",
        amount,
        status: "completed",
        transaction_signature: signature,
        created_at: now,
        completed_at: now,
      });
      d.stats.lifetimeMemearena += amount;
    }),

  deckPower: () => {
    const s = get().save;
    return snapDeckPower(s.deck.map((id) => ({ card_id: id, level: s.ownedCards[id]?.level ?? 1 })));
  },

  devGrant: (g) =>
    get()._commit((d) => {
      d.profile.coins += g.coins ?? 0;
      d.profile.gems += g.gems ?? 0;
    }),

  devMaxCards: () =>
    get()._commit((d) => {
      for (const id of Object.keys(d.ownedCards)) d.ownedCards[id].level = 5;
    }),

  devResetDaily: () =>
    get()._commit((d) => {
      d.daily.freeDailyBossUsed = false;
      d.daily.freeSurvivalRunsUsed = 0;
      d.daily.easyWins = 0;
      d.daily.rewardsByMode = {};
      d.daily.totalRewards = 0;
    }),
}));

/**
 * Memoized balances hook. IMPORTANT: never call `useGameStore((s) => s.balances())`
 * directly — `balances()` returns a fresh object each call, which breaks the
 * store snapshot caching (infinite-loop warning). Select the raw `save` and
 * memoize instead.
 */
export function useBalances(): CurrencyBalance {
  const save = useGameStore((s) => s.save);
  return useMemo(() => computeBalances(save), [save]);
}

/** Helper: upgrade cost for a card at its current level (or null if maxed). */
export function upgradeCostFor(cardId: string, level: number) {
  const card = getSnapCardDef(cardId);
  if (!card || level >= 5) return null;
  return getUpgradeCost(level + 1);
}
