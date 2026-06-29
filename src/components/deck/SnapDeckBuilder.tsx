"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Info, AlertTriangle, Shuffle, Trash2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SnapCard } from "@/components/snap/SnapCard";
import { displayCard } from "@/components/snap/displayCard";
import { useGameStore } from "@/store/gameStore";
import { useSnapCardModal } from "@/store/snapCardModalStore";
import { useMounted } from "@/hooks/useMounted";
import { cn } from "@/lib/utils/cn";
import { SNAP_CARDS, SNAP_CARDS_BY_ID, SNAP_DECK_SIZE, snapCardPowerAtLevel } from "@/data/snapCards";
import posthog from "posthog-js";

/**
 * Clash-Royale-style deck builder: the active 12-card deck sits on top in fixed
 * slots, the full collection sits below in an inventory grid. Tap a collection
 * card to add it; tap an active card to remove it; the ⓘ button opens details.
 */
export function SnapDeckBuilder() {
  const mounted = useMounted();
  const save = useGameStore((s) => s.save);
  const setDeck = useGameStore((s) => s.setDeck);
  const openCard = useSnapCardModal((s) => s.open);
  const [filter, setFilter] = useState<string>("All");

  const deck = save.deck;
  const deckSet = useMemo(() => new Set(deck), [deck]);
  const levelOf = (id: string) => save.ownedCards[id]?.level ?? 1;

  const stats = useMemo(() => {
    const cards = deck.map((id) => SNAP_CARDS_BY_ID[id]).filter(Boolean);
    const totalCost = cards.reduce((s, c) => s + c.cost, 0);
    const totalPower = deck.reduce((s, id) => {
      const def = SNAP_CARDS_BY_ID[id];
      return def ? s + snapCardPowerAtLevel(def, levelOf(id)) : s;
    }, 0);
    const curve: Record<number, number> = {};
    for (const c of cards) {
      const b = Math.min(6, c.cost);
      curve[b] = (curve[b] ?? 0) + 1;
    }
    const lowCost = cards.filter((c) => c.cost <= 2).length;
    const highCost = cards.filter((c) => c.cost >= 5).length;
    const tagCounts: Record<string, number> = {};
    for (const c of cards) for (const t of c.tags) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
    const archetypes = Object.entries(tagCounts)
      .filter(([, n]) => n >= 3)
      .map(([t]) => t);

    const warnings: string[] = [];
    if (highCost > 4) warnings.push("Top-heavy: too many 5+ Energy cards.");
    if (lowCost < 3) warnings.push("Slow start: add more 1–2 Energy cards.");
    if (cards.length === SNAP_DECK_SIZE && archetypes.length === 0)
      warnings.push("No clear synergy — try 3+ cards sharing a tag.");

    return {
      avgCost: cards.length ? Math.round((totalCost / cards.length) * 10) / 10 : 0,
      totalPower,
      curve,
      archetypes,
      warnings,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, save.ownedCards]);

  function toggle(id: string) {
    if (deckSet.has(id)) {
      setDeck(deck.filter((c) => c !== id));
      posthog.capture("deck_card_toggled", { card_id: id, action: "removed", deck_size: deck.length - 1 });
    } else if (deck.length < SNAP_DECK_SIZE) {
      const newDeck = [...deck, id];
      setDeck(newDeck);
      posthog.capture("deck_card_toggled", { card_id: id, action: "added", deck_size: newDeck.length });
      if (newDeck.length === SNAP_DECK_SIZE) posthog.capture("deck_completed", { deck: newDeck });
    }
  }

  function autoFill() {
    if (deck.length >= SNAP_DECK_SIZE) return;
    const pool = SNAP_CARDS.filter((c) => !deckSet.has(c.id)).map((c) => c.id);
    setDeck([...deck, ...pool.slice(0, SNAP_DECK_SIZE - deck.length)]);
  }

  const TAGS = ["All", "On Reveal", "Ongoing", "Buff", "Disrupt", "Token", "Finisher", "Brainrot"];
  const filtered = filter === "All" ? SNAP_CARDS : SNAP_CARDS.filter((c) => c.tags.includes(filter as never));
  const deckCount = mounted ? deck.length : SNAP_DECK_SIZE;
  const complete = deck.length === SNAP_DECK_SIZE;
  const deckFull = deck.length >= SNAP_DECK_SIZE;

  return (
    <div className="space-y-6">
      {/* ---- Active deck (top) ---- */}
      <section className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold">Active Deck</h2>
            <Badge variant={complete ? "success" : "neutral"}>{deckCount}/{SNAP_DECK_SIZE}</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={autoFill} disabled={deckFull}>
              <Shuffle className="size-3.5" /> Auto-fill
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDeck([])} disabled={deck.length === 0}>
              <Trash2 className="size-3.5" /> Clear
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3">
          {Array.from({ length: SNAP_DECK_SIZE }).map((_, i) => {
            const id = deck[i];
            if (!id) {
              return (
                <div
                  key={`slot-${i}`}
                  className="grid aspect-[3/4] w-full place-items-center rounded-xl border-2 border-dashed border-border/70 text-muted-foreground/50"
                >
                  <Plus className="size-5" />
                </div>
              );
            }
            const def = SNAP_CARDS_BY_ID[id];
            if (!def) return <div key={`slot-${i}`} />;
            return (
              <CardCell
                key={id}
                def={def}
                level={levelOf(id)}
                inDeck
                onToggle={() => toggle(id)}
                onInfo={() => openCard(id)}
              />
            );
          })}
        </div>

        {/* compact analytics */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[auto_1fr]">
          <div className="flex gap-2">
            <Stat label="Avg Energy" value={stats.avgCost} />
            <Stat label="Strength" value={stats.totalPower} />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Energy curve</p>
            <div className="flex h-12 items-end gap-1">
              {[1, 2, 3, 4, 5, 6].map((cost) => {
                const n = stats.curve[cost] ?? 0;
                return (
                  <div key={cost} className="flex flex-1 flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-sm bg-gradient-to-t from-primary/40 to-primary transition-all"
                      style={{ height: `${Math.min(100, n * 22)}%`, minHeight: n ? 4 : 0 }}
                    />
                    <span className="text-[9px] text-muted-foreground">{cost}{cost === 6 ? "+" : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {stats.archetypes.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Synergies:</span>
            {stats.archetypes.map((a) => <Badge key={a} variant="success">{a}</Badge>)}
          </div>
        )}
        {stats.warnings.length > 0 && (
          <div className="mt-2 space-y-1">
            {stats.warnings.map((w) => (
              <div key={w} className="flex items-start gap-1.5 text-[11px] text-gold">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {w}
              </div>
            ))}
          </div>
        )}
        {!complete && (
          <p className="mt-3 text-center text-xs text-magenta">
            Add {SNAP_DECK_SIZE - deck.length} more card{SNAP_DECK_SIZE - deck.length !== 1 ? "s" : ""} to play.
          </p>
        )}
      </section>

      {/* ---- Collection (bottom) ---- */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">Collection</h2>
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  filter === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3 lg:grid-cols-6">
          {filtered.map((def) => {
            const inDeck = deckSet.has(def.id);
            return (
              <CardCell
                key={def.id}
                def={def}
                level={levelOf(def.id)}
                inDeck={inDeck}
                disabled={!inDeck && deckFull}
                onToggle={() => toggle(def.id)}
                onInfo={() => openCard(def.id)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

/**
 * One card tile used in both the active deck and the collection. The card body
 * toggles deck membership; the ⓘ button opens the detail modal. In-deck cards
 * get a green ring + a remove (×) affordance, out-of-deck show a +.
 */
function CardCell({
  def,
  level,
  inDeck,
  disabled,
  onToggle,
  onInfo,
}: {
  def: (typeof SNAP_CARDS)[number];
  level: number;
  inDeck: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onInfo: () => void;
}) {
  return (
    <motion.div layout className="group relative">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={inDeck ? `Remove ${def.name}` : `Add ${def.name}`}
        className={cn(
          "block w-full rounded-xl transition-all",
          inDeck && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          disabled && "cursor-not-allowed opacity-40",
        )}
      >
        <SnapCard card={displayCard(def, level)} size="md" className="w-full" />
      </button>

      {/* info */}
      <button
        type="button"
        onClick={onInfo}
        aria-label={`${def.name} details`}
        className="absolute left-1 top-1 z-10 grid size-6 place-items-center rounded-full bg-background/70 text-muted-foreground opacity-0 ring-1 ring-border backdrop-blur transition-opacity hover:text-foreground group-hover:opacity-100"
      >
        <Info className="size-3.5" />
      </button>

      {/* add / remove indicator */}
      <span
        className={cn(
          "pointer-events-none absolute -right-1.5 -top-1.5 z-10 grid size-6 place-items-center rounded-full ring-2 ring-background",
          inDeck ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
          disabled && "opacity-30",
        )}
      >
        {inDeck ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
      </span>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-secondary px-3 py-2 text-center">
      <div className="font-display text-lg font-black tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
