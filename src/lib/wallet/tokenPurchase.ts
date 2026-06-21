"use client";

import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getPhantom } from "./phantom";
import { env, isOnchainConfigured } from "@/lib/env";
import type { GemPackage } from "@/types";

export interface PurchaseResult {
  signature: string;
  mock: boolean;
}

/**
 * Buy Gems by sending a MEMEARENA SPL transfer from the connected wallet to the
 * treasury. The Gems are NOT credited here — the verify-token-purchase Edge
 * Function confirms the transaction on-chain before crediting (never trust the
 * client). When onchain env vars are missing we mock the transfer so the flow
 * is fully demoable on a fresh checkout.
 *
 * NOTE: assumes a 6-decimal SPL token (the common default). Adjust `decimals`
 * to match the deployed MEMEARENA mint.
 */
export async function purchaseGems(
  pkg: GemPackage,
  decimals = 6,
): Promise<PurchaseResult> {
  if (!isOnchainConfigured) {
    // Mock fallback: simulate a confirmed transfer for local/devnet demos.
    await new Promise((r) => setTimeout(r, 900));
    return { signature: `MOCK_PURCHASE_${pkg.id}_${Date.now().toString(36)}`, mock: true };
  }

  const provider = getPhantom();
  if (!provider) throw new Error("PHANTOM_NOT_INSTALLED");
  if (!provider.publicKey) await provider.connect();
  const owner = provider.publicKey!;

  const connection = new Connection(env.solanaRpcUrl, "confirmed");
  const mint = new PublicKey(env.tokenMint);
  const treasury = new PublicKey(env.treasuryWallet);

  const fromAta = await getAssociatedTokenAddress(mint, owner);
  const toAta = await getAssociatedTokenAddress(mint, treasury);

  const tx = new Transaction();

  // Create the treasury's ATA if it doesn't exist yet (payer = user).
  try {
    await getAccount(connection, toAta);
  } catch {
    tx.add(createAssociatedTokenAccountInstruction(owner, toAta, treasury, mint));
  }

  const amount = BigInt(Math.round(pkg.memearenaCost * 10 ** decimals));
  tx.add(
    createTransferInstruction(fromAta, toAta, owner, amount, [], TOKEN_PROGRAM_ID),
  );

  tx.feePayer = owner;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const { signature } = await provider.signAndSendTransaction(tx);
  await connection.confirmTransaction(signature, "confirmed");

  return { signature, mock: false };
}
