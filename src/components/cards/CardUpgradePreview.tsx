"use client";

import { ArrowRight, Coins, Gem, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { STAT_LABELS } from "@/lib/game/cardOvr";
import { statDelta, resolveArenaProfile } from "@/lib/game/cardOvr";
import { getCard } from "@/data/cards";
import type { StatKey } from "@/types/arena";
import type { UpgradeCost } from "@/types";

/** Shows the stat/OVR gains and resource cost for the next level. */
export function CardUpgradePreview({
  cardId,
  level,
  cost,
  owned,
  shards,
  coins,
  gems,
  onUpgrade,
  canUpgrade,
}: {
  cardId: string;
  level: number;
  cost: UpgradeCost | null;
  owned: boolean;
  shards: number;
  coins: number;
  gems: number;
  onUpgrade: () => void;
  canUpgrade: boolean;
}) {
  const card = getCard(cardId);
  const delta = statDelta(cardId, level);
  const cur = resolveArenaProfile(cardId, level);
  const next = level < 5 ? resolveArenaProfile(cardId, level + 1) : null;

  if (level >= 5 || !cost || !next || !cur) {
    return (
      <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-center">
        <Sparkles className="mx-auto size-6 text-gold" />
        <p className="mt-1 font-display font-bold text-gold">Max Level</p>
        <p className="text-xs text-muted">This card is fully upgraded — ultimate unlocked.</p>
      </div>
    );
  }

  const nextLevelDesc = card?.levels[level]?.description;
  const affordCoins = coins >= cost.coins;
  const affordShards = shards >= cost.shards;
  const affordGems = gems >= cost.gems;
  const affordable = affordCoins && affordShards && affordGems;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
        <span className="text-xs text-muted">Overall</span>
        <span className="flex items-center gap-2 font-bold">
          {cur.ovr} <ArrowRight className="size-3.5 text-lime" /> <span className="text-lime">{next.ovr}</span>
        </span>
      </div>

      {/* stat deltas */}
      {delta && Object.keys(delta).length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.entries(delta) as [StatKey, number][]).map(([k, d]) => (
            <div key={k} className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5 text-xs">
              <span className="text-muted">{STAT_LABELS[k]}</span>
              <span className="font-semibold text-lime">+{d}</span>
            </div>
          ))}
        </div>
      )}

      {nextLevelDesc && (
        <p className="rounded-lg border border-magenta/20 bg-magenta/5 px-3 py-2 text-xs text-magenta">
          Lv{level + 1}: {nextLevelDesc}
        </p>
      )}

      {/* cost */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <CostChip icon={Coins} value={cost.coins} ok={affordCoins} />
        <CostChip icon={Sparkles} value={cost.shards} ok={affordShards} label="shards" />
        {cost.gems > 0 && <CostChip icon={Gem} value={cost.gems} ok={affordGems} />}
      </div>

      {owned ? (
        <Button className="w-full" disabled={!canUpgrade || !affordable} onClick={onUpgrade}>
          {affordable ? `Upgrade to Lv${level + 1}` : "Not enough resources"}
        </Button>
      ) : (
        <Button className="w-full" variant="ghost" disabled>
          <Lock className="size-4" /> Not owned yet
        </Button>
      )}
    </div>
  );
}

function CostChip({ icon: Icon, value, ok, label }: { icon: typeof Coins; value: number; ok: boolean; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 ${ok ? "border-white/12 bg-white/5" : "border-red-500/30 bg-red-500/10 text-red-300"}`}>
      <Icon className="size-3.5" /> {value.toLocaleString()}{label ? ` ${label}` : ""}
    </span>
  );
}
