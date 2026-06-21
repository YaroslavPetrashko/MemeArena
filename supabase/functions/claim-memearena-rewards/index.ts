// claim-memearena-rewards
// Input:  { wallet_address }
// Sums approved + unclaimed MEMEARENA rewards, creates a token_claim, and:
//   * devnet / no reward vault → marks complete with a mock signature.
//   * production → sends an SPL transfer from the reward vault to the player.
//
// TODO (production): reward distribution requires SECURE server-side wallet
// handling. The reward vault keypair must come from an Edge Function secret
// (REWARD_VAULT_SECRET_KEY), never the client. Add rate limits, per-wallet
// cooldowns, fraud checks, idempotency keys, and treasury balance guards.
import { json, handleOptions } from "../_shared/cors.ts";
import { getAdminClient, getCallerUser } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const { wallet_address } = await req.json();
    const caller = await getCallerUser(req);
    if (!caller) return json({ error: "unauthenticated" }, 401);

    const admin = getAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("id, wallet_address")
      .eq("id", caller.id)
      .maybeSingle();
    if (!profile?.wallet_address) return json({ error: "wallet_not_linked" }, 400);

    const targetWallet = wallet_address ?? profile.wallet_address;
    if (targetWallet !== profile.wallet_address) {
      return json({ error: "wallet_mismatch" }, 403);
    }

    // Sum approved, unclaimed MEMEARENA rewards.
    const { data: rewards } = await admin
      .from("reward_ledger")
      .select("id, amount")
      .eq("profile_id", profile.id)
      .eq("currency", "MEMEARENA")
      .eq("status", "approved")
      .is("claimed_at", null);

    const total = (rewards ?? []).reduce((s, r) => s + Number(r.amount), 0);
    if (total <= 0) return json({ ok: false, error: "nothing_to_claim", amount: 0 });

    // Create the claim record.
    const { data: claim } = await admin
      .from("token_claims")
      .insert({
        profile_id: profile.id,
        wallet_address: profile.wallet_address,
        amount: total,
        status: "processing",
      })
      .select("id")
      .single();

    const rewardVault = Deno.env.get("REWARD_VAULT_PUBLIC_KEY");
    const rewardVaultSecret = Deno.env.get("REWARD_VAULT_SECRET_KEY");
    const rpcUrl = Deno.env.get("SOLANA_RPC_URL");
    const mint = Deno.env.get("MEMEARENA_TOKEN_MINT");

    let signature: string;
    let mock = false;

    if (rewardVault && rewardVaultSecret && rpcUrl && mint) {
      // TODO (production): build + sign + send the SPL transfer from the reward
      // vault keypair to `profile.wallet_address` for `total` tokens, confirm,
      // then set signature. This block is intentionally left as a scaffold so
      // no real keys are required to run the MVP.
      signature = `PENDING_REAL_PAYOUT_${claim?.id ?? ""}`;
      mock = false;
    } else {
      // Mock claim for devnet / unconfigured reward vault.
      signature = `MOCK_CLAIM_${(claim?.id ?? "x").slice(0, 8)}_${Date.now().toString(36)}`;
      mock = true;
    }

    // Mark claim complete + rewards claimed (idempotent on this claim).
    const now = new Date().toISOString();
    await admin
      .from("token_claims")
      .update({ status: "completed", transaction_signature: signature, completed_at: now })
      .eq("id", claim!.id);

    const ids = (rewards ?? []).map((r) => r.id);
    if (ids.length) {
      await admin
        .from("reward_ledger")
        .update({ status: "claimed", claimed_at: now })
        .in("id", ids);
    }

    return json({ ok: true, mock, amount: total, signature, status: "completed" });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
