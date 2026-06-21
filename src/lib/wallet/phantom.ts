"use client";

import { PublicKey, type Transaction, type VersionedTransaction } from "@solana/web3.js";

/**
 * Lightweight Phantom provider integration (no heavy wallet-adapter bundle).
 * Implements connect, message signing for Sign-In-With-Solana style auth, and
 * transaction signing/sending for the Gem purchase flow.
 *
 * SECURITY: we never request seed phrases or private keys. Signing always
 * happens inside the user's Phantom wallet.
 */
export interface PhantomProvider {
  isPhantom?: boolean;
  publicKey: PublicKey | null;
  isConnected: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array, encoding?: string) => Promise<{ signature: Uint8Array }>;
  signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>;
  signAndSendTransaction: <T extends Transaction | VersionedTransaction>(
    tx: T,
  ) => Promise<{ signature: string }>;
  on: (event: string, handler: (args: unknown) => void) => void;
  removeAllListeners?: () => void;
}

export function getPhantom(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    phantom?: { solana?: PhantomProvider };
    solana?: PhantomProvider;
  };
  const provider = w.phantom?.solana ?? w.solana;
  return provider?.isPhantom ? provider : null;
}

export function isPhantomInstalled(): boolean {
  return getPhantom() !== null;
}

export const PHANTOM_INSTALL_URL = "https://phantom.app/download";

export async function connectPhantom(): Promise<string> {
  const provider = getPhantom();
  if (!provider) {
    throw new Error("PHANTOM_NOT_INSTALLED");
  }
  const res = await provider.connect();
  return res.publicKey.toBase58();
}

export async function disconnectPhantom(): Promise<void> {
  const provider = getPhantom();
  if (provider?.isConnected) await provider.disconnect();
}

/** Sign a backend-issued nonce message (SIWS-style). Returns base64 signature. */
export async function signNonceMessage(message: string): Promise<{ signature: string; publicKey: string }> {
  const provider = getPhantom();
  if (!provider) throw new Error("PHANTOM_NOT_INSTALLED");
  if (!provider.publicKey) await provider.connect();
  const encoded = new TextEncoder().encode(message);
  const { signature } = await provider.signMessage(encoded, "utf8");
  const base64 = typeof window !== "undefined" ? btoa(String.fromCharCode(...signature)) : "";
  return { signature: base64, publicKey: provider.publicKey!.toBase58() };
}

/** Human-readable SIWS message the backend stores + verifies. */
export function buildSignInMessage(walletAddress: string, nonce: string): string {
  return [
    "MemeArena wants you to sign in with your Solana account:",
    walletAddress,
    "",
    "Sign this message to verify wallet ownership. This is free and will not trigger a transaction.",
    "",
    `Nonce: ${nonce}`,
  ].join("\n");
}
