"use client";

import Link from "next/link";
import { useBalances } from "@/store/gameStore";
import { useMounted } from "@/hooks/useMounted";
import { CurrencyChip } from "@/components/ui/CurrencyChip";

export function CurrencyHud({ compact }: { compact?: boolean }) {
  const mounted = useMounted();
  const balances = useBalances();

  if (!mounted) {
    return <div className="h-8 w-48 rounded-full bg-secondary animate-pulse" />;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <CurrencyChip kind="coins" value={balances.coins} />
      <CurrencyChip kind="gems" value={balances.gems} />
      <Link href="/claim" title="Claimable MEMEARENA">
        <CurrencyChip
          kind="memearena"
          value={balances.approvedMemearena}
          decimals
          className="border-lime/30 bg-lime/10 hover:bg-lime/20 transition-colors"
        />
      </Link>
    </div>
  );
}
