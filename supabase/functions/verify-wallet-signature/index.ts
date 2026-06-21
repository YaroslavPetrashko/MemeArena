// verify-wallet-signature
// Input:  { wallet_address, signature (base64), nonce }
// Verifies an ed25519 signature over the stored nonce message, links the wallet
// to the caller's profile, and marks the nonce consumed.
//
// Auth model: the caller is an authenticated Supabase user (anon/guest session
// upgraded, or email). We attach their wallet to their profile. If you instead
// want wallet-only auth, mint a custom JWT here.
import { json, handleOptions } from "../_shared/cors.ts";
import { getAdminClient, getCallerUser } from "../_shared/supabaseAdmin.ts";
import nacl from "npm:tweetnacl@1.0.3";
import bs58 from "npm:bs58@5.0.0";

function buildMessage(walletAddress: string, nonce: string): string {
  return [
    "MemeArena wants you to sign in with your Solana account:",
    walletAddress,
    "",
    "Sign this message to verify wallet ownership. This is free and will not trigger a transaction.",
    "",
    `Nonce: ${nonce}`,
  ].join("\n");
}

Deno.serve(async (req) => {
  const pre = handleOptions(req);
  if (pre) return pre;

  try {
    const { wallet_address, signature, nonce } = await req.json();
    if (!wallet_address || !signature || !nonce) {
      return json({ error: "wallet_address, signature, nonce required" }, 400);
    }

    const admin = getAdminClient();

    // Fetch + validate the nonce.
    const { data: row } = await admin
      .from("wallet_auth_nonces")
      .select("*")
      .eq("wallet_address", wallet_address)
      .eq("nonce", nonce)
      .eq("consumed", false)
      .maybeSingle();

    if (!row) return json({ error: "invalid_or_used_nonce" }, 400);
    if (new Date(row.expires_at) < new Date()) {
      return json({ error: "nonce_expired" }, 400);
    }

    // Verify signature: ed25519(message) against the wallet public key.
    const message = new TextEncoder().encode(buildMessage(wallet_address, nonce));
    const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
    const pubkeyBytes = bs58.decode(wallet_address);
    const ok = nacl.sign.detached.verify(message, sigBytes, pubkeyBytes);
    if (!ok) return json({ error: "bad_signature" }, 401);

    // Consume the nonce.
    await admin.from("wallet_auth_nonces").update({ consumed: true }).eq("id", row.id);

    // Link wallet to the caller's profile (create profile if needed).
    const caller = await getCallerUser(req);
    if (!caller) {
      // No authenticated user — return verified=true so the client can proceed
      // with a guest→wallet link flow. Production: mint a custom session here.
      return json({ verified: true, linked: false, wallet_address });
    }

    await admin
      .from("profiles")
      .upsert({ id: caller.id, wallet_address }, { onConflict: "id" });

    return json({ verified: true, linked: true, wallet_address, profile_id: caller.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
