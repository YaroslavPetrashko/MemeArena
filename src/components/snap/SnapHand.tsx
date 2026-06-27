"use client";

import { AnimatePresence } from "framer-motion";
import type { SnapMatchState } from "@/types/snap";
import { SnapCard } from "./SnapCard";

interface Props {
  match: SnapMatchState;
  selectedInstanceId: string | null;
  energyLeft: number;
  onSelect: (instanceId: string) => void;
}

/** The player's hand. A card glows if playable, dims if unaffordable. */
export function SnapHand({ match, selectedInstanceId, energyLeft, onSelect }: Props) {
  const stagedIds = new Set(match.stagedPlays.map((p) => p.instanceId));
  const hand = match.player.hand.filter((c) => !stagedIds.has(c.instanceId));

  // A card is "playable" if at least one revealed location can afford it.
  const cheapestExtra = Math.min(
    ...match.locations.filter((l) => l.isRevealed).map((l) => (l.effectId === "gasWar" ? 1 : 0)),
    0,
  );

  return (
    <div className="flex items-end justify-center gap-2 flex-wrap min-h-[140px] px-2">
      <AnimatePresence mode="popLayout">
        {hand.map((card) => {
          const minCost = Math.max(0, card.cost + cheapestExtra);
          const affordable = minCost <= energyLeft;
          return (
            <SnapCard
              key={card.instanceId}
              card={card}
              size="md"
              selected={selectedInstanceId === card.instanceId}
              playable={affordable}
              dimmed={!affordable}
              onClick={() => onSelect(card.instanceId)}
            />
          );
        })}
      </AnimatePresence>
      {hand.length === 0 && (
        <div className="text-sm text-muted py-8">No cards in hand. Press End Turn.</div>
      )}
    </div>
  );
}
