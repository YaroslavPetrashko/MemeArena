"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  onRetreat: () => void;
  disabled?: boolean;
}

/** Retreat with a confirmation popover (leaving forfeits the match). */
export function SnapRetreatButton({ onRetreat, disabled }: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="relative">
      <motion.button
        type="button"
        disabled={disabled}
        whileTap={{ scale: 0.95 }}
        onClick={() => setConfirming(true)}
        className={cn(
          "snap-btn-angled-l h-12 px-5 font-display font-bold tracking-wide",
          "bg-gradient-to-b from-rose-700/80 to-red-950/80 text-white/90 ring-1 ring-inset ring-red-400/30",
          "transition-[filter] hover:brightness-125 disabled:opacity-40",
        )}
      >
        <span className="flex items-center gap-1.5 text-sm">
          <Flag className="size-4" /> RETREAT
        </span>
      </motion.button>

      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-full left-0 z-30 mb-2 w-56 rounded-xl bg-black/85 p-3 ring-1 ring-red-400/30 backdrop-blur-md"
          >
            <p className="mb-2 text-xs text-white/80">
              <span className="font-bold text-red-300">Retreat?</span> You forfeit this match. Any
              entry cost is not refunded.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onRetreat}
                className="h-8 flex-1 rounded-lg bg-gradient-to-b from-red-500 to-red-700 text-xs font-bold text-white"
              >
                Retreat
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="h-8 flex-1 rounded-lg bg-white/10 text-xs font-medium text-white/70"
              >
                Stay
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
