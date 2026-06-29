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
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/badge";
import { CurrencyChip } from "@/components/ui/CurrencyChip";
import { useGameStore, useBalances } from "@/store/gameStore";
import { useMounted } from "@/hooks/useMounted";
import { formatToken, formatNumber } from "@/lib/utils/format";

const STEPS = [
  { icon: Wallet, title: "Connect or guest", text: "Jump in instantly, or link Phantom to earn claimable MEMEARENA." },
  { icon: Layers, title: "Build a 12-card deck", text: "Stack On Reveal buffs, Ongoing power, tokens, and big finishers." },
  { icon: Swords, title: "Win 2 of 3 locations", text: "6 turns, 3 locations, simultaneous reveal. Outsmart the opponent." },
  { icon: Gift, title: "Earn & claim", text: "Stack Coins, upgrade card frames, and claim tokens after validation." },
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
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/[0.08] to-transparent p-6 sm:p-10">
        <div className="absolute -right-20 -top-20 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 size-72 rounded-full bg-magenta/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <Badge variant="success" className="mb-4">
            <Sparkles className="size-3" /> Devnet MVP · Arena
          </Badge>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Stack memes.<br />
            Win the lanes.<br />
            <span className="text-gradient">Claim the bag.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            MemeArena is a fast, funny onchain card battler. Build a 12-card degen deck, fight across
            three locations, and earn claimable MEMEARENA — a game first, rewards a bonus.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/play">
              <Button size="lg">
                <Swords className="size-5" /> Enter the Arena
              </Button>
            </Link>
            <Link href="/deck">
              <Button size="lg" variant="outline">
                <Layers className="size-5" /> Build Deck
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Panel className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="size-4 text-violet-400" /> Battles
          </div>
          <p className="mt-1 font-display text-2xl font-bold">{mounted ? games : "—"}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">{mounted ? `${wins} wins` : ""}</p>
        </Panel>
        <Panel className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-4 text-primary" /> Deck Strength
          </div>
          <p className="mt-1 font-display text-2xl font-bold">{mounted ? formatNumber(power) : "—"}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">12 cards equipped</p>
        </Panel>
        <Panel className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Trophy className="size-4 text-gold" /> Win Rate
          </div>
          <p className="mt-1 font-display text-2xl font-bold">{mounted ? `${winRate}%` : "—"}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">{mounted ? `${wins}W · ${games - wins}L` : ""}</p>
        </Panel>
        <Panel className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Gift className="size-4 text-primary" /> Claimable
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-primary">
            {mounted ? formatToken(balances.approvedMemearena, "") : "—"}
          </p>
          <Link href="/claim" className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary/80 hover:text-primary">
            Go to Claim <ArrowRight className="size-3" />
          </Link>
        </Panel>
      </section>

      {/* Featured: the Arena */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-transparent to-transparent p-6"
        >
          <div className="absolute -right-10 -top-10 size-44 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge variant="success" className="mb-2">
                <MapPin className="size-3" /> Arena · free & unlimited
              </Badge>
              <h3 className="font-display text-2xl font-bold">Three locations. Six turns. Win two.</h3>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Drag your memes onto the board, bank energy each turn, and out-tempo a bot opponent.
                PvP is coming — the Arena is where it lands.
              </p>
            </div>
            <Link href="/play">
              <Button size="lg">
                Play now <ArrowRight className="size-4" />
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
                <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="size-5" />
                </div>
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-3 font-display font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* Wallet nudge for guests */}
      {mounted && !save.profile.walletAddress && (
        <Panel className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-lg font-bold">Playing as guest</h3>
            <p className="text-sm text-muted-foreground">
              You can play everything, but token rewards require a connected wallet. Your progress is saved locally.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CurrencyChip kind="memearena" value={balances.pendingMemearena} decimals />
            <span className="text-xs text-muted-foreground">pending</span>
          </div>
        </Panel>
      )}
    </div>
  );
}
