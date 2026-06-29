"use client";

import { useState } from "react";
import { Pencil, Check, Trophy, Swords, Skull, Waves, Trash2, Lock, Sparkles, Flame } from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletButton } from "@/components/layout/WalletButton";
import { useGameStore, useBalances } from "@/store/gameStore";
import { useMounted } from "@/hooks/useMounted";
import { UNLOCKS_BY_LEVEL } from "@/data/modes";
import { COSMETIC_FRAMES } from "@/data/cosmetics";
import { rankForRp, rankLabel } from "@/data/ranks";
import { formatToken } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export default function ProfilePage() {
  const mounted = useMounted();
  const save = useGameStore((s) => s.save);
  const balances = useBalances();
  const setUsername = useGameStore((s) => s.setUsername);
  const reset = useGameStore((s) => s.reset);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(save.profile.username);
  const [confirmReset, setConfirmReset] = useState(false);

  const games = save.stats.battlesPlayed;
  const winRate = games ? Math.round((save.stats.wins / games) * 100) : 0;

  const rank = rankForRp(save.profile.rankPoints);
  const streak = save.stats.currentStreak;
  const nextRankLabel = rank.isApex
    ? ""
    : rankLabel(rankForRp(save.profile.rankPoints + (rank.rpForNext - rank.rpInto)));

  const stats = [
    { icon: Swords, label: "Battles", value: games },
    { icon: Trophy, label: "Wins", value: save.stats.wins },
    { icon: Skull, label: "Losses", value: save.stats.losses },
    { icon: Waves, label: "Best Wave", value: save.highestWave },
  ];

  return (
    <div className="space-y-6">
      <SectionTitle title="Profile" subtitle="Your degen identity, stats, and progression." />

      {/* Identity */}
      <Panel className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-lime/40 to-magenta/40 font-display text-2xl font-bold">
            {(mounted ? save.profile.username : "?").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={24}
                  className="rounded-lg border border-border bg-secondary px-3 py-1.5 font-display text-lg font-bold outline-none focus:border-lime"
                />
                <Button size="sm" onClick={() => { setUsername(name); setEditing(false); }}>
                  <Check className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-bold">{mounted ? save.profile.username : "—"}</h2>
                <button onClick={() => { setName(save.profile.username); setEditing(true); }} className="text-muted hover:text-foreground">
                  <Pencil className="size-4" />
                </button>
              </div>
            )}
            <div className="mt-1 flex items-center gap-2">
              {mounted && (save.profile.walletAddress ? <Badge tone="lime">Wallet linked</Badge> : <Badge tone="gold">Guest</Badge>)}
            </div>
          </div>
          <WalletButton />
        </div>
      </Panel>

      {/* Competitive rank */}
      <Panel className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl" aria-hidden>{mounted ? rank.icon : "🎖️"}</div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-xl font-bold" style={{ color: mounted ? rank.color : undefined }}>
                  {mounted ? rankLabel(rank) : "—"}
                </h3>
                {mounted && streak >= 2 && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-400">
                    <Flame className="size-3.5" /> {streak}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {mounted
                  ? rank.isApex
                    ? `${rank.rp} RP · apex tier`
                    : `${rank.rpInto}/${rank.rpForNext} RP to ${nextRankLabel}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="text-left text-xs text-muted-foreground sm:text-right">
            <p>Season {mounted ? save.profile.seasonId : "—"}</p>
            <p>
              Peak {mounted ? rankLabel(rankForRp(save.profile.peakRankPoints)) : "—"} ·{" "}
              {mounted ? save.stats.bestStreak : 0}🔥 best
            </p>
          </div>
        </div>
        {mounted && !rank.isApex && (
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(rank.rpInto / rank.rpForNext) * 100}%`, backgroundColor: rank.color }}
            />
          </div>
        )}
      </Panel>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Panel key={s.label} className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted"><s.icon className="size-4" /> {s.label}</div>
            <p className="mt-1 font-display text-2xl font-bold">{mounted ? s.value : "—"}</p>
          </Panel>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Panel className="p-4">
          <p className="text-xs text-muted">Win Rate</p>
          <p className="mt-1 font-display text-2xl font-bold text-lime">{mounted ? `${winRate}%` : "—"}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs text-muted">Lifetime MEMEARENA claimed</p>
          <p className="mt-1 font-display text-2xl font-bold text-gold">{mounted ? formatToken(balances.claimedMemearena, "") : "—"}</p>
        </Panel>
      </div>

      {/* Progression unlocks */}
      <div>
        <h3 className="mb-3 font-display text-lg font-bold">Progression</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(UNLOCKS_BY_LEVEL).map(([lvl, items]) => {
            const unlocked = mounted && save.stats.wins >= Number(lvl) - 1;
            return (
              <Panel key={lvl} className={cn("flex items-center gap-3 p-3", unlocked && "border-lime/30")}>
                <div className={cn("grid size-9 place-items-center rounded-xl text-xs font-bold", unlocked ? "bg-lime/15 text-lime" : "bg-secondary text-muted")}>
                  {unlocked ? <Check className="size-4" /> : <Lock className="size-3.5" />}
                </div>
                <div>
                  <p className="text-xs text-muted">{Number(lvl) <= 1 ? "Available now" : `After ${Number(lvl) - 1} win${Number(lvl) > 2 ? "s" : ""}`}</p>
                  <p className="text-sm font-medium">{items.join(", ")}</p>
                </div>
              </Panel>
            );
          })}
        </div>
      </div>

      {/* Cosmetics */}
      <div>
        <h3 className="mb-3 font-display text-lg font-bold">Cosmetic Frames</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COSMETIC_FRAMES.map((f) => {
            const owned = save.cosmeticsOwned.includes(f.id);
            return (
              <Panel key={f.id} className={cn("p-4 text-center", owned && "border-gold/30")}>
                <div className={cn("mx-auto grid size-12 place-items-center rounded-xl bg-gradient-to-br", f.style_config.gradient)}>
                  <Sparkles className="size-5 text-foreground" />
                </div>
                <p className="mt-2 text-sm font-medium">{f.name}</p>
                <Badge tone={owned ? "gold" : "neutral"} className="mt-1">{owned ? "Owned" : `${f.cost_gems} Gems`}</Badge>
              </Panel>
            );
          })}
        </div>
      </div>

      {/* Danger zone */}
      <Panel className="flex flex-col items-start gap-3 border-red-500/20 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display font-bold">Reset progress</p>
          <p className="text-xs text-muted">Wipes your local save (cards, currencies, rewards). Cannot be undone.</p>
        </div>
        {confirmReset ? (
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={() => { reset(); setConfirmReset(false); }}>
              <Trash2 className="size-4" /> Confirm reset
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
            <Trash2 className="size-4" /> Reset
          </Button>
        )}
      </Panel>
    </div>
  );
}
