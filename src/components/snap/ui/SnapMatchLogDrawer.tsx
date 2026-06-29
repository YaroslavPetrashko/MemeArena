"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollText, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { SnapEventLogEntry } from "@/types/snap";

const KIND_STYLE: Record<string, string> = {
  turn_start: "text-lime",
  location_reveal: "text-magenta",
  card_reveal: "text-white/80",
  ability: "text-sky-300",
  location_effect: "text-amber-300",
  result: "text-gold font-bold",
  scoring: "text-gold",
  power_change: "text-white/60",
};

/**
 * Collapsed-by-default match log. A small floating button toggles a side
 * drawer; the board is never crowded by event text.
 */
export function SnapMatchLogDrawer({ log }: { log: SnapEventLogEntry[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const last = log[log.length - 1];

  useEffect(() => {
    if (open) ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [log.length, open]);

  return (
    <>
      {/* floating toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed right-3 top-3 z-30 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md transition-colors hover:border-lime/40 hover:text-white sm:right-5 sm:top-5"
      >
        <ScrollText className="size-4 text-lime" />
        <span className="hidden max-w-[180px] truncate sm:inline">
          {last ? last.message : "Match Log"}
        </span>
        <span className="sm:hidden">Log</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 z-50 flex h-full w-[300px] max-w-[85vw] flex-col border-l border-white/10 bg-[#0a0712]/95 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="font-display text-sm font-bold uppercase tracking-wide text-white/80">
                  Match Log
                </span>
                <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>
              <div ref={ref} className="flex-1 space-y-1 overflow-y-auto px-4 py-3 text-[11px] leading-snug">
                {log.slice(-80).map((e) => (
                  <div key={e.id} className={cn("flex gap-1.5", KIND_STYLE[e.type] ?? "text-white/70")}>
                    <span className="shrink-0 tabular-nums text-white/30">T{e.turn}</span>
                    <span>{e.message}</span>
                  </div>
                ))}
                {log.length === 0 && <div className="text-muted">The arena awaits…</div>}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
