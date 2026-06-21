"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { Card } from "@/types";
import { CardArt } from "./CardArt";
import { rarityGlow } from "./cardVisuals";
import { RarityBadge } from "@/components/ui/Badge";

export function GameCard({
  card,
  level = 1,
  cost,
  selected,
  disabled,
  dimmed,
  onClick,
  footer,
  className,
  interactive = true,
}: {
  card: Card;
  level?: number;
  cost?: number;
  selected?: boolean;
  disabled?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  footer?: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  const effectiveCost = cost ?? card.base_cost;
  const desc = card.levels[Math.min(level, card.levels.length) - 1]?.description ?? "";

  return (
    <motion.div
      layout
      whileHover={interactive && !disabled ? { y: -6, scale: 1.02 } : undefined}
      whileTap={interactive && !disabled ? { scale: 0.98 } : undefined}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-2xl border bg-surface text-left",
        rarityGlow[card.rarity],
        selected ? "border-lime ring-2 ring-lime/60" : "border-white/10",
        disabled && "opacity-50",
        dimmed && "grayscale opacity-60",
        interactive && !disabled && "cursor-pointer",
        className,
      )}
    >
      <div className="relative">
        <CardArt card={card} className="aspect-[4/3]" />
        {/* Energy cost */}
        <div className="absolute left-2 top-2 flex size-8 items-center justify-center rounded-full bg-gradient-to-b from-lime to-lime-deep text-sm font-bold text-black shadow-lg">
          {effectiveCost}
        </div>
        {/* Level pips */}
        <div className="absolute right-2 top-2 flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                i < level ? "bg-gold shadow-[0_0_6px_rgba(255,210,74,0.8)]" : "bg-white/20",
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-bold leading-tight">{card.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <RarityBadge rarity={card.rarity} />
          <span className="text-[10px] uppercase tracking-wider text-muted">{card.role}</span>
        </div>
        <p className="mt-0.5 line-clamp-3 text-xs leading-snug text-muted">{desc}</p>
        {footer && <div className="mt-auto pt-2">{footer}</div>}
      </div>
    </motion.div>
  );
}
