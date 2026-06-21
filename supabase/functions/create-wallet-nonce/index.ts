// create-wallet-nonce
// Input:  { wallet_address }
// Output: { nonce, message }
// Stores a single-use nonce for SIWS-style wallet sign-in.
import { corsHeaders, json, handleOptions } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";

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
    const { wallet_address } = await req.json();
    if (!wallet_address || typeof wallet_address !== "string") {
      return json({ error: "wallet_address required" }, 400);
    }

    const nonce = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const admin = getAdminClient();

    const { error } = await admin.from("wallet_auth_nonces").insert({
      wallet_address,
      nonce,
      expires_at: expiresAt,
    });
    if (error) return json({ error: error.message }, 500);

    return json({ nonce, message: buildMessage(wallet_address, nonce) });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

export { corsHeaders };
