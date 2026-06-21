"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { Card } from "@/types";
import { rarityGradient, roleIcon, initials } from "./cardVisuals";

/**
 * Placeholder-safe card artwork. Renders a rarity gradient + initials + role
 * icon silhouette. If a real image exists at `card.image_path` it layers on top;
 * a load error keeps the polished placeholder, so there are never broken images.
 *
 * Drop real art into /public/cards/<slug>.png later — no code changes needed.
 */
export function CardArt({ card, className }: { card: Card; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const Icon = roleIcon[card.role];

  return (
    <div className={cn("relative w-full overflow-hidden", className)}>
      <div className={cn("absolute inset-0 bg-gradient-to-br", rarityGradient[card.rarity])} />
      {/* faint silhouette icon */}
      <Icon className="absolute -right-3 -bottom-3 size-28 text-white/10" strokeWidth={1.2} />
      {/* initials monogram */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-4xl font-bold text-white/85 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
          {initials(card.name)}
        </span>
      </div>
      {/* real image overlay (hidden until successfully loaded) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.image_path}
        alt={card.name}
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
    </div>
  );
}
