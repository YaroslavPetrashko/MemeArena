"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Plus, AlertTriangle, Shuffle, Trash2 } from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SnapCard } from "@/components/snap/SnapCard";
import { displayCard } from "@/components/snap/displayCard";
import { useGameStore } from "@/store/gameStore";
import { useSnapCardModal } from "@/store/snapCardModalStore";
import { useMounted } from "@/hooks/useMounted";
import { SNAP_CARDS, SNAP_CARDS_BY_ID, SNAP_DECK_SIZE, snapCardPowerAtLevel } from "@/data/snapCards";
import posthog from "posthog-js";

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
    if (highCost > 4) warnings.push("Top-heavy: too many 5+ cost cards.");
    if (lowCost < 3) warnings.push("Slow start: add more 1–2 cost cards.");
    if (archetypes.length === 0) warnings.push("No clear synergy — try 3+ cards sharing a tag.");

    return {
      totalCost,
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
      if (newDeck.length === SNAP_DECK_SIZE) {
        posthog.capture("deck_completed", { deck: newDeck });
      }
    }
  }

  function autoFill() {
    if (deck.length >= SNAP_DECK_SIZE) return;
    const pool = SNAP_CARDS.filter((c) => !deckSet.has(c.id)).map((c) => c.id);
    setDeck([...deck, ...pool.slice(0, SNAP_DECK_SIZE - deck.length)]);
  }

  const TAGS = ["All", "On Reveal", "Ongoing", "Buff", "Disrupt", "Token", "Finisher", "Brainrot"];
  const filtered = filter === "All" ? SNAP_CARDS : SNAP_CARDS.filter((c) => c.tags.includes(filter as never));

  const complete = deck.length === SNAP_DECK_SIZE;

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-6">
      {/* Collection */}
      <div className="space-y-4">
        <SectionTitle
          title="Deck Builder"
          subtitle={`Build a deck of exactly ${SNAP_DECK_SIZE} cards. No duplicates.`}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={autoFill}><Shuffle className="size-3.5" /> Auto-fill</Button>
              <Button size="sm" variant="ghost" onClick={() => setDeck([])}><Trash2 className="size-3.5" /> Clear</Button>
            </div>
          }
        />

        <div className="flex flex-wrap gap-1.5">
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${filter === t ? "bg-lime text-black" : "bg-white/5 text-muted hover:bg-white/10"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {filtered.map((def) => {
            const inDeck = deckSet.has(def.id);
            const lvl = levelOf(def.id);
            return (
              <motion.div key={def.id} layout className="relative">
                <SnapCard
                  card={displayCard(def, lvl)}
                  size="md"
                  selected={inDeck}
                  onClick={() => openCard(def.id)}
                  className="w-full"
                />
                <button
                  onClick={() => toggle(def.id)}
                  className={`absolute -top-1.5 -right-1.5 z-10 size-6 grid place-items-center rounded-full ring-2 ring-background ${
                    inDeck ? "bg-lime text-black" : "bg-white/15 text-white hover:bg-white/25"
                  } ${!inDeck && deck.length >= SNAP_DECK_SIZE ? "opacity-30 pointer-events-none" : ""}`}
                >
                  {inDeck ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Deck summary */}
      <div className="space-y-3">
        <Panel className="p-4 sticky top-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold">Your Deck</h3>
            <Badge tone={complete ? "lime" : "neutral"}>
              {mounted ? deck.length : SNAP_DECK_SIZE}/{SNAP_DECK_SIZE}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <Stat label="Avg Cost" value={stats.avgCost} />
            <Stat label="Base Power" value={stats.totalPower} />
            <Stat label="Cards" value={deck.length} />
          </div>

          {/* cost curve */}
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-wide text-muted mb-1.5">Cost Curve</p>
            <div className="flex items-end gap-1 h-16">
              {[1, 2, 3, 4, 5, 6].map((cost) => {
                const n = stats.curve[cost] ?? 0;
                return (
                  <div key={cost} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full bg-gradient-to-t from-lime/40 to-lime rounded-sm transition-all"
                      style={{ height: `${Math.min(100, n * 22)}%`, minHeight: n ? 4 : 0 }} />
                    <span className="text-[9px] text-muted">{cost}{cost === 6 ? "+" : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {stats.archetypes.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-wide text-muted mb-1">Synergies</p>
              <div className="flex flex-wrap gap-1">
                {stats.archetypes.map((a) => <Badge key={a} tone="lime">{a}</Badge>)}
              </div>
            </div>
          )}

          {stats.warnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {stats.warnings.map((w) => (
                <div key={w} className="flex items-start gap-1.5 text-[11px] text-gold">
                  <AlertTriangle className="size-3.5 shrink-0 mt-0.5" /> {w}
                </div>
              ))}
            </div>
          )}

          {!complete && (
            <p className="mt-3 text-xs text-magenta text-center">
              Add {SNAP_DECK_SIZE - deck.length} more card{SNAP_DECK_SIZE - deck.length !== 1 ? "s" : ""} to play.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-black/30 py-2">
      <div className="font-display font-black text-lg tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
