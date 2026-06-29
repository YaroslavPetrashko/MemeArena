"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gem,
  Check,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Gift,
} from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui/Panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CurrencyChip, CurrencyIcon } from "@/components/ui/CurrencyChip";
import { WalletButton } from "@/components/layout/WalletButton";
import { SnapCard } from "@/components/snap/SnapCard";
import { displayCard } from "@/components/snap/displayCard";
import { useGameStore, useBalances } from "@/store/gameStore";
import { useMounted } from "@/hooks/useMounted";
import { GEM_PACKAGES, GEM_SINKS, MYSTERY_BOX } from "@/data/shop";
import { SNAP_CARDS, SNAP_CARDS_BY_ID } from "@/data/snapCards";
import { purchaseGems } from "@/lib/wallet/tokenPurchase";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { formatNumber, shortAddress } from "@/lib/utils/format";
import type { GemPackage } from "@/types";
import posthog from "posthog-js";

type PurchaseState =
  | { status: "idle" }
  | { status: "processing"; id: string }
  | { status: "success"; id: string; signature: string; mock: boolean }
  | { status: "error"; id: string; message: string };

type BoxState =
  | { status: "idle" }
  | { status: "opening" }
  | { status: "card"; cardId: string }
  | { status: "coins"; coins: number }
  | { status: "error"; message: string };

export default function ShopPage() {
  const mounted = useMounted();
  const balances = useBalances();
  const walletAddress = useGameStore((s) => s.save.profile.walletAddress);
  const creditGems = useGameStore((s) => s.creditGems);
  const openMysteryBox = useGameStore((s) => s.openMysteryBox);
  const ownedCards = useGameStore((s) => s.save.ownedCards);
  const [state, setState] = useState<PurchaseState>({ status: "idle" });
  const [box, setBox] = useState<BoxState>({ status: "idle" });

  const ownedCount = SNAP_CARDS.filter((c) => ownedCards[c.id]?.unlocked).length;
  const allUnlocked = ownedCount >= SNAP_CARDS.length;
  const canOpenBox = balances.gems >= MYSTERY_BOX.costGems;

  function openBox() {
    if (!canOpenBox) {
      setBox({ status: "error", message: "Not enough Gems" });
      return;
    }
    setBox({ status: "opening" });
    // Brief suspense before the reveal.
    setTimeout(() => {
      const res = openMysteryBox();
      if (!res.ok) {
        setBox({ status: "error", message: "Not enough Gems" });
        return;
      }
      if (res.kind === "card") {
        setBox({ status: "card", cardId: res.cardId });
        posthog.capture("mystery_box_opened", { result: "card", card_id: res.cardId });
      } else {
        setBox({ status: "coins", coins: res.coins });
        posthog.capture("mystery_box_opened", { result: "coins", coins: res.coins });
      }
    }, 650);
  }

  async function handleBuy(pkg: GemPackage) {
    setState({ status: "processing", id: pkg.id });
    posthog.capture("gem_purchase_initiated", {
      package_id: pkg.id,
      gems: pkg.gems,
      memearena_cost: pkg.memearenaCost,
      is_popular: pkg.popular ?? false,
    });
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
      posthog.capture("gem_purchase_completed", {
        package_id: pkg.id,
        gems: pkg.gems,
        memearena_cost: pkg.memearenaCost,
        mock,
        signature,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setState({
        status: "error",
        id: pkg.id,
        message: msg === "PHANTOM_NOT_INSTALLED" ? "Phantom wallet not found" : msg,
      });
      posthog.capture("gem_purchase_failed", {
        package_id: pkg.id,
        gems: pkg.gems,
        memearena_cost: pkg.memearenaCost,
        error: msg,
      });
      posthog.captureException(e instanceof Error ? e : new Error(msg));
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

      {/* Mystery boxes — unlock new cards */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Mystery Boxes</h3>
          <Badge variant="neutral">{mounted ? ownedCount : SNAP_CARDS.length}/{SNAP_CARDS.length} cards</Badge>
        </div>
        <Panel className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-primary/30 to-magenta/30">
              <Gift className="size-8 text-primary" />
            </div>
            <div>
              <p className="font-display text-lg font-bold">{MYSTERY_BOX.name}</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {allUnlocked
                  ? `Every card unlocked — boxes now pay ${MYSTERY_BOX.consolationCoins} Coins.`
                  : "Unlocks a random card you don't own yet. Build out your collection."}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-1">
            <Button size="lg" disabled={!canOpenBox} onClick={openBox}>
              <Gem className="size-4" /> Open · {MYSTERY_BOX.costGems}
            </Button>
            {box.status === "error" && <p className="text-center text-[11px] text-red-400">{box.message}</p>}
          </div>
        </Panel>
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

      {/* Mystery box reveal */}
      <AnimatePresence>
        {(box.status === "opening" || box.status === "card" || box.status === "coins") && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setBox({ status: "idle" })}
          >
            <motion.div
              className="relative w-full max-w-xs rounded-2xl border border-border bg-card p-6 text-center"
              initial={{ scale: 0.9, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {box.status === "opening" && (
                <div className="py-6">
                  <Loader2 className="mx-auto size-9 animate-spin text-primary" />
                  <p className="mt-3 font-display font-bold">Opening box…</p>
                </div>
              )}

              {box.status === "card" && (() => {
                const def = SNAP_CARDS_BY_ID[box.cardId];
                if (!def) return null;
                return (
                  <>
                    <Badge variant="success" className="mb-3"><Sparkles className="size-3" /> New card unlocked!</Badge>
                    <motion.div
                      className="mx-auto w-fit"
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 220, damping: 20 }}
                    >
                      <SnapCard card={displayCard(def, 1)} size="lg" />
                    </motion.div>
                    <p className="mt-3 font-display text-lg font-bold">{def.name}</p>
                    <Button className="mt-4 w-full" onClick={() => setBox({ status: "idle" })}>Add to collection</Button>
                  </>
                );
              })()}

              {box.status === "coins" && (
                <>
                  <Badge variant="neutral" className="mb-3">Collection complete</Badge>
                  <div className="grid place-items-center py-3"><CurrencyIcon kind="coins" /></div>
                  <p className="font-display text-2xl font-bold text-gold">+{box.coins} Coins</p>
                  <Button className="mt-4 w-full" onClick={() => setBox({ status: "idle" })}>Sweet</Button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
