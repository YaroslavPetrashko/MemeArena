import { Coins, Gem, Sparkles, Ticket, Zap, Trophy } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";

export type CurrencyKind = "coins" | "gems" | "shards" | "tickets" | "xp" | "memearena";

const config: Record<CurrencyKind, { icon: typeof Coins; color: string; label: string }> = {
  coins: { icon: Coins, color: "text-amber-300", label: "Coins" },
  gems: { icon: Gem, color: "text-fuchsia-300", label: "Gems" },
  shards: { icon: Sparkles, color: "text-sky-300", label: "Shards" },
  tickets: { icon: Ticket, color: "text-lime", label: "Arena Tickets" },
  xp: { icon: Zap, color: "text-violet-300", label: "XP" },
  memearena: { icon: Trophy, color: "text-lime", label: "MEMEARENA" },
};

export function CurrencyIcon({ kind, className }: { kind: CurrencyKind; className?: string }) {
  const Icon = config[kind].icon;
  return <Icon className={cn("size-4", config[kind].color, className)} />;
}

export function CurrencyChip({
  kind,
  value,
  className,
  decimals = false,
}: {
  kind: CurrencyKind;
  value: number;
  className?: string;
  decimals?: boolean;
}) {
  const { icon: Icon, color } = config[kind];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-sm tabular-nums",
        className,
      )}
      title={config[kind].label}
    >
      <Icon className={cn("size-4", color)} />
      <span className="font-medium">
        {decimals ? (Math.round(value * 100) / 100).toLocaleString() : formatNumber(value)}
      </span>
    </div>
  );
}

export { config as currencyConfig };
