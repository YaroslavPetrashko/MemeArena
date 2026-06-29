"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpCircle, Lock, Check, Gift } from "lucide-react";
import { SectionTitle } from "@/components/ui/Panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SnapCard } from "@/components/snap/SnapCard";
import { displayCard } from "@/components/snap/displayCard";
import { CurrencyChip, CurrencyIcon } from "@/components/ui/CurrencyChip";
import { useGameStore, useBalances, upgradeCostFor } from "@/store/gameStore";
import { useSnapCardModal } from "@/store/snapCardModalStore";
import { useMounted } from "@/hooks/useMounted";
import { SNAP_CARDS } from "@/data/snapCards";
import { MAX_CARD_LEVEL } from "@/data/upgrades";
import { snapFrameTier } from "@/components/snap/snapVisuals";
import { cn } from "@/lib/utils/cn";
import posthog from "posthog-js";

export default function UpgradesPage() {
  const mounted = useMounted();
  const save = useGameStore((s) => s.save);
  const balances = useBalances();
  const upgradeCard = useGameStore((s) => s.upgradeCard);
  const openCard = useSnapCardModal((s) => s.open);
  const [flash, setFlash] = useState<string | null>(null);

  function doUpgrade(cardId: string) {
    const prevLevel = save.ownedCards[cardId]?.level ?? 1;
    const cost = upgradeCostFor(cardId, prevLevel);
    const res = upgradeCard(cardId);
    if (res.ok) {
      setFlash(cardId);
      setTimeout(() => setFlash(null), 600);
      posthog.capture("card_upgraded", {
        card_id: cardId,
        from_level: prevLevel,
        to_level: prevLevel + 1,
        coins_spent: cost?.coins ?? 0,
        gems_spent: cost?.gems ?? 0,
      });
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Card Upgrades"
        subtitle="Spend Coins and Gems to unlock cosmetic card frames (Bronze → Prismatic). Upgrades are purely cosmetic — Energy and Strength never change."
        action={
          <div className="hidden gap-1.5 sm:flex">
            <CurrencyChip kind="coins" value={mounted ? balances.coins : 0} />
            <CurrencyChip kind="gems" value={mounted ? balances.gems : 0} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SNAP_CARDS.map((card) => {
          const owned = save.ownedCards[card.id];
          const unlocked = owned?.unlocked ?? false;
          const level = owned?.level ?? 1;
          const cost = upgradeCostFor(card.id, level);
          const maxed = level >= MAX_CARD_LEVEL;
          const affordable =
            cost &&
            balances.coins >= cost.coins &&
            balances.gems >= cost.gems;
          const nextTier = snapFrameTier(level + 1);

          return (
            <div
              key={card.id}
              className={cn(
                "flex gap-3 rounded-2xl border border-border bg-card p-3 transition-shadow",
                flash === card.id && "fx-pulse",
              )}
            >
              <div className={cn("shrink-0", !unlocked && "opacity-55 saturate-50")}>
                <SnapCard card={displayCard(card, level)} size="md" onClick={() => openCard(card.id)} />
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-bold">{card.name}</span>
                  {!unlocked ? (
                    <Badge variant="neutral"><Lock className="size-3" /> Locked</Badge>
                  ) : (
                    maxed && <Badge tone="gold"><Check className="size-3" /> Max</Badge>
                  )}
                </div>
                <span className="text-xs text-muted">Lv {level}</span>

                {!unlocked ? (
                  <div className="mt-2 flex flex-1 flex-col justify-between">
                    <p className="text-xs text-muted">Unlock this card from a Mystery Box to upgrade its frame.</p>
                    <Link href="/shop" className="mt-2">
                      <Button size="sm" variant="outline" className="w-full">
                        <Gift className="size-4" /> Open boxes
                      </Button>
                    </Link>
                  </div>
                ) : maxed ? (
                  <p className="mt-2 flex-1 text-xs text-gold">Premium variant unlocked. Fully upgraded.</p>
                ) : (
                  <>
                    <p className="mt-1 flex-1 text-xs text-muted">
                      <span className="text-foreground/80">Next (Lv {level + 1}):</span>{" "}
                      <span style={{ color: nextTier.color }}>{nextTier.name} frame</span>
                    </p>
                    {cost && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <CostChip kind="coins" have={balances.coins} need={cost.coins} />
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
                      {affordable ? "Upgrade" : "Not enough Coins/Gems"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted">
        Tip: earn Coins from battles. Get Gems in the Shop with MEMEARENA.
      </p>
    </div>
  );
}

function CostChip({ kind, have, need }: { kind: "coins" | "gems"; have: number; need: number }) {
  const enough = have >= need;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs tabular-nums", enough ? "border-border text-foreground" : "border-red-500/30 text-red-400")}>
      <CurrencyIcon kind={kind} className="size-3.5" />
      {need}
    </span>
  );
}
