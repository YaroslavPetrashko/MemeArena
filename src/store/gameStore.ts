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
  BattleState,
  CurrencyBalance,
  GameModeId,
  Reward,
  RewardLedgerEntry,
} from "@/types";
import { computeBattleReward, type RewardContext } from "@/lib/game/rewards";
import { computeScore } from "@/lib/game/scoring";
import { getNextUpgrade, deckPower } from "@/lib/game/upgrades";
import { getUpgradeCost } from "@/data/upgrades";
import { getCard } from "@/data/cards";
import { getBoss } from "@/data/bosses";
import { ECONOMY_CONFIG } from "@/data/rewardEconomy";
import type { EntryMethod } from "@/lib/game/entryGates";

const XP_PER_LEVEL = 200;
const MAX_LEVEL = 30;

function levelForXp(xp: number): number {
  return Math.min(MAX_LEVEL, 1 + Math.floor(xp / XP_PER_LEVEL));
}

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
    shards: s.profile.shards,
    arena_tickets: s.profile.arena_tickets,
    xp: s.profile.xp,
    pendingMemearena: Math.round(pending * 100) / 100,
    approvedMemearena: Math.round(approved * 100) / 100,
    claimedMemearena: Math.round(s.stats.lifetimeMemearena * 100) / 100,
  };
}

