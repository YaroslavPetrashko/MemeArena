"use client";

import { motion } from "framer-motion";
import { Shield } from "lucide-react";

/** Bottom objective: the player base/core HP. */
export function PlayerCore({ hp, maxHp, hit }: { hp: number; maxHp: number; hit: boolean }) {
  const frac = Math.max(0, hp / maxHp);
  const danger = frac < 0.3;
  return (
    <motion.div
      className="flex items-center gap-2"
      animate={hit ? { x: [0, -4, 4, 0] } : {}}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="grid size-9 place-items-center rounded-xl border-2"
        style={{ borderColor: danger ? "#ff5a5a" : "#b6ff1b" }}
        animate={{ boxShadow: danger ? ["0 0 12px rgba(255,90,90,0.5)", "0 0 22px rgba(255,90,90,0.9)", "0 0 12px rgba(255,90,90,0.5)"] : "0 0 14px rgba(182,255,27,0.4)" }}
        transition={{ duration: 1, repeat: danger ? Infinity : 0 }}
      >
        <Shield className="size-4" style={{ color: danger ? "#ff5a5a" : "#b6ff1b" }} />
      </motion.div>
      <div className="flex-1">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted">Base HP</span>
          <span className="text-xs tabular-nums" style={{ color: danger ? "#ff8a8a" : "#cdd" }}>
            {Math.ceil(hp).toLocaleString()}/{maxHp.toLocaleString()}
          </span>
        </div>
        <div className="mt-0.5 h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/50">
          <motion.div
            className="h-full rounded-full"
            style={{ background: danger ? "linear-gradient(90deg,#ff3b3b,#ff7a5a)" : "linear-gradient(90deg,#7ab800,#b6ff1b)" }}
            animate={{ width: `${frac * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
