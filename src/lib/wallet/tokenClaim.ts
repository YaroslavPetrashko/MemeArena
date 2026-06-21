"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isOnchainConfigured } from "@/lib/env";

export interface ClaimResult {
  signature: string;
  amount: number;
  mock: boolean;
  status: "completed" | "processing" | "failed";
}

/**
 * Claim accumulated, server-approved MEMEARENA rewards.
 *
 * Flow:
 *  1. Calls the claim-memearena-rewards Edge Function.
 *  2. The function sums approved/unclaimed rewards and either:
 *       - (devnet / no reward vault) marks them claimed with a mock signature, or
 *       - (production) sends an SPL transfer from the reward vault to the player.
 *
 * TODO (production): reward distribution needs secure server-side wallet
 * handling, rate limits, fraud checks, and treasury controls. The reward vault
 * private key must live ONLY in Edge Function secrets, never client-side.
 */
export async function claimRewards(walletAddress: string): Promise<ClaimResult> {
  const supabase = getSupabaseBrowser();

  if (supabase) {
    const { data, error } = await supabase.functions.invoke("claim-memearena-rewards", {
      body: { wallet_address: walletAddress },
    });
    if (error) throw new Error(error.message);
    return data as ClaimResult;
  }

  // Local/guest fallback: mock the claim so the flow is demoable offline.
  await new Promise((r) => setTimeout(r, 1100));
  return {
    signature: `MOCK_CLAIM_${Date.now().toString(36)}`,
    amount: 0,
    mock: !isOnchainConfigured,
    status: "completed",
  };
}
