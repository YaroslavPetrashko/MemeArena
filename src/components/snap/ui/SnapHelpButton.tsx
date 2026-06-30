"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";

/** Quick how-to-play rules for the in-battle popup. */
const RULES: { t: string; d: string }[] = [
  { t: "Goal", d: "Win 2 of the 3 locations — the side with more total Strength at a location takes it." },
  { t: "Energy", d: "You get Energy equal to the turn (1→6). Cards cost Energy; play as many as you can afford." },
  { t: "Place cards", d: "Drag a card onto a glowing location, or tap the card then a location. Drag a staged card off the board to undo." },
  { t: "Reveal", d: "Both sides reveal at once each turn. On Reveal abilities fire when a card flips." },
  { t: "Locations", d: "Each location has an effect and reveals over the first 3 turns — adapt to them." },
  { t: "Timer", d: "45s per turn (top bar + countdown). When it runs out, your turn auto-submits." },
];

/** Floating help button for the battle scene; opens a concise rules popup. */
export function SnapHelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="How to play"
        className="absolute right-3 top-3 z-30 grid size-9 place-items-center rounded-full border border-white/10 bg-black/40 text-white/70 backdrop-blur-md transition-colors hover:border-lime/40 hover:text-white sm:right-5 sm:top-5"
      >
        <HelpCircle className="size-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[70] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 16 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl bg-[#0a0712]/95 p-5 ring-1 ring-white/10"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/10 text-white/70 hover:bg-white/20"
              >
                <X className="size-4" />
              </button>

              <h2 className="font-display text-xl font-bold text-white">How to play</h2>
              <div className="mt-3 space-y-2.5">
                {RULES.map((r) => (
                  <div key={r.t} className="flex gap-2 text-sm">
                    <span className="shrink-0 font-display font-bold text-lime">{r.t}</span>
                    <span className="text-white/75">{r.d}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/faq"
                className="mt-4 inline-block text-xs font-medium text-lime hover:underline"
              >
                Full FAQ →
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
