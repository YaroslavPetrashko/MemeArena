"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { SnapMatchState } from "@/types/snap";

/** Lane-by-lane final result strip shown above the board when complete. */
export function SnapScoreSummary({ match }: { match: SnapMatchState }) {
  const s = match.scoring;
  if (!s) return null;

  const verdict =
    s.result === "win" ? "VICTORY" : s.result === "loss" ? "DEFEAT" : "DRAW";
  const verdictColor =
    s.result === "win" ? "text-lime" : s.result === "loss" ? "text-red-400" : "text-white/70";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      <motion.div
        initial={{ y: -10 }}
        animate={{ y: 0 }}
        className={cn("font-display text-3xl font-black tracking-tight", verdictColor)}
      >
        {verdict}
      </motion.div>
      <div className="text-xs text-muted mt-1">
        {s.locationsWon} won · {s.locationsLost} lost · {s.locationsTied} tied · Power{" "}
        {s.playerTotalPower}–{s.bossTotalPower}
      </div>
    </motion.div>
  );
}
