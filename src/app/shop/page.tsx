"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Gem,
  Check,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CurrencyChip, CurrencyIcon } from "@/components/ui/CurrencyChip";
import { WalletButton } from "@/components/layout/WalletButton";
import { useGameStore, useBalances } from "@/store/gameStore";
import { useMounted } from "@/hooks/useMounted";
import { GEM_PACKAGES, GEM_SINKS } from "@/data/shop";
import { purchaseGems } from "@/lib/wallet/tokenPurchase";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { formatNumber, shortAddress } from "@/lib/utils/format";
import type { GemPackage } from "@/types";

type PurchaseState =
  | { status: "idle" }
  | { status: "processing"; id: string }
  | { status: "success"; id: string; signature: string; mock: boolean }
  | { status: "error"; id: string; message: string };

export default function ShopPage() {
  const mounted = useMounted();
  const balances = useBalances();
  const walletAddress = useGameStore((s) => s.save.profile.walletAddress);
  const creditGems = useGameStore((s) => s.creditGems);
  const [state, setState] = useState<PurchaseState>({ status: "idle" });

  async function handleBuy(pkg: GemPackage) {
    setState({ status: "processing", id: pkg.id });
    try {
      const { signature, mock } = await purchaseGems(pkg);

      // Best-effort server verification (authoritative when configured).
      const supabase = getSupabaseBrowser();
      if (supabase) {
        await supabase.functions
          .invoke("verify-token-purchase", { body: { transaction_signature: signature, package_id: pkg.id } })
          .catch(() => null);
      }
      // Local-first credit so the UI updates immediately.
      creditGems(pkg.gems);
      setState({ status: "success", id: pkg.id, signature, mock });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setState({
        status: "error",
        id: pkg.id,
        message: msg === "PHANTOM_NOT_INSTALLED" ? "Phantom wallet not found" : msg,
      });
    }
  }

  const explorerBase =
    env.solanaNetwork === "mainnet-beta"
      ? "https://solscan.io/tx/"
      : "https://solscan.io/tx/";

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Shop"
        subtitle="Buy Gems with MEMEARENA. Gems unlock extra entries, rerolls, upgrades, and cosmetics."
        action={mounted ? <CurrencyChip kind="gems" value={balances.gems} /> : null}
      />

      {/* Wallet status banner */}
      {mounted && !walletAddress && (
        <Panel className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-gold" />
            <div>
              <p className="font-display font-bold">Connect a wallet to buy with MEMEARENA</p>
              <p className="text-xs text-muted">
                {env.tokenMint
                  ? "On-chain SPL transfer to treasury, verified server-side."
                  : "No token mint configured — purchases run in mock mode for this demo."}
              </p>
            </div>
          </div>
          <WalletButton />
        </Panel>
      )}

      {/* Gem packages */}
      <div>
        <h3 className="mb-3 font-display text-lg font-bold">Gem Packages</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {GEM_PACKAGES.map((pkg) => {
            const busy = state.status === "processing" && state.id === pkg.id;
            const done = state.status === "success" && state.id === pkg.id;
            const err = state.status === "error" && state.id === pkg.id;
            return (
              <motion.div
                key={pkg.id}
                whileHover={{ y: -4 }}
                className={`relative overflow-hidden rounded-2xl border p-5 ${pkg.popular ? "border-magenta/40 bg-magenta/5" : "border-white/10 bg-surface"}`}
              >
                {pkg.popular && (
                  <Badge tone="magenta" className="absolute right-3 top-3"><Sparkles className="size-3" /> Popular</Badge>
                )}
                <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-400/30 to-purple-700/30">
                  <Gem className="size-7 text-fuchsia-300" />
                </div>
                <p className="mt-4 font-display text-3xl font-bold">{formatNumber(pkg.gems)}</p>
                <p className="text-sm text-muted">Gems {pkg.bonusLabel && <span className="text-lime">· {pkg.bonusLabel}</span>}</p>
                <div className="mt-3 flex items-center gap-1.5 text-sm">
                  <CurrencyIcon kind="memearena" />
                  <span className="font-semibold">{formatNumber(pkg.memearenaCost)}</span>
                  <span className="text-muted">MEMEARENA</span>
                </div>

                <Button
                  className="mt-4 w-full"
                  variant={pkg.popular ? "magenta" : "primary"}
                  loading={busy}
                  onClick={() => handleBuy(pkg)}
                >
                  {done ? <Check className="size-4" /> : busy ? <Loader2 className="size-4 animate-spin" /> : <Gem className="size-4" />}
                  {done ? "Purchased!" : busy ? "Processing…" : "Buy with MEMEARENA"}
                </Button>

                {done && state.status === "success" && (
                  <a
                    href={`${explorerBase}${state.signature}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 flex items-center justify-center gap-1 text-[11px] text-lime hover:underline"
                  >
                    {state.mock ? "Mock tx" : "View tx"} {shortAddress(state.signature, 6, 6)} <ExternalLink className="size-3" />
                  </a>
                )}
                {err && state.status === "error" && (
                  <p className="mt-2 text-center text-[11px] text-red-400">{state.message}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Gem sinks reference */}
      <div>
        <h3 className="mb-3 font-display text-lg font-bold">What Gems unlock</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {GEM_SINKS.map((s) => (
            <Panel key={s.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted">{s.description}</p>
              </div>
              <Badge tone="magenta"><Gem className="size-3" /> {s.cost}</Badge>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
