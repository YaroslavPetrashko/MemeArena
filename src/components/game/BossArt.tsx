"use client";

import { useState } from "react";
import { Skull } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Boss } from "@/types";
import { initials } from "./cardVisuals";

const tierGradient: Record<string, string> = {
  low: "from-emerald-700/50 to-zinc-900",
  medium: "from-sky-700/50 to-zinc-900",
  high: "from-fuchsia-700/50 to-zinc-900",
  event: "from-amber-600/50 to-zinc-900",
  daily: "from-magenta/40 to-zinc-900",
  special: "from-red-700/50 to-zinc-900",
};

export function BossArt({ boss, className }: { boss: Boss; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const grad = tierGradient[boss.rewards_config.tier] ?? tierGradient.low;
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className={cn("absolute inset-0 bg-gradient-to-br", grad)} />
      <Skull className="absolute -right-6 -bottom-6 size-40 text-white/8" strokeWidth={1} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-5xl font-bold text-white/85 drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
          {initials(boss.name)}
        </span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={boss.image_path}
        alt={boss.name}
        onLoad={() => setLoaded(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
    </div>
  );
}
