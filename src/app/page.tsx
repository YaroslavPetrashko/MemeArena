"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Swords,
  Layers,
  Trophy,
  Zap,
  ArrowRight,
  Sparkles,
  Wallet,
  Gift,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Countdown } from "@/components/common/Countdown";
import { CurrencyChip } from "@/components/ui/CurrencyChip";
import { useGameStore, useBalances } from "@/store/gameStore";
import { useMounted } from "@/hooks/useMounted";
import { levelProgress, eventEndDate } from "@/lib/game/progression";
import { ACTIVE_EVENT } from "@/data/modes";
import { formatToken, formatNumber } from "@/lib/utils/format";

const STEPS = [
  { icon: Wallet, title: "Connect or guest", text: "Jump in instantly, or link Phantom to earn claimable MEMEARENA." },
  { icon: Layers, title: "Build an 8-card deck", text: "Mix meme legends, combos, and chaos into a winning hand." },
  { icon: Swords, title: "Beat bot bosses", text: "Out-tempo rug goblins, whales, and market makers in 60-second fights." },
  { icon: Gift, title: "Earn & claim", text: "Stack rewards, upgrade cards, and claim tokens after validation." },
];

export default function DashboardPage() {
  const mounted = useMounted();
  const save = useGameStore((s) => s.save);
  const balances = useBalances();
  const power = useGameStore((s) => s.deckPower());
  const prog = levelProgress(save.profile.xp);
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
            <Zap className="size-4 text-violet-300" /> Player Level
          </div>
          <p className="mt-1 font-display text-2xl font-bold">{mounted ? prog.level : "—"}</p>
          <ProgressBar value={prog.xpInto} max={prog.xpForNext} className="mt-2 h-1.5" barClassName="bg-gradient-to-r from-violet-400 to-fuchsia-400" />
          <p className="mt-1 text-[10px] text-muted">{mounted ? `${prog.xpInto}/${prog.xpForNext} XP` : ""}</p>
        </Panel>
        <Panel className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Sparkles className="size-4 text-lime" /> Deck Power
          </div>
          <p className="mt-1 font-display text-2xl font-bold">{mounted ? formatNumber(power) : "—"}</p>
          <p className="mt-1 text-[10px] text-muted">8 cards equipped</p>
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

      {/* Event banner */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-magenta/30 bg-gradient-to-r from-magenta/15 via-transparent to-transparent p-6"
        >
          <div className="absolute -right-10 -top-10 size-44 rounded-full bg-magenta/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge tone="magenta" className="mb-2">
                <Flame className="size-3" /> Limited Event
              </Badge>
              <h3 className="font-display text-2xl font-bold">{ACTIVE_EVENT.name}</h3>
              <p className="mt-1 text-sm text-muted">
                Italian brainrot cards deal +20% damage. Face the Liquidity Vampire for 10–75 MEMEARENA.
              </p>
              <p className="mt-2 text-xs text-magenta">
                Ends in <Countdown to={eventEndDate()} className="font-mono font-semibold" />
              </p>
            </div>
            <Link href="/play">
              <Button variant="magenta" size="lg">
                Play Event <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
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
