"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Swords, Loader2, X, AlertTriangle, Layers } from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/store/gameStore";
import { usePvpStore } from "@/store/pvpStore";
import { useMounted } from "@/hooks/useMounted";
import { pvpAvailable } from "@/lib/api/pvp";
import { SNAP_MIN_DECK_SIZE } from "@/data/snapCards";
import { SnapPvpBattle } from "@/components/snap/SnapPvpBattle";

export default function PvpPage() {
  const mounted = useMounted();
  const save = useGameStore((s) => s.save);
  const { phase, findMatch, leave } = usePvpStore();

  // Clean up the queue/subscription if the player navigates away.
  useEffect(() => () => leave(), [leave]);

  const deck = save.deck.map((id) => ({ cardId: id, level: save.ownedCards[id]?.level ?? 1 }));
  const deckTooSmall = deck.length < SNAP_MIN_DECK_SIZE;
  const available = pvpAvailable();

  // A live match → fullscreen battle overlay (covers the app chrome).
  if (phase === "playing" || phase === "complete") {
    return (
      <div className="fixed inset-0 z-50">
        <SnapPvpBattle />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <SectionTitle title="Versus" subtitle="Find a live opponent — no login, just click and wait." />

      {mounted && !available && (
        <Panel className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-gold" />
          <div>
            <p className="font-display font-bold">PvP needs a live backend</p>
            <p className="text-sm text-muted-foreground">
              Realtime matchmaking runs on Supabase. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> /{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, apply migration <code>0007_pvp_guest.sql</code>, and
              deploy the <code>pvp-matchmake</code> / <code>pvp-submit-turn</code> functions. Until then, play
              the Arena vs bots.
            </p>
          </div>
        </Panel>
      )}

      <Panel className="p-6 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-magenta/30 to-primary/30">
          <Swords className="size-8 text-magenta" />
        </div>
        <h3 className="mt-4 font-display text-xl font-bold">Player vs Player</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          6 turns · 3 locations · win 2 of 3. You&apos;re matched with the next player who clicks Find Match.
        </p>

        {mounted && deckTooSmall ? (
          <div className="mt-5 flex flex-col items-center gap-2">
            <p className="text-xs text-magenta">Your deck needs at least {SNAP_MIN_DECK_SIZE} cards.</p>
            <Link href="/deck">
              <Button variant="outline">
                <Layers className="size-4" /> Build your deck
              </Button>
            </Link>
          </div>
        ) : phase === "searching" ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}>
              <Loader2 className="size-7 text-primary" />
            </motion.div>
            <p className="font-display font-bold">Searching for an opponent…</p>
            <p className="text-xs text-muted-foreground">Keep this open — you&apos;ll drop straight into the match.</p>
            <Button variant="ghost" size="sm" onClick={leave}>
              <X className="size-4" /> Cancel
            </Button>
          </div>
        ) : (
          <div className="mt-6">
            <Button
              size="lg"
              variant="magenta"
              disabled={!available}
              onClick={() => findMatch(save.profile.id, save.profile.username, deck)}
            >
              <Swords className="size-5" /> Find Match
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}
