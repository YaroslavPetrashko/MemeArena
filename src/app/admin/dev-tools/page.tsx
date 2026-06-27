"use client";

import { Wrench, Coins, Gem, Layers, RotateCcw } from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useGameStore, useBalances } from "@/store/gameStore";
import { useMounted } from "@/hooks/useMounted";
import { isSupabaseConfigured, isOnchainConfigured, env } from "@/lib/env";

export default function DevToolsPage() {
  const mounted = useMounted();
  const devGrant = useGameStore((s) => s.devGrant);
  const devMaxCards = useGameStore((s) => s.devMaxCards);
  const devResetDaily = useGameStore((s) => s.devResetDaily);
  const balances = useBalances();

  return (
    <div className="space-y-6">
      <SectionTitle title="Dev Tools" subtitle="Local testing utilities. Not part of the production build." />

      <Panel className="p-5">
        <div className="flex items-center gap-2 text-sm">
          <Wrench className="size-4 text-gold" />
          <span className="font-medium">Environment</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge tone={isSupabaseConfigured ? "lime" : "neutral"}>Supabase: {isSupabaseConfigured ? "configured" : "local-only"}</Badge>
          <Badge tone={isOnchainConfigured ? "lime" : "neutral"}>On-chain: {isOnchainConfigured ? "configured" : "mock"}</Badge>
          <Badge tone="neutral">Network: {env.solanaNetwork}</Badge>
          <Badge tone="neutral">RPC: {env.solanaRpcUrl.replace("https://", "")}</Badge>
        </div>
      </Panel>

      <Panel className="p-5">
        <p className="mb-3 font-display font-bold">Grant currencies</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Button variant="ghost" onClick={() => devGrant({ coins: 1000 })}><Coins className="size-4 text-amber-300" /> +1000 Coins</Button>
          <Button variant="ghost" onClick={() => devGrant({ gems: 500 })}><Gem className="size-4 text-fuchsia-300" /> +500 Gems</Button>
        </div>
      </Panel>

      <Panel className="p-5">
        <p className="mb-3 font-display font-bold">Quick actions</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={devMaxCards}><Layers className="size-4" /> Max all cards (Lv 5)</Button>
          <Button variant="ghost" onClick={devResetDaily}><RotateCcw className="size-4" /> Reset daily limits</Button>
        </div>
      </Panel>

      {mounted && (
        <Panel className="p-5 text-xs text-muted">
          <p className="mb-2 font-medium text-foreground">Current balances</p>
          <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-[11px]">
{JSON.stringify(balances, null, 2)}
          </pre>
        </Panel>
      )}
    </div>
  );
}
