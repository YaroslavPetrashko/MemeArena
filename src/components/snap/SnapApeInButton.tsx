"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  available: boolean;
  active: boolean;
  multiplier: number;
  onApeIn: () => void;
}

/** "Ape In" — once per match, boosts Coins/XP/score multiplier on a win. */
export function SnapApeInButton({ available, active, multiplier, onApeIn }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (active) {
    return (
      <div className="flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-gold/20 to-magenta/20 ring-1 ring-gold/50 font-display font-bold text-gold text-sm">
        <Flame className="size-4" /> Aped In · {multiplier}× rewards
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={!available}
        onClick={() => setConfirming(true)}
        className={cn(
          "btn-pop w-full h-11 rounded-xl font-display font-bold text-sm inline-flex items-center justify-center gap-2",
          "bg-white/5 ring-1 ring-gold/40 text-gold hover:bg-gold/10",
          "disabled:opacity-30 disabled:cursor-not-allowed",
        )}
      >
        <Flame className="size-4" /> Ape In
      </button>

      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-full mb-2 left-0 right-0 z-20 glass rounded-xl p-3 ring-1 ring-gold/40"
          >
            <p className="text-xs text-white/80 mb-2">
              <span className="text-gold font-bold">Ape In:</span> increase your reward
              multiplier to {multiplier}× if you win. No extra risk to your tokens.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { onApeIn(); setConfirming(false); }}
                className="flex-1 h-8 rounded-lg bg-gradient-to-b from-gold to-amber-600 text-black font-bold text-xs"
              >
                Send It 🔥
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 h-8 rounded-lg bg-white/10 text-white/70 font-medium text-xs"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
