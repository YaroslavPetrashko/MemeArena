"use client";

import { useState } from "react";
import { ArrowUpCircle, Lock, Check } from "lucide-react";
import { SectionTitle } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SnapCard } from "@/components/snap/SnapCard";
import { displayCard } from "@/components/snap/displayCard";
import { CurrencyChip, CurrencyIcon } from "@/components/ui/CurrencyChip";
import { useGameStore, useBalances, upgradeCostFor } from "@/store/gameStore";
import { useSnapCardModal } from "@/store/snapCardModalStore";
import { useMounted } from "@/hooks/useMounted";
import { SNAP_CARDS } from "@/data/snapCards";
import { MAX_CARD_LEVEL } from "@/data/upgrades";
import { cn } from "@/lib/utils/cn";

export default function UpgradesPage() {
  const mounted = useMounted();
  const save = useGameStore((s) => s.save);
  const balances = useBalances();
  const upgradeCard = useGameStore((s) => s.upgradeCard);
  const openCard = useSnapCardModal((s) => s.open);
  const [flash, setFlash] = useState<string | null>(null);

  function doUpgrade(cardId: string) {
    const res = upgradeCard(cardId);
    if (res.ok) {
      setFlash(cardId);
      setTimeout(() => setFlash(null), 600);
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Card Upgrades"
        subtitle="Spend Coins, Shards, and Gems to level cards up to a Level-5 premium variant."
        action={
          <div className="hidden gap-1.5 sm:flex">
            <CurrencyChip kind="coins" value={mounted ? balances.coins : 0} />
            <CurrencyChip kind="shards" value={mounted ? balances.shards : 0} />
            <CurrencyChip kind="gems" value={mounted ? balances.gems : 0} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SNAP_CARDS.map((card) => {
          const owned = save.ownedCards[card.id];
          const level = owned?.level ?? 1;
          const cost = upgradeCostFor(card.id, level);
          const maxed = level >= MAX_CARD_LEVEL;
          const affordable =
            cost &&
            balances.coins >= cost.coins &&
            balances.shards >= cost.shards &&
            balances.gems >= cost.gems;
          const nextDesc = card.levels.find((l) => l.level === level + 1)?.description;

          return (
            <div
              key={card.id}
              className={cn(
                "flex gap-3 rounded-2xl border border-white/10 bg-surface p-3 transition-shadow",
                flash === card.id && "fx-pulse",
              )}
            >
              <div className="shrink-0">
                <SnapCard card={displayCard(card, level)} size="md" onClick={() => openCard(card.id)} />
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-bold">{card.name}</span>
                  {maxed && <Badge tone="gold"><Check className="size-3" /> Max</Badge>}
                </div>
                <span className="text-xs text-muted">Lv {level}</span>

                {maxed ? (
                  <p className="mt-2 flex-1 text-xs text-gold">Premium variant unlocked. Fully upgraded.</p>
                ) : (
                  <>
                    <p className="mt-1 flex-1 text-xs text-muted">
                      <span className="text-foreground/80">Next (Lv {level + 1}):</span> {nextDesc}
                    </p>
                    {cost && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <CostChip kind="coins" have={balances.coins} need={cost.coins} />
                        {cost.shards > 0 && <CostChip kind="shards" have={balances.shards} need={cost.shards} />}
                        {cost.gems > 0 && <CostChip kind="gems" have={balances.gems} need={cost.gems} />}
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="mt-3 w-full"
                      disabled={!affordable}
                      onClick={() => doUpgrade(card.id)}
                    >
                      {affordable ? <ArrowUpCircle className="size-4" /> : <Lock className="size-4" />}
                      {affordable ? "Upgrade" : "Need more materials"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted">
        Tip: earn Shards from bosses and Survival. Get Gems in the Shop with MEMEARENA.
      </p>
    </div>
  );
}

function CostChip({ kind, have, need }: { kind: "coins" | "shards" | "gems"; have: number; need: number }) {
  const enough = have >= need;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs tabular-nums", enough ? "border-white/10 text-foreground" : "border-red-500/30 text-red-400")}>
      <CurrencyIcon kind={kind} className="size-3.5" />
      {need}
    </span>
  );
}
