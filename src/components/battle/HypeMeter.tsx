"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";

/** Hype/ultimate meter. Glows + becomes a button when ready. */
export function HypeMeter({ hype, ready, onActivate }: { hype: number; ready: boolean; onActivate: () => void }) {
  return (
    <motion.button
      onClick={ready ? onActivate : undefined}
      disabled={!ready}
      className="relative flex w-full items-center gap-2 overflow-hidden rounded-xl border px-3 py-1.5 text-left"
      style={{ borderColor: ready ? "#ffd24a" : "rgba(255,255,255,0.12)", cursor: ready ? "pointer" : "default" }}
      animate={ready ? { boxShadow: ["0 0 10px rgba(255,210,74,0.4)", "0 0 26px rgba(255,210,74,0.9)", "0 0 10px rgba(255,210,74,0.4)"] } : {}}
      transition={{ duration: 0.9, repeat: ready ? Infinity : 0 }}
      whileTap={ready ? { scale: 0.97 } : undefined}
    >
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: `${hype}%`,
          background: ready
            ? "linear-gradient(90deg,#ff8a00,#ffd24a,#ff2bd6)"
            : "linear-gradient(90deg,#b30090,#ff2bd6)",
          opacity: 0.5,
        }}
      />
      <Flame className="relative size-4 shrink-0" style={{ color: ready ? "#ffd24a" : "#ff2bd6" }} />
      <span className="relative text-xs font-bold uppercase tracking-wider" style={{ color: ready ? "#ffd24a" : "#ff9ae8" }}>
        {ready ? "Unleash Hype!" : "Hype"}
      </span>
      <span className="relative ml-auto text-xs tabular-nums text-muted">{Math.floor(hype)}%</span>
    </motion.button>
  );
}
