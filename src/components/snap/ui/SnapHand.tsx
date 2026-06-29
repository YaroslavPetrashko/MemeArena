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
 * Resolve a VIEWPORT-space point from a framer-motion drag callback. We read the
 * native pointer event's clientX/clientY (always viewport coords, matching
 * getBoundingClientRect) rather than PanInfo.point — whose coordinate space has
 * drifted between framer-motion versions and silently broke drop hit-testing.
 */
function viewportPoint(
  event: MouseEvent | TouchEvent | PointerEvent,
  info: PanInfo,
): { x: number; y: number } {
  if ("clientX" in event && typeof event.clientX === "number") {
    return { x: event.clientX, y: event.clientY };
  }
  if ("changedTouches" in event && event.changedTouches.length > 0) {
    const t = event.changedTouches[0];
    return { x: t.clientX, y: t.clientY };
  }
  // Last-resort fallback: PanInfo.point is page-space — convert to viewport.
  return {
    x: info.point.x - (typeof window !== "undefined" ? window.scrollX : 0),
    y: info.point.y - (typeof window !== "undefined" ? window.scrollY : 0),
  };
}

/**
 * The player's hand: a fanned, overlapping row of large cards. Each card can be
 * DRAGGED onto a revealed location to place it, or TAPPED to arm click-to-place.
 *
 * Structure note (why two nested motion layers): the OUTER layer owns the fan
 * presentation (rest position `y`, `rotate`, layout). The INNER layer owns the
 * drag gesture. They MUST be separate elements — if a single element both
 * `drag`s and `animate`s its `y`, the animation overrides the drag transform and
 * the card can't be dragged vertically (it snaps back instantly).
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
      <div className="flex min-h-[150px] origin-bottom items-end justify-center px-2 scale-[0.78] sm:scale-100">
        <AnimatePresence mode="popLayout">
          {hand.map((card, i) => {
            const minCost = Math.max(0, card.cost + cheapestExtra);
            const affordable = minCost <= energyLeft;
            const isSelected = selectedInstanceId === card.instanceId;
            const isDragging = draggingId === card.instanceId;
            const { rot, dy } = fanFor(i);
            const draggable = canPlay && affordable;

            // Tracks whether the most recent pointer interaction actually moved
            // far enough to count as a drag, so the click handler (which fires
            // after dragEnd) doesn't ALSO toggle selection on a real drag.
            let didDrag = false;

            function handleDragStart() {
              didDrag = true;
              onArm(card.instanceId);
              useSnapDrag.getState().beginDrag(card.instanceId);
              sound.play("cardHover");
            }
            function handleDrag(event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
              const p = viewportPoint(event, info);
              useSnapDrag.getState().moveDrag(p.x, p.y);
            }
            function handleDragEnd(event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
              // Authoritative hit-test at release. Prefer the live hoveredZoneId
              // (already proven correct by the hover highlight); fall back to a
              // fresh hit-test against the release point.
              const drag = useSnapDrag.getState();
              const p = viewportPoint(event, info);
              const locId = drag.hoveredZoneId ?? drag.resolveDropAt(p.x, p.y);
              drag.endDrag();
              if (locId) {
                onDropAt(locId, card.instanceId);
                sound.play("cardPlay");
              }
              // Reset on the next tick so the click handler can tell a real drag
              // from a plain tap.
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
                initial={{ opacity: 0, y: 40 }}
                animate={{
                  opacity: 1,
                  y: dy,
                  rotate: isSelected || isDragging ? 0 : rot,
                }}
                exit={{ opacity: 0, y: 40, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className={cn("relative", i > 0 && "-ml-7 sm:ml-1.5")}
                style={{ zIndex: isDragging ? 60 : isSelected ? 40 : i }}
              >
                {/* Inner = the drag gesture owner. Kept separate from the fan
                    presentation above so `animate.y` never fights the drag. */}
                <motion.div
                  drag={draggable}
                  dragSnapToOrigin
                  dragElastic={0.12}
                  dragMomentum={false}
                  onDragStart={handleDragStart}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                  onClick={handleClick}
                  // NB: hover lift must use `scale`, never `y`/`x`. Animating a
                  // translate axis on a draggable element fights the drag's own
                  // transform (the element is "hovered" the whole time you drag
                  // it with a mouse), which silently disables dragging.
                  whileHover={draggable ? { scale: 1.05 } : undefined}
                  whileDrag={{ scale: 1.12, cursor: "grabbing" }}
                  onHoverStart={() => sound.play("cardHover")}
                  className={cn("relative touch-none", draggable && "cursor-grab")}
                >
                  {/* Pointer-transparent so the draggable wrapper is the sole
                      gesture owner (a <button> here would swallow pointer-down
                      and block the drag from ever starting). */}
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
