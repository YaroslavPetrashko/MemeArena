"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { SnapLocation as SnapLocationType, SnapCard as SnapCardType } from "@/types/snap";
import { SnapCard } from "./SnapCard";
import { SnapLocationScoreBadge } from "./SnapLocationScoreBadge";
import { useSnapCardModal } from "@/store/snapCardModalStore";
import { useSnapDrag } from "@/store/snapDragStore";

export type LocationWinner = "player" | "boss" | "tie";

interface Props {
  location: SnapLocationType;
  /** Cards the player has staged here this turn (face-up preview). */
  stagedHere: SnapCardType[];
  matchComplete: boolean;
  selectable: boolean;
  invalid: boolean;
  winner: LocationWinner;
  onPlace: () => void;
  onUnstage: (instanceId: string) => void;
}

/** A row of card slots for one side, with empty-slot ghosts. */
function SlotRow({
  cards,
  staged,
  side,
  max,
  onUnstage,
}: {
  cards: SnapCardType[];
  staged?: SnapCardType[];
  side: "player" | "boss";
  max: number;
  onUnstage?: (id: string) => void;
}) {
  const openModal = useSnapCardModal((s) => s.open);
  const all = [...cards, ...(staged ?? [])];
  const empties = Math.max(0, max - all.length);

  return (
    // Compact card row sitting north/south of the location. Small cards + faint
    // empty sockets keep the board tight; the row always reserves slot height so
    // the board doesn't jump as cards are placed.
    <div className="flex h-[64px] flex-nowrap items-center justify-center gap-0.5 overflow-visible">
      <AnimatePresence mode="popLayout">
        {all.map((c, idx) => {
          const isStaged = staged?.some((x) => x.instanceId === c.instanceId);
          const faceDown = !isStaged && !c.isRevealed;
          return (
            <SnapCard
              key={c.instanceId}
              card={c}
              size="xs"
              faceDown={faceDown}
              showAbility={false}
              staged={isStaged}
              highlightPower
              // Overlap when a side is crowded so a full row stays inside the
              // location's width instead of overflowing.
              className={cn("shrink-0", all.length > 2 && idx > 0 && "-ml-3.5")}
              onClick={
                isStaged && onUnstage
                  ? () => onUnstage(c.instanceId)
                  : !faceDown
                    ? () => openModal(c.cardId)
                    : undefined
              }
            />
          );
        })}
      </AnimatePresence>
      {Array.from({ length: empties }).map((_, i) => (
        <div
          key={`e-${side}-${i}`}
          className="h-[58px] w-[40px] shrink-0 rounded-[7px] border border-dashed border-white/20 bg-black/15 backdrop-blur-[1px]"
        />
      ))}
    </div>
  );
}

export function SnapLocationPanel({
  location,
  stagedHere,
  matchComplete,
  selectable,
  invalid,
  winner,
  onPlace,
  onUnstage,
}: Props) {
  /* ---- Mystery (unrevealed) state ---- */
  if (!location.isRevealed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex h-full min-h-[260px] flex-col items-center justify-center"
      >
        {/* Just the dashed circle — no surrounding box. */}
        <div className="snap-mystery-ring absolute left-1/2 top-1/2 size-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-magenta/25" />
        <div className="relative px-4 text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-white/5 text-3xl ring-1 ring-white/10">
            ❓
          </div>
          <div className="font-display text-base font-bold text-white/85">Mystery Location</div>
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-magenta ring-1 ring-magenta/30">
            <Lock className="size-3" /> Reveals Turn {location.revealTurn}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <RevealedLocation
      location={location}
      stagedHere={stagedHere}
      matchComplete={matchComplete}
      selectable={selectable}
      invalid={invalid}
      winner={winner}
      onPlace={onPlace}
      onUnstage={onUnstage}
    />
  );
}

