"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { SnapCard as SnapCardType } from "@/types/snap";
import { snapRarityFrame, snapRarityGradient, snapInitials } from "./snapVisuals";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "w-[68px] h-[92px] text-[9px]",
  md: "w-[92px] h-[126px] text-[10px]",
  lg: "w-[120px] h-[164px] text-xs",
};

export interface SnapCardProps {
  card: SnapCardType;
  size?: Size;
  /** Face-down staged/hidden card. */
  faceDown?: boolean;
  selected?: boolean;
  playable?: boolean;
  dimmed?: boolean;
  showAbility?: boolean;
  onClick?: () => void;
  className?: string;
  /** Highlight power delta from base (▲ green / ▼ red). */
  highlightPower?: boolean;
}

export function SnapCard({
  card,
  size = "md",
  faceDown,
  selected,
  playable,
  dimmed,
  showAbility = true,
  onClick,
  className,
  highlightPower,
}: SnapCardProps) {
  const [loaded, setLoaded] = useState(false);
  const buffed = card.currentPower > card.basePower;
  const nerfed = card.currentPower < card.basePower;

  if (faceDown) {
    return (
      <motion.div
        layout
        initial={{ rotateY: 0 }}
        className={cn(
          "relative shrink-0 rounded-lg overflow-hidden ring-1 ring-white/10",
          "bg-gradient-to-br from-[#11111c] to-[#05050a]",
          SIZES[size],
          className,
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="size-7 rounded-md bg-gradient-to-br from-lime/30 to-magenta/30 grid place-items-center font-display font-black text-white/70">
            M
          </div>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(182,255,27,0.12),transparent_60%)]" />
        <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-lg" />
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      whileHover={onClick ? { y: -4, rotate: -0.5 } : undefined}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={cn(
        "group relative shrink-0 rounded-lg overflow-hidden text-left",
        "ring-1 ring-inset",
        snapRarityFrame[card.rarity],
        selected && "ring-2 ring-lime -translate-y-2",
        playable && !selected && "ring-lime/50",
        dimmed && "opacity-40 saturate-50",
        onClick && "cursor-pointer",
        SIZES[size],
        className,
      )}
    >
      {/* art */}
      <div className={cn("absolute inset-0 bg-gradient-to-br", snapRarityGradient[card.rarity])} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display font-bold text-white/80 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
          style={{ fontSize: size === "lg" ? 30 : size === "md" ? 22 : 16 }}>
          {snapInitials(card.name)}
        </span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.imagePath}
        alt={card.name}
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      {/* cost (top-left) */}
      <div className="absolute top-1 left-1 size-5 grid place-items-center rounded-md bg-sky-500 text-white font-display font-black shadow ring-1 ring-white/30"
        style={{ fontSize: size === "sm" ? 9 : 11 }}>
        {card.cost}
      </div>
      {/* power (top-right) */}
      <motion.div
        key={card.currentPower}
        initial={highlightPower ? { scale: 1.6 } : false}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 14 }}
        className={cn(
          "absolute top-1 right-1 size-5 grid place-items-center rounded-md font-display font-black shadow ring-1 ring-white/30",
          buffed ? "bg-lime text-black" : nerfed ? "bg-red-500 text-white" : "bg-amber-400 text-black",
        )}
        style={{ fontSize: size === "sm" ? 9 : 11 }}
      >
        {card.currentPower}
      </motion.div>

      {/* level badge */}
      {card.level > 1 && !card.isToken && (
        <div className="absolute bottom-1 right-1 px-1 rounded bg-black/70 text-[8px] text-gold font-bold ring-1 ring-gold/40">
          L{card.level}
        </div>
      )}

      {/* name + ability */}
      <div className="absolute inset-x-0 bottom-0 p-1">
        <div className="font-display font-bold leading-tight text-white truncate"
          style={{ fontSize: size === "sm" ? 8 : size === "lg" ? 11 : 9 }}>
          {card.name}
        </div>
        {showAbility && size !== "sm" && card.abilityType !== "none" && (
          <div className="text-white/70 leading-snug line-clamp-2 mt-0.5"
            style={{ fontSize: size === "lg" ? 8.5 : 7.5 }}>
            {card.abilityText}
          </div>
        )}
      </div>
    </motion.button>
  );
}
