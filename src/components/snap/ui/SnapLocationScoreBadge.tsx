"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { numberPop } from "./snapMotion";

type Tone = "player" | "boss" | "neutral";

const TONE: Record<Tone, { lead: string; flat: string }> = {
  player: {
    lead: "bg-gradient-to-b from-lime to-lime-deep text-black ring-lime/60 shadow-[0_0_14px_rgba(182,255,27,0.45)]",
    flat: "bg-black/45 text-white/85 ring-white/15",
  },
  boss: {
    lead: "bg-gradient-to-b from-red-400 to-red-700 text-white ring-red-300/60 shadow-[0_0_14px_rgba(255,60,90,0.4)]",
    flat: "bg-black/45 text-white/85 ring-white/15",
  },
  neutral: {
    lead: "bg-gradient-to-b from-violet-300 to-violet-600 text-white ring-violet-200/50",
    flat: "bg-black/45 text-white/85 ring-white/15",
  },
};

/** Hex power badge for a location side. Pops when the value changes. */
export function SnapLocationScoreBadge({
  value,
  tone,
  leading,
  size = "md",
}: {
  value: number;
  tone: Tone;
  leading: boolean;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "min-w-[34px] h-7 text-[13px]" : "min-w-[42px] h-9 text-base";
  return (
    <motion.div
      key={value}
      variants={numberPop}
      initial="hidden"
      animate="shown"
      className={cn(
        "grid place-items-center px-2 font-display font-black tabular-nums snap-hex ring-1",
        dims,
        leading ? TONE[tone].lead : TONE[tone].flat,
      )}
    >
      {value}
    </motion.div>
  );
}
