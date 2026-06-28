"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";

interface Props {
  energy: number;
  energyLeft: number;
  /** Pulse red/cyan to signal "not enough energy". */
  insufficient?: boolean;
}

/** Dramatic Meme Energy orb: glowing core with the current value + spent pips. */
export function SnapEnergyOrb({ energy, energyLeft, insufficient }: Props) {
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        key={energyLeft}
        animate={
          insufficient
            ? { scale: [1, 1.1, 1], transition: { duration: 0.4 } }
            : { scale: [1.12, 1], transition: { duration: 0.5, ease: "easeOut" } }
        }
        className="relative grid size-14 place-items-center"
      >
        {/* rotating ring */}
        <span
          className={cn(
            "snap-orb-ring absolute inset-0 rounded-full border-2 border-dashed",
            insufficient ? "border-red-400/70" : "border-cyan-300/50",
          )}
        />
        {/* glowing core */}
        <span
          className={cn(
            "absolute inset-[5px] rounded-full",
            insufficient
              ? "bg-[radial-gradient(circle_at_35%_30%,#fca5a5,#b91c1c)] shadow-[0_0_22px_rgba(239,68,68,0.6)]"
              : "bg-[radial-gradient(circle_at_35%_30%,#a5f3fc,#0e7490)] shadow-[0_0_22px_rgba(34,211,238,0.55)]",
          )}
        />
        <span className="absolute inset-[5px] rounded-full snap-card-gloss opacity-70" />
        <span className="relative font-display text-xl font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] tabular-nums">
          {energyLeft}
        </span>
      </motion.div>
      {/* pips */}
      <div className="flex items-center gap-1">
        {Array.from({ length: energy }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-2 rounded-full ring-1 transition-colors",
              i < energyLeft
                ? "bg-cyan-300 ring-cyan-200/60 shadow-[0_0_6px_rgba(34,211,238,0.7)]"
                : "bg-white/5 ring-white/15",
            )}
          />
        ))}
      </div>
      <span className="text-[9px] uppercase tracking-[0.18em] text-cyan-200/70">Energy</span>
    </div>
  );
}
