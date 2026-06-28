"use client";

import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useSnapSound } from "./useSnapSound";

interface Props {
  turn: number;
  maxTurns: number;
  revealing: boolean;
  stagedCount: number;
  disabled?: boolean;
  onEndTurn: () => void;
}

/** Major game-action button: angled neon, turn counter, ready/reveal states. */
export function SnapEndTurnButton({
  turn,
  maxTurns,
  revealing,
  stagedCount,
  disabled,
  onEndTurn,
}: Props) {
  const sound = useSnapSound();
  return (
    <motion.button
      type="button"
      disabled={disabled || revealing}
      whileTap={{ scale: 0.95 }}
      animate={revealing ? { scale: [1, 1.04, 1] } : {}}
      transition={revealing ? { repeat: Infinity, duration: 0.7 } : undefined}
      onClick={() => {
        sound.play("endTurn");
        onEndTurn();
      }}
      className={cn(
        "snap-btn-angled group relative h-14 min-w-[150px] px-6 font-display font-black tracking-wide",
        "bg-gradient-to-b from-lime to-lime-deep text-black",
        "shadow-[0_8px_30px_rgba(182,255,27,0.35)] transition-[filter] hover:brightness-110",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
      )}
    >
      <span className="flex flex-col items-center justify-center leading-none">
        <span className="flex items-center gap-1.5 text-base">
          <Swords className="size-4" />
          {revealing ? "REVEALING…" : "END TURN"}
        </span>
        <span className="mt-1 text-[10px] font-bold tracking-[0.2em] text-black/70">
          {revealing
            ? " "
            : stagedCount > 0
              ? `${stagedCount} STAGED · TURN ${Math.min(turn, maxTurns)}/${maxTurns}`
              : `TURN ${Math.min(turn, maxTurns)}/${maxTurns}`}
        </span>
      </span>
    </motion.button>
  );
}
