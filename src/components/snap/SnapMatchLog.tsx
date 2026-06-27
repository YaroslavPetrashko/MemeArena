"use client";

import { useEffect, useRef } from "react";
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

export function SnapMatchLog({ log }: { log: SnapEventLogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [log.length]);

  return (
    <div ref={ref} className="h-full overflow-y-auto space-y-1 pr-1 text-[11px] leading-snug">
      {log.slice(-60).map((e) => (
        <div key={e.id} className={cn("flex gap-1.5", KIND_STYLE[e.type] ?? "text-white/70")}>
          <span className="text-white/30 tabular-nums shrink-0">T{e.turn}</span>
          <span>{e.message}</span>
        </div>
      ))}
      {log.length === 0 && <div className="text-muted">The arena awaits…</div>}
    </div>
  );
}
