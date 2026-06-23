"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";

/** Segmented energy crystals + glow. Pulses when the player lacks energy. */
export function EnergyMeter({ energy, maxEnergy, pulse }: { energy: number; maxEnergy: number; pulse: boolean }) {
  const full = Math.floor(energy);
  const partial = energy - full;
  return (
    <motion.div
      className="flex items-center gap-1.5"
      animate={pulse ? { x: [0, -4, 4, -2, 0] } : {}}
      transition={{ duration: 0.3 }}
    >
      <Zap className="size-4 shrink-0 text-cyan-300" />
      <div className="flex flex-1 items-center gap-[3px]">
        {Array.from({ length: maxEnergy }).map((_, i) => {
          const fillFrac = i < full ? 1 : i === full ? partial : 0;
          return (
            <div key={i} className="relative h-4 flex-1 overflow-hidden rounded-[3px] border border-white/15 bg-black/40">
              <motion.div
                className="absolute inset-y-0 left-0"
                style={{ background: "linear-gradient(180deg,#7dffff,#1ea8c8)", boxShadow: "0 0 8px rgba(80,220,255,0.8)" }}
                animate={{ width: `${fillFrac * 100}%`, opacity: pulse && fillFrac === 0 ? [1, 0.4, 1] : 1 }}
                transition={{ duration: 0.2 }}
              />
            </div>
          );
        })}
      </div>
      <span className="w-8 shrink-0 text-right text-sm font-bold tabular-nums text-cyan-300">
        {Math.floor(energy)}
      </span>
    </motion.div>
  );
}
