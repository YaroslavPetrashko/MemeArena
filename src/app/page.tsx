"use client";

import Link from "next/link";
import {
  Swords,
  Layers,
  Trophy,
  Zap,
  ArrowRight,
  Sparkles,
  Wallet,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { CurrencyChip } from "@/components/ui/CurrencyChip";
import { useGameStore, useBalances } from "@/store/gameStore";
import { useMounted } from "@/hooks/useMounted";
import { formatToken, formatNumber } from "@/lib/utils/format";

const STEPS = [
  { icon: Wallet, title: "Connect or guest", text: "Jump in instantly, or link Phantom to earn claimable MEMEARENA." },
  { icon: Layers, title: "Build a 12-card deck", text: "Stack On Reveal buffs, Ongoing power, tokens, and big finishers." },
  { icon: Swords, title: "Win 2 of 3 locations", text: "6 turns, 3 locations, simultaneous reveal. Outsmart the boss." },
  { icon: Gift, title: "Earn & claim", text: "Stack rewards, upgrade cards, and claim tokens after validation." },
];

export default function DashboardPage() {
  const mounted = useMounted();
  const save = useGameStore((s) => s.save);
  const balances = useBalances();
  const power = useGameStore((s) => s.deckPower());
  const wins = save.stats.wins;
  const games = save.stats.battlesPlayed;
  const winRate = games ? Math.round((wins / games) * 100) : 0;

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-6 sm:p-10">
        <div className="absolute -right-20 -top-20 size-72 rounded-full bg-lime/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 size-72 rounded-full bg-magenta/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <Badge tone="lime" className="mb-4">
            <Sparkles className="size-3" /> Devnet MVP · PvE Boss Rush
          </Badge>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Stack memes.<br />
            Slay bosses.<br />
            <span className="text-gradient">Claim the bag.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted">
            MemeArena is a fast, funny onchain card battler. Build a degen deck, beat
            bot-controlled meme bosses, and earn claimable MEMEARENA — a game first, rewards a bonus.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/play">
              <Button size="lg">
                <Swords className="size-5" /> Enter the Arena
              </Button>
            </Link>
            <Link href="/deck">
              <Button size="lg" variant="ghost">
                <Layers className="size-5" /> Build Deck
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Panel className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Zap className="size-4 text-violet-300" /> Battles
          </div>
          <p className="mt-1 font-display text-2xl font-bold">{mounted ? games : "—"}</p>
          <p className="mt-1 text-[10px] text-muted">{mounted ? `${wins} wins` : ""}</p>
        </Panel>
        <Panel className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Sparkles className="size-4 text-lime" /> Deck Power
          </div>
          <p className="mt-1 font-display text-2xl font-bold">{mounted ? formatNumber(power) : "—"}</p>
          <p className="mt-1 text-[10px] text-muted">12 cards equipped</p>
        </Panel>
        <Panel className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Trophy className="size-4 text-gold" /> Win Rate
          </div>
          <p className="mt-1 font-display text-2xl font-bold">{mounted ? `${winRate}%` : "—"}</p>
          <p className="mt-1 text-[10px] text-muted">{mounted ? `${wins}W · ${games - wins}L` : ""}</p>
        </Panel>
        <Panel className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Gift className="size-4 text-lime" /> Claimable
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-lime">
            {mounted ? formatToken(balances.approvedMemearena, "") : "—"}
          </p>
          <Link href="/claim" className="mt-1 inline-flex items-center gap-1 text-[10px] text-lime/80 hover:text-lime">
            Go to Claim <ArrowRight className="size-3" />
          </Link>
        </Panel>
      </section>

      {/* How it works */}
      <section>
        <h2 className="mb-4 font-display text-xl font-bold">How it works</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Panel key={s.title} className="p-5">
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-xl bg-lime/10 text-lime">
                  <s.icon className="size-5" />
                </div>
                <span className="font-mono text-xs text-muted">0{i + 1}</span>
              </div>
              <h3 className="mt-3 font-display font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* Wallet nudge for guests */}
      {mounted && !save.profile.walletAddress && (
        <Panel className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-lg font-bold">Playing as guest</h3>
            <p className="text-sm text-muted">
              You can play everything, but token rewards require a connected wallet. Your progress is saved locally.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CurrencyChip kind="memearena" value={balances.pendingMemearena} decimals />
            <span className="text-xs text-muted">pending</span>
          </div>
        </Panel>
      )}
    </div>
  );
}
