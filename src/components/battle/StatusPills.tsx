import { Flame, Snowflake, Zap, Brain, TrendingDown, Sparkles, Wind, Shield } from "lucide-react";
import type { StatusEffect, StatusEffectType } from "@/types";
import { cn } from "@/lib/utils/cn";

const meta: Record<StatusEffectType, { icon: typeof Flame; color: string; label: string }> = {
  Burn: { icon: Flame, color: "text-orange-400 border-orange-500/40 bg-orange-500/10", label: "Burn" },
  Chill: { icon: Snowflake, color: "text-sky-300 border-sky-400/40 bg-sky-400/10", label: "Chill" },
  Stun: { icon: Zap, color: "text-yellow-300 border-yellow-400/40 bg-yellow-400/10", label: "Stun" },
  Confused: { icon: Brain, color: "text-fuchsia-300 border-fuchsia-400/40 bg-fuchsia-400/10", label: "Confused" },
  Rugged: { icon: TrendingDown, color: "text-red-400 border-red-500/40 bg-red-500/10", label: "Rugged" },
  Hype: { icon: Sparkles, color: "text-lime border-lime/40 bg-lime/10", label: "Hype" },
  Dodge: { icon: Wind, color: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10", label: "Dodge" },
  ShieldWall: { icon: Shield, color: "text-sky-300 border-sky-400/40 bg-sky-400/10", label: "Shield" },
};

export function StatusPills({ statuses }: { statuses: StatusEffect[] }) {
  if (!statuses.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {statuses.map((s, i) => {
        const m = meta[s.type];
        const Icon = m.icon;
        return (
          <span
            key={`${s.type}_${i}`}
            className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium", m.color)}
            title={`${m.label}${s.amount > 1 ? ` ${s.amount}` : ""}${s.duration > 0 ? ` · ${s.duration}t` : ""}`}
          >
            <Icon className="size-3" />
            {s.amount > 1 ? s.amount : ""}
            {s.duration > 0 ? <span className="opacity-60">{s.duration}t</span> : ""}
          </span>
        );
      })}
    </div>
  );
}