function RevealedLocation({
  location,
  stagedHere,
  matchComplete,
  selectable,
  invalid,
  winner,
  onPlace,
  onUnstage,
}: Props) {
  const playerLead = winner === "player";
  const bossLead = winner === "boss";
  const tone = location.theme.color;
  const [artLoaded, setArtLoaded] = useState(false);
  // Not every location has a full-art card yet. If the image is missing/broken,
  // fall back to a themed panel that draws the name + effect text ourselves.
  const [artError, setArtError] = useState(false);
  const hasArt = !!location.theme.imagePath && !artError;

  const ref = useRef<HTMLDivElement>(null);
  const draggingId = useSnapDrag((s) => s.draggingId);
  // Subscribe to a single derived boolean: re-renders only when THIS panel's
  // hover flips, not on every pointer frame.
  const hovered = useSnapDrag((s) => selectable && s.hoveredZoneId === location.id);
  const registerZone = useSnapDrag((s) => s.registerZone);
  const unregisterZone = useSnapDrag((s) => s.unregisterZone);

  // Publish our on-screen rect for the whole time a card is being dragged (NOT
  // gated on `selectable`, which only turns true after the select() flush —
  // gating on it created a race where the zone wasn't registered at drop time).
  // The engine still validates the drop in place(), so registering an illegal
  // target is harmless. Rect is re-measured each drag start (stored outside
  // React, so no renders). Only revealed locations are droppable.
  useEffect(() => {
    const el = ref.current;
    if (!draggingId || !location.isRevealed || matchComplete || !el) {
      unregisterZone(location.id);
      return;
    }
    registerZone({ locationId: location.id, el });
    return () => unregisterZone(location.id);
  }, [draggingId, location.isRevealed, matchComplete, location.id, registerZone, unregisterZone]);

  // Layout: boss cards NORTH of the location, the full-art location card in the
  // middle (name + effect + hex score sockets baked into the image), and the
  // player cards SOUTH. Scores are overlaid onto the baked hex sockets.
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="flex h-full flex-col items-center justify-center gap-1.5"
    >
      {/* ---- Boss cards (NORTH) ---- */}
      <SlotRow cards={location.bossCards} side="boss" max={location.maxSlotsPerSide} />

      {/* ---- Location card (the drop target) ---- */}
      <motion.div
        ref={ref}
        onClick={selectable ? onPlace : undefined}
        animate={invalid ? { x: [0, -7, 7, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
        className={cn(
          "snap-loc-card relative aspect-[1024/1536] w-full max-w-[150px] overflow-hidden rounded-2xl",
          selectable && "snap-loc-selectable cursor-pointer",
          hovered && "snap-loc-drop-hot",
          matchComplete && playerLead && "snap-aura-win",
          matchComplete && bossLead && "snap-aura-lose",
          matchComplete && winner === "tie" && "snap-aura-tie",
          invalid && "snap-loc-flash",
        )}
      >
        {/* Full location card art (name + effect + hex sockets baked in). */}
        {hasArt ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={location.theme.imagePath}
            alt={location.name}
            onLoad={() => setArtLoaded(true)}
            onError={() => setArtError(true)}
            className={cn(
              "pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
              artLoaded ? "opacity-100" : "opacity-0",
            )}
          />
        ) : (
          /* Fallback for locations without generated art yet: themed gradient +
             our own name/effect text, with empty hex sockets drawn in. */
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(14,10,24,0.96), rgba(6,4,10,0.98))" }}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-b opacity-50", location.theme.gradient)} />
            {/* baked-hex stand-ins so scores have a socket to sit on */}
            <div className="snap-hex absolute left-1/2 top-[3%] size-9 -translate-x-1/2 bg-black/55 ring-1 ring-white/15" />
            <div className="snap-hex absolute bottom-[2.5%] left-1/2 size-10 -translate-x-1/2 bg-black/55 ring-1 ring-white/15" />
            <div className="absolute inset-x-2 top-[22%] text-center">
              <div className="flex items-center justify-center gap-1.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                <span className="text-lg">{location.theme.icon}</span>
                <span className="font-display text-base font-black" style={{ color: tone }}>
                  {location.name}
                </span>
              </div>
            </div>
            <div className="absolute inset-x-3 bottom-[16%] text-center text-[11px] leading-tight text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
              {location.effectText}
            </div>
          </div>
        )}

        {/* Boss score — centered on the TOP baked hex socket. */}
        <div className="pointer-events-none absolute left-1/2 top-[5%] z-20 -translate-x-1/2 -translate-y-1/2">
          <SnapLocationScoreBadge value={location.bossPower} tone="boss" leading={bossLead} size="sm" />
        </div>

        {/* Player score — centered on the BOTTOM baked hex socket. */}
        <div className="pointer-events-none absolute bottom-[4.5%] left-1/2 z-20 -translate-x-1/2 translate-y-1/2">
          <SnapLocationScoreBadge value={location.playerPower} tone="player" leading={playerLead} />
        </div>

        {/* selectable / drop hint */}
        {selectable && (
          <div className="absolute right-2 top-2 z-20 rounded-full bg-lime/15 px-2 py-0.5 text-[10px] font-bold text-lime ring-1 ring-lime/40 backdrop-blur-sm">
            {hovered ? "DROP" : "PLACE"}
          </div>
        )}

        {/* completed verdict ribbon */}
        {matchComplete && (
          <motion.div
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className={cn(
              "absolute left-1/2 top-[9%] z-20 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-display font-black tracking-wide",
              playerLead
                ? "bg-lime text-black"
                : bossLead
                  ? "bg-red-500 text-white"
                  : "bg-violet-400 text-black",
            )}
          >
            {playerLead ? "★ WON" : bossLead ? "LOST" : "TIE"}
          </motion.div>
        )}
      </motion.div>

      {/* ---- Player cards (SOUTH) ---- */}
      <SlotRow
        cards={location.playerCards}
        staged={stagedHere}
        side="player"
        max={location.maxSlotsPerSide}
        onUnstage={onUnstage}
      />
    </motion.div>
  );
}
