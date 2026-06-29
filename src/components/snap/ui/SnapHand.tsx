"use client";

import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { SnapMatchState } from "@/types/snap";
import { SnapCard } from "./SnapCard";
import { useSnapSound } from "./useSnapSound";
import { useSnapDrag } from "@/store/snapDragStore";

interface Props {
  match: SnapMatchState;
  selectedInstanceId: string | null;
  energyLeft: number;
  /** Toggle selection (tap-to-place fallback). */
  onSelect: (instanceId: string) => void;
  /** Whether drag-to-place is currently allowed (not revealing/complete). */
  canPlay: boolean;
  /** Arms a card for placement (used at drag start). */
  onArm: (instanceId: string) => void;
  /** Attempt to place a specific card at a location; returns success. */
  onDropAt: (locationId: string, instanceId: string) => boolean;
}

/**
 * The player's hand: a fanned, overlapping row of large cards that lift on
 * hover. Cards can be dragged onto a revealed location to place them, or
 * tapped to arm the click-to-place fallback. Playable cards glow; unaffordable
 * cards dim.
 */
export function SnapHand({
  match,
  selectedInstanceId,
  energyLeft,
  onSelect,
  canPlay,
  onArm,
  onDropAt,
}: Props) {
  const sound = useSnapSound();
  const draggingId = useSnapDrag((s) => s.draggingId);
  const stagedIds = new Set(match.stagedPlays.map((p) => p.instanceId));
  const hand = match.player.hand.filter((c) => !stagedIds.has(c.instanceId));

  // A card is "playable" if at least one revealed location can afford it.
  const cheapestExtra = Math.min(
    ...match.locations.filter((l) => l.isRevealed).map((l) => (l.effectId === "gasWar" ? 1 : 0)),
    0,
  );

  const count = hand.length;
  // Gentle fan: rotate cards around the center, overlap slightly.
  const fanFor = (i: number) => {
    if (count <= 1) return { rot: 0, dy: 0 };
    const t = i / (count - 1) - 0.5; // -0.5..0.5
    return { rot: t * Math.min(10, count * 2.5), dy: Math.abs(t) * 10 };
  };

  return (
    <div className="relative">
      <div className="flex min-h-[150px] items-end justify-center px-2">
        <AnimatePresence mode="popLayout">
          {hand.map((card, i) => {
            const minCost = Math.max(0, card.cost + cheapestExtra);
            const affordable = minCost <= energyLeft;
            const isSelected = selectedInstanceId === card.instanceId;
            const isDragging = draggingId === card.instanceId;
            const { rot, dy } = fanFor(i);
            const draggable = canPlay && affordable;

            // Tracks whether the most recent pointer interaction actually moved
            // far enough to count as a drag. Without this, the inner card's click
            // and the wrapper's drag gesture race for the same pointer and the
            // drag never resolves — you only ever get a select.
            let didDrag = false;

            function handleDragStart() {
              didDrag = true;
              onArm(card.instanceId);
              useSnapDrag.getState().beginDrag(card.instanceId);
              sound.play("cardHover");
            }
            function handleDrag(_: unknown, info: PanInfo) {
              useSnapDrag.getState().moveDrag(info.point.x, info.point.y);
            }
            function handleDragEnd(_: unknown, info: PanInfo) {
              // Authoritative hit-test at release. Prefer the live hoveredZoneId
              // (already proven correct by the hover highlight); fall back to a
              // fresh hit-test against the release point.
              const drag = useSnapDrag.getState();
              const locId = drag.hoveredZoneId ?? drag.resolveDropAt(info.point.x, info.point.y);
              drag.endDrag();
              // Place THIS card explicitly — don't depend on selection state.
              if (locId) onDropAt(locId, card.instanceId);
              // Reset on the next tick so the click handler (which fires after
              // dragEnd) can tell a real drag from a plain tap.
              setTimeout(() => {
                didDrag = false;
              }, 0);
            }
            function handleClick() {
              if (didDrag) return; // a drag just happened — don't also toggle select
              onSelect(card.instanceId);
            }

            return (
              <motion.div
                key={card.instanceId}
                layout={!isDragging}
                drag={draggable}
                dragSnapToOrigin
                dragElastic={0.12}
                dragMomentum={false}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                onClick={handleClick}
                initial={{ opacity: 0, y: 40 }}
                animate={{
                  opacity: 1,
                  y: dy,
                  rotate: isSelected || isDragging ? 0 : rot,
                  scale: isDragging ? 1.12 : 1,
                }}
                exit={{ opacity: 0, y: 40, scale: 0.8 }}
                whileHover={{ zIndex: 30 }}
                whileDrag={{ zIndex: 60, cursor: "grabbing" }}
                onHoverStart={() => sound.play("cardHover")}
                className={cn(
                  "relative touch-none",
                  // Spread cards apart: much less overlap than before (was -ml-5),
                  // a small negative margin on phones, real spacing on wider screens.
                  i > 0 && "-ml-2 sm:ml-1.5",
                  draggable && "cursor-grab",
                )}
                style={{ zIndex: isDragging ? 60 : isSelected ? 40 : i }}
              >
                {/* Pointer-transparent so the draggable wrapper above is the
                    sole gesture owner. Previously the inner card was a <button>
                    that captured the pointer-down and blocked the drag from ever
                    starting — so cards could only be tapped, never dragged. */}
                <div className="pointer-events-none">
                  <SnapCard
                    card={card}
                    size="lg"
                    selected={isSelected}
                    playable={affordable}
                    dimmed={!affordable}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {count === 0 && (
          <div className="py-10 text-sm text-muted">No cards in hand — press End Turn.</div>
        )}
      </div>
    </div>
  );
}