export interface BattleOutcomeResult {
  reward: Reward;
  tokenReason: string;
  score: number;
  leveledUp: boolean;
  newLevel: number;
}

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

  applyBattleOutcome: (battle: BattleState, ctx: Omit<RewardContext, "walletConnected" | "easyWinsToday" | "walletDailyRemaining" | "walletWeeklyRemaining" | "modeDailyRemaining">) => BattleOutcomeResult;

  upgradeCard: (cardId: string) => { ok: boolean; reason?: string };
  creditGems: (amount: number) => void;
  buyTickets: (gemsCost: number, ticketAmount: number) => boolean;
  applyClaim: (amount: number, signature: string) => void;

  deckPower: () => number;

  // Local dev helpers (for /admin/dev-tools only).
  devGrant: (g: Partial<{ coins: number; gems: number; shards: number; tickets: number; xp: number }>) => void;
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

  setDeck: (cardIds) => get()._commit((s) => { s.deck = cardIds.slice(0, 8); }),

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

  consumeEntry: (mode, method) => {
    const s = get().save;
    if (method === "free") {
      // free always allowed here; daily caps handled by entryGates UI
      get()._commit((d) => {
        if (mode === "daily_boss") d.daily.freeDailyBossUsed = true;
        if (mode === "survival") d.daily.freeSurvivalRunsUsed += 1;
      });
      return true;
    }
    if (method === "ticket") {
      const cost = mode === "limited_event" ? 3 : mode === "high_roller" ? 10 : 1;
      if (s.profile.arena_tickets < cost) return false;
      get()._commit((d) => { d.profile.arena_tickets -= cost; });
      return true;
    }
    if (method === "gems") {
      const cost = mode === "daily_boss" ? 25 : mode === "survival" ? 15 : mode === "limited_event" ? 75 : 250;
      if (s.profile.gems < cost) return false;
      get()._commit((d) => { d.profile.gems -= cost; });
      return true;
    }
    return false;
  },

  applyBattleOutcome: (battle, ctxBase) => {
    const s = get().save;
    const walletConnected = !!s.profile.walletAddress;
    const modeCap = ECONOMY_CONFIG.caps.modeDaily[battle.mode] ?? 25;
    const modeUsed = s.daily.rewardsByMode[battle.mode] ?? 0;
    const walletDailyRemaining = Math.max(0, ECONOMY_CONFIG.caps.walletDaily - s.daily.totalRewards);

    const ctx: RewardContext = {
      ...ctxBase,
      walletConnected,
      easyWinsToday: s.daily.easyWins,
      walletDailyRemaining,
      walletWeeklyRemaining: ECONOMY_CONFIG.caps.walletWeekly,
      modeDailyRemaining: Math.max(0, modeCap - modeUsed),
    };

    const { reward, tokenReason } = computeBattleReward(battle, ctx);
    const score = computeScore(battle).total;
    const won = battle.result === "win";
    const boss = getBoss(battle.bossId);
    const oldLevel = s.profile.player_level;

    get()._commit((d) => {
      d.profile.coins += reward.coins;
      d.profile.xp += reward.xp;
      d.profile.shards += reward.shards;
      d.profile.arena_tickets += reward.tickets;
      d.profile.player_level = levelForXp(d.profile.xp);

      d.stats.battlesPlayed += 1;
      if (won) d.stats.wins += 1; else d.stats.losses += 1;

      if (won && battle.mode === "boss_rush" && boss && !d.defeatedBossIds.includes(boss.id)) {
        d.defeatedBossIds.push(boss.id);
      }
      if (battle.mode === "survival" && (battle.wave ?? 0) > d.highestWave) {
        d.highestWave = battle.wave ?? 0;
      }
      if (won && battle.mode === "boss_rush" && typeof boss?.difficulty === "number" && boss.difficulty <= 2) {
        d.daily.easyWins += 1;
      }

      if (reward.memearena > 0) {
        const now = new Date().toISOString();
        const entry: RewardLedgerEntry = {
          id: `rl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          profile_id: d.profile.id,
          battle_id: battle.battleId,
          reward_type: "battle",
          currency: "MEMEARENA",
          amount: reward.memearena,
          // Local validation approves immediately for connected wallets; a real
          // backend would mark "pending" until the Edge Function validates.
          status: "approved",
          reason: tokenReason,
          metadata: { mode: battle.mode, bossId: battle.bossId, score },
          created_at: now,
          approved_at: now,
          claimed_at: null,
        };
        d.rewardLedger.unshift(entry);
        d.daily.rewardsByMode[battle.mode] = (d.daily.rewardsByMode[battle.mode] ?? 0) + reward.memearena;
        d.daily.totalRewards += reward.memearena;
      }
      d.lastBattleAt = Date.now();
    });

    const newLevel = get().save.profile.player_level;
    return { reward, tokenReason, score, leveledUp: newLevel > oldLevel, newLevel };
  },

  upgradeCard: (cardId) => {
    const s = get().save;
    const owned = s.ownedCards[cardId];
    const card = getCard(cardId);
    if (!owned || !card) return { ok: false, reason: "not_owned" };
    const next = getNextUpgrade({ level: owned.level, card_id: cardId });
    if (!next) return { ok: false, reason: "max_level" };
    const cost = next.cost;
    if (s.profile.coins < cost.coins) return { ok: false, reason: "coins" };
    if (s.profile.shards < cost.shards) return { ok: false, reason: "shards" };
    if (s.profile.gems < cost.gems) return { ok: false, reason: "gems" };

    get()._commit((d) => {
      d.profile.coins -= cost.coins;
      d.profile.shards -= cost.shards;
      d.profile.gems -= cost.gems;
      d.ownedCards[cardId].level = next.toLevel;
    });
    return { ok: true };
  },

  creditGems: (amount) => get()._commit((d) => { d.profile.gems += amount; }),

  buyTickets: (gemsCost, ticketAmount) => {
    if (get().save.profile.gems < gemsCost) return false;
    get()._commit((d) => {
      d.profile.gems -= gemsCost;
      d.profile.arena_tickets += ticketAmount;
    });
    return true;
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
    return deckPower(s.deck.map((id) => ({ card_id: id, level: s.ownedCards[id]?.level ?? 1 })));
  },

  devGrant: (g) =>
    get()._commit((d) => {
      d.profile.coins += g.coins ?? 0;
      d.profile.gems += g.gems ?? 0;
      d.profile.shards += g.shards ?? 0;
      d.profile.arena_tickets += g.tickets ?? 0;
      if (g.xp) {
        d.profile.xp += g.xp;
        d.profile.player_level = levelForXp(d.profile.xp);
      }
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
  const card = getCard(cardId);
  if (!card || level >= 5) return null;
  return getUpgradeCost(level + 1, card.rarity);
}
