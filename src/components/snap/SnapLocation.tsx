"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { SnapLocation as SnapLocationType } from "@/types/snap";
import { SnapCard } from "./SnapCard";

interface Props {
  location: SnapLocationType;
  /** Cards the player has staged here this turn (face-down preview). */
  stagedHere: SnapLocationType["playerCards"];
  matchComplete: boolean;
  selectable: boolean;
  invalid: boolean;
  winner?: "player" | "boss" | "tie";
  onPlace: () => void;
  onUnstage: (instanceId: string) => void;
}

function Slots({
  cards,
  staged,
  side,
  max,
  onUnstage,
}: {
  cards: SnapLocationType["playerCards"];
  staged?: SnapLocationType["playerCards"];
  side: "player" | "boss";
  max: number;
  onUnstage?: (id: string) => void;
}) {
  const all = [...cards, ...(staged ?? [])];
  return (
    <div className={cn("flex flex-wrap gap-1 justify-center min-h-[96px] items-center", side === "boss" && "items-start")}>
      <AnimatePresence>
        {all.map((c) => {
          const isStaged = staged?.some((s) => s.instanceId === c.instanceId);
          const faceDown = side === "boss" ? !c.isRevealed : isStaged ? false : !c.isRevealed;
          return (
            <SnapCard
              key={c.instanceId}
              card={c}
              size="sm"
              faceDown={faceDown && !isStaged}
              showAbility={false}
              highlightPower
              onClick={isStaged && onUnstage ? () => onUnstage(c.instanceId) : undefined}
              className={isStaged ? "ring-2 ring-lime/70 animate-pulse" : undefined}
            />
          );
        })}
      </AnimatePresence>
      {/* empty slot hints */}
      {Array.from({ length: Math.max(0, max - all.length) }).map((_, i) => (
        <div key={`empty-${i}`} className="w-[68px] h-[92px] rounded-lg border border-dashed border-white/10" />
      ))}
    </div>
  );
}

export function SnapLocation({
  location,
  stagedHere,
  matchComplete,
  selectable,
  invalid,
  winner,
  onPlace,
  onUnstage,
}: Props) {
  if (!location.isRevealed) {
    return (
      <div className="relative rounded-2xl glass overflow-hidden min-h-[280px] grid place-items-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,43,214,0.10),transparent_70%)] fx-pulse" />
        <div className="text-center px-4">
          <div className="text-3xl mb-2 opacity-70 animate-pulse">❓</div>
          <div className="font-display font-bold text-white/80">Mystery Location</div>
          <div className="text-xs text-muted mt-1">Reveals Turn {location.revealTurn}</div>
        </div>
      </div>
    );
  }

  const playerLead = winner === "player";
  const bossLead = winner === "boss";

  return (
    <motion.div
      onClick={selectable ? onPlace : undefined}
      animate={invalid ? { x: [0, -6, 6, -4, 4, 0] } : {}}
      transition={{ duration: 0.4 }}
      className={cn(
        "relative rounded-2xl overflow-hidden glass flex flex-col",
        selectable && "cursor-pointer ring-1 ring-lime/40 hover:ring-lime/70",
        matchComplete && playerLead && "ring-2 ring-lime fx-pulse",
        matchComplete && bossLead && "ring-2 ring-red-500/60",
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-b opacity-30", location.theme.gradient)} />

      {/* Boss side */}
      <div className="relative px-2 pt-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className={cn("text-xs font-display font-bold tabular-nums px-1.5 rounded",
            bossLead ? "text-red-300 bg-red-500/15" : "text-white/60")}>
            {location.bossPower}
          </span>
        </div>
        <Slots cards={location.bossCards} side="boss" max={location.maxSlotsPerSide} />
      </div>

      {/* Location header */}
      <div className="relative my-1.5 px-3 py-1.5 text-center border-y border-white/10 bg-black/30">
        <div className="flex items-center justify-center gap-1.5">
          <span>{location.theme.icon}</span>
          <span className="font-display font-bold text-sm" style={{ color: location.theme.color }}>
            {location.name}
          </span>
        </div>
        <div className="text-[10px] text-white/60 leading-tight mt-0.5">{location.effectText}</div>
      </div>

      {/* Player side */}
      <div className="relative px-2 pb-2">
        <Slots cards={location.playerCards} staged={stagedHere} side="player" max={location.maxSlotsPerSide} onUnstage={onUnstage} />
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className={cn("text-sm font-display font-black tabular-nums px-2 rounded",
            playerLead ? "text-lime bg-lime/15" : "text-white/80")}>
            {location.playerPower}
          </span>
        </div>
      </div>

      {matchComplete && (
        <div className={cn("absolute top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold",
          playerLead ? "bg-lime text-black" : bossLead ? "bg-red-500 text-white" : "bg-white/20 text-white")}>
          {playerLead ? "WON" : bossLead ? "LOST" : "TIE"}
        </div>
      )}
    </motion.div>
  );
}
