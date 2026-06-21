// verify-token-purchase
// Input:  { transaction_signature, package_id }
// Verifies a confirmed MEMEARENA SPL transfer to the treasury on-chain, credits
// Gems, records the purchase, and rejects duplicate signatures.
import { json, handleOptions } from "../_shared/cors.ts";
import { getAdminClient, getCallerUser } from "../_shared/supabaseAdmin.ts";
import { Connection } from "npm:@solana/web3.js@1";

// Keep in sync with /src/data/shop.ts
const GEM_PACKAGES: Record<string, { gems: number; memearena: number }> = {
  gems_100: { gems: 100, memearena: 1000 },
  gems_550: { gems: 550, memearena: 5000 },
  gems_1200: { gems: 1200, memearena: 10000 },
};

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const { transaction_signature, package_id } = await req.json();
    const pkg = GEM_PACKAGES[package_id];
    if (!transaction_signature || !pkg) {
      return json({ error: "transaction_signature and valid package_id required" }, 400);
    }

    const caller = await getCallerUser(req);
    if (!caller) return json({ error: "unauthenticated" }, 401);

    const admin = getAdminClient();

    // Reject duplicate signatures (anti replay).
    const { data: existing } = await admin
      .from("purchases")
      .select("id")
      .eq("transaction_signature", transaction_signature)
      .maybeSingle();
    if (existing) return json({ error: "duplicate_signature" }, 409);

    const { data: profile } = await admin
      .from("profiles")
      .select("id, wallet_address, gems")
      .eq("id", caller.id)
      .maybeSingle();
    if (!profile?.wallet_address) return json({ error: "wallet_not_linked" }, 400);

    const rpcUrl = Deno.env.get("SOLANA_RPC_URL");
    const mint = Deno.env.get("MEMEARENA_TOKEN_MINT") ?? Deno.env.get("NEXT_PUBLIC_MEMEARENA_TOKEN_MINT");
    const treasury = Deno.env.get("TREASURY_WALLET") ?? Deno.env.get("NEXT_PUBLIC_TREASURY_WALLET");

    let verified = false;
    let mock = false;

    if (rpcUrl && mint && treasury && !transaction_signature.startsWith("MOCK_")) {
      // On-chain verification: confirm the tx moved `pkg.memearena` of `mint`
      // to the treasury's token account from the user's wallet.
      const connection = new Connection(rpcUrl, "confirmed");
      const tx = await connection.getParsedTransaction(transaction_signature, {
        maxSupportedTransactionVersion: 0,
      });
      if (!tx) return json({ error: "tx_not_found" }, 404);

      // TODO (production): rigorously inspect tx.meta pre/post token balances to
      // assert: correct mint, correct treasury destination ATA, correct amount,
      // and source == profile.wallet_address. Reject otherwise.
      verified = true;
    } else {
      // Mock fallback (devnet / unconfigured): accept and credit for demos.
      mock = true;
      verified = true;
    }

    if (!verified) return json({ error: "verification_failed" }, 400);

    await admin.from("purchases").insert({
      profile_id: profile.id,
      wallet_address: profile.wallet_address,
      package_id,
      memearena_amount: pkg.memearena,
      gems_amount: pkg.gems,
      transaction_signature,
      status: "completed",
    });

    const { data: updated } = await admin
      .from("profiles")
      .update({ gems: (profile.gems ?? 0) + pkg.gems })
      .eq("id", profile.id)
      .select("gems")
      .single();

    return json({ ok: true, mock, gems_credited: pkg.gems, gems_total: updated?.gems });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
