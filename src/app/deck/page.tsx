"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Check, Plus, Info } from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { GameCard } from "@/components/game/GameCard";
import { EmptyState } from "@/components/common/EmptyState";
import { useGameStore } from "@/store/gameStore";
import { useMounted } from "@/hooks/useMounted";
import { CARDS } from "@/data/cards";
import { COMBOS } from "@/data/combos";
import { DECK_SIZE } from "@/data/cards";
import { formatNumber } from "@/lib/utils/format";

export default function DeckPage() {
  const mounted = useMounted();
  const save = useGameStore((s) => s.save);
  const setDeck = useGameStore((s) => s.setDeck);
  const power = useGameStore((s) => s.deckPower());

  const deck = save.deck;
  const ownedIds = useMemo(
    () => CARDS.filter((c) => save.ownedCards[c.id]?.unlocked).map((c) => c.id),
    [save.ownedCards],
  );

  function toggle(cardId: string) {
    if (deck.includes(cardId)) {
      setDeck(deck.filter((id) => id !== cardId));
    } else if (deck.length < DECK_SIZE) {
      setDeck([...deck, cardId]);
    }
  }

  // Combos fully present in the current deck.
  const availableCombos = COMBOS.filter((c) => {
    if (c.repeatCardId) return deck.includes(c.repeatCardId);
    return c.cards?.every((id) => deck.includes(id));
  });

  const complete = deck.length === DECK_SIZE;

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Deck Builder"
        subtitle={`Assemble exactly ${DECK_SIZE} cards. Synergies fire automatically in battle.`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone="lime"><Sparkles className="size-3" /> Power {mounted ? formatNumber(power) : "—"}</Badge>
            <Badge tone={complete ? "lime" : "danger"}>
              {deck.length}/{DECK_SIZE}
            </Badge>
          </div>
        }
      />

      {/* Active deck */}
      <Panel className="p-4">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {Array.from({ length: DECK_SIZE }).map((_, i) => {
            const cardId = deck[i];
            const card = cardId ? CARDS.find((c) => c.id === cardId) : undefined;
            if (!card) {
              return (
                <div key={i} className="flex aspect-[3/4] flex-col items-center justify-center rounded-xl border border-dashed border-white/12 text-muted">
                  <Plus className="size-5" />
                  <span className="mt-1 text-[10px]">Empty</span>
                </div>
              );
            }
            return (
              <GameCard
                key={cardId}
                card={card}
                level={save.ownedCards[card.id]?.level ?? 1}
                selected
                onClick={() => toggle(card.id)}
                interactive
              />
            );
          })}
        </div>
        {!complete && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-gold">
            <Info className="size-3.5" /> Add {DECK_SIZE - deck.length} more card{DECK_SIZE - deck.length > 1 ? "s" : ""} to battle.
          </p>
        )}
      </Panel>

      {/* Synergies */}
      <div>
        <h3 className="mb-3 font-display text-lg font-bold">Active Synergies</h3>
        {availableCombos.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No combos in this deck yet"
            description="Add cards that share a synergy to unlock automatic combo banners in battle."
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {availableCombos.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/5 p-3"
              >
                <Check className="mt-0.5 size-4 shrink-0 text-gold" />
                <div>
                  <p className="font-display text-sm font-bold text-gold">{c.name}</p>
                  <p className="text-xs text-muted">{c.description.split("→")[1]?.trim() ?? c.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Collection */}
      <div>
        <h3 className="mb-3 font-display text-lg font-bold">Collection</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CARDS.map((card) => {
            const inDeck = deck.includes(card.id);
            const owned = ownedIds.includes(card.id);
            const deckFull = deck.length >= DECK_SIZE;
            return (
              <GameCard
                key={card.id}
                card={card}
                level={save.ownedCards[card.id]?.level ?? 1}
                selected={inDeck}
                dimmed={!owned}
                disabled={!owned || (!inDeck && deckFull)}
                onClick={() => toggle(card.id)}
                footer={
                  <span className={`text-[10px] font-medium ${inDeck ? "text-lime" : "text-muted"}`}>
                    {inDeck ? "In deck — tap to remove" : deckFull ? "Deck full" : "Tap to add"}
                  </span>
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
