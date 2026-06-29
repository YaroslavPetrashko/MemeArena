"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Gift,
  Loader2,
  Check,
  AlertTriangle,
  ExternalLink,
  Clock,
  Coins,
} from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletButton } from "@/components/layout/WalletButton";
import { EmptyState } from "@/components/common/EmptyState";
import { useGameStore, useBalances } from "@/store/gameStore";
import { useMounted } from "@/hooks/useMounted";
import { claimRewards } from "@/lib/wallet/tokenClaim";
import { env } from "@/lib/env";
import { formatToken, shortAddress } from "@/lib/utils/format";
import { GAME_MODES_BY_ID } from "@/data/modes";
import { SAFETY_COPY } from "@/data/rewardEconomy";
import posthog from "posthog-js";

type ClaimState =
  | { status: "idle" }
  | { status: "processing" }
  | { status: "success"; signature: string; amount: number; mock: boolean }
  | { status: "error"; message: string };

export default function ClaimPage() {
  const mounted = useMounted();
  const save = useGameStore((s) => s.save);
  const balances = useBalances();
  const applyClaim = useGameStore((s) => s.applyClaim);
  const walletAddress = save.profile.walletAddress;
  const [state, setState] = useState<ClaimState>({ status: "idle" });

  const approved = balances.approvedMemearena;
  const ledger = save.rewardLedger.filter((r) => r.currency === "MEMEARENA");

  async function handleClaim() {
    if (!walletAddress || approved <= 0) return;
    setState({ status: "processing" });
    posthog.capture("token_claim_initiated", {
      approved_amount: approved,
      wallet_address: walletAddress,
    });
    try {
      const res = await claimRewards(walletAddress);
      const amount = res.amount > 0 ? res.amount : approved;
      applyClaim(amount, res.signature);
      setState({ status: "success", signature: res.signature, amount, mock: res.mock });
      posthog.capture("token_claim_completed", {
        amount,
        mock: res.mock,
        signature: res.signature,
        wallet_address: walletAddress,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Claim failed";
      setState({ status: "error", message: msg });
      posthog.captureException(e instanceof Error ? e : new Error(msg));
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Claim MEMEARENA" subtitle="Your gameplay rewards, validated and ready to claim on-chain." />

      {/* Balance cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BalanceCard label="Pending validation" value={mounted ? balances.pendingMemearena : 0} icon={Clock} tone="muted" />
        <BalanceCard label="Approved · claimable" value={mounted ? approved : 0} icon={Gift} tone="lime" highlight />
        <BalanceCard label="Claimed lifetime" value={mounted ? balances.claimedMemearena : 0} icon={Coins} tone="gold" />
      </div>

      {/* Claim action */}
      <Panel className="p-6">
        {mounted && !walletAddress ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="size-8 text-gold" />
            <div>
              <p className="font-display text-lg font-bold">Connect your wallet to claim</p>
              <p className="text-sm text-muted">MEMEARENA rewards are paid to your connected Solana wallet.</p>
            </div>
            <WalletButton />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted">Claimable now</p>
            <p className="font-display text-4xl font-bold text-lime">{formatToken(approved)}</p>
            {approved <= 0 && balances.pendingMemearena > 0 && (
              <Badge tone="neutral"><Clock className="size-3" /> Rewards pending validation</Badge>
            )}
            <Button
              size="lg"
              disabled={approved <= 0 || state.status === "processing"}
              onClick={handleClaim}
            >
              {state.status === "processing" ? <Loader2 className="size-5 animate-spin" /> : <Gift className="size-5" />}
              {state.status === "processing" ? "Claiming…" : `Claim ${formatToken(approved, "")}`}
            </Button>

            {state.status === "success" && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-2 w-full rounded-xl border border-lime/30 bg-lime/5 p-4">
                <p className="flex items-center justify-center gap-2 font-medium text-lime">
                  <Check className="size-4" /> Claimed {formatToken(state.amount)}
                </p>
                <a
                  href={`https://solscan.io/tx/${state.signature}${env.solanaNetwork === "devnet" ? "?cluster=devnet" : ""}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex items-center justify-center gap-1 text-xs text-lime/80 hover:underline"
                >
                  {state.mock ? "Mock signature" : "Transaction"}: {shortAddress(state.signature, 6, 6)} <ExternalLink className="size-3" />
                </a>
                {state.mock && (
                  <p className="mt-2 text-center text-[11px] text-muted">
                    Devnet/mock mode — no real tokens moved. Configure a reward vault for live payouts.
                  </p>
                )}
              </motion.div>
            )}
            {state.status === "error" && (
              <p className="text-xs text-red-400">{state.message}</p>
            )}
          </div>
        )}
      </Panel>

      {/* History */}
      <div>
        <h3 className="mb-3 font-display text-lg font-bold">Reward History</h3>
        {ledger.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No rewards yet"
            description="Win battles to earn MEMEARENA. Rewards appear here as pending, then approved, then claimed."
          />
        ) : (
          <Panel className="divide-y divide-white/5 overflow-hidden">
            {ledger.slice(0, 30).map((r) => {
              const modeName = GAME_MODES_BY_ID[(r.metadata?.mode as keyof typeof GAME_MODES_BY_ID) ?? "arena"]?.name ?? "Battle";
              const tone = r.status === "claimed" ? "gold" : r.status === "approved" ? "lime" : r.status === "review" ? "danger" : "neutral";
              return (
                <div key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{modeName.split(" — ")[0]}</p>
                    <p className="text-[11px] text-muted">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={tone as "lime" | "gold" | "danger" | "neutral"}>{r.status}</Badge>
                    <span className="font-display font-bold tabular-nums text-lime">+{formatToken(r.amount, "")}</span>
                  </div>
                </div>
              );
            })}
          </Panel>
        )}
      </div>

      <div className="rounded-xl border border-white/8 bg-black/20 p-4 text-center text-xs text-muted">
        {SAFETY_COPY.rewards} {SAFETY_COPY.advice}
      </div>
    </div>
  );
}

function BalanceCard({
  label,
  value,
  icon: Icon,
  tone,
  highlight,
}: {
  label: string;
  value: number;
  icon: typeof Gift;
  tone: "muted" | "lime" | "gold";
  highlight?: boolean;
}) {
  const color = tone === "lime" ? "text-lime" : tone === "gold" ? "text-gold" : "text-muted";
  return (
    <Panel className={`p-5 ${highlight ? "border-lime/30" : ""}`}>
      <div className="flex items-center gap-2 text-xs text-muted">
        <Icon className={`size-4 ${color}`} /> {label}
      </div>
      <p className={`mt-2 font-display text-2xl font-bold ${color}`}>{formatToken(value, "")}</p>
      <p className="text-[10px] text-muted">MEMEARENA</p>
    </Panel>
  );
}
