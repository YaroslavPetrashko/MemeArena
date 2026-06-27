"use client";

import { cn } from "@/lib/utils/cn";

interface Props {
  turn: number;
  maxTurns: number;
  energy: number;
  energyLeft: number;
}

/** Turn counter + Meme Energy pips. */
export function SnapTurnHeader({ turn, maxTurns, energy, energyLeft }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Turn</span>
        <span className="font-display text-lg font-black text-gradient tabular-nums">
          {Math.min(turn, maxTurns)}<span className="text-muted text-sm">/{maxTurns}</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wide text-muted mr-1">Meme Energy</span>
        {Array.from({ length: energy }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full ring-1 transition-colors",
              i < energyLeft
                ? "bg-lime ring-lime/60 shadow-[0_0_8px_rgba(182,255,27,0.5)]"
                : "bg-white/5 ring-white/15",
            )}
          />
        ))}
        <span className="ml-1 font-display font-bold text-sm tabular-nums text-lime">
          {energyLeft}
        </span>
      </div>
    </div>
  );
}
