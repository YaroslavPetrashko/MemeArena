"use client";

import { useCallback, useState } from "react";
import {
  connectPhantom,
  disconnectPhantom,
  signNonceMessage,
  buildSignInMessage,
  isPhantomInstalled,
  PHANTOM_INSTALL_URL,
} from "@/lib/wallet/phantom";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useGameStore } from "@/store/gameStore";
import posthog from "posthog-js";

export interface WalletState {
  connecting: boolean;
  signing: boolean;
  error: string | null;
  installed: boolean;
}

export function useWallet() {
  const linkWallet = useGameStore((s) => s.linkWallet);
  const disconnectStore = useGameStore((s) => s.disconnectWallet);
  const [state, setState] = useState<WalletState>({
    connecting: false,
    signing: false,
    error: null,
    installed: true,
  });

  /**
   * Connect Phantom and complete SIWS-style verification:
   *   1. connect → 2. request nonce → 3. sign → 4. verify on server → 5. link.
   * When Supabase isn't configured we connect + link locally (guest→wallet).
   */
  const connect = useCallback(async () => {
    setState((s) => ({ ...s, error: null }));
    if (!isPhantomInstalled()) {
      setState((s) => ({ ...s, installed: false, error: "Phantom not installed" }));
      window.open(PHANTOM_INSTALL_URL, "_blank");
      return;
    }
    setState((s) => ({ ...s, connecting: true }));
    try {
      const address = await connectPhantom();
      const supabase = getSupabaseBrowser();

      if (supabase) {
        setState((s) => ({ ...s, signing: true }));
        // Ensure a session (anonymous) so the verify function can link.
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) await supabase.auth.signInAnonymously();

        const { data: nonceRes, error: nonceErr } = await supabase.functions.invoke(
          "create-wallet-nonce",
          { body: { wallet_address: address } },
        );
        if (nonceErr) throw new Error(nonceErr.message);

        const message = nonceRes?.message ?? buildSignInMessage(address, nonceRes.nonce);
        const { signature } = await signNonceMessage(message);

        const { error: verifyErr } = await supabase.functions.invoke("verify-wallet-signature", {
          body: { wallet_address: address, signature, nonce: nonceRes.nonce },
        });
        if (verifyErr) throw new Error(verifyErr.message);
      } else {
        // Local mode: still prove ownership by signing a local nonce.
        const nonce = Math.random().toString(36).slice(2);
        await signNonceMessage(buildSignInMessage(address, nonce));
      }

      linkWallet(address);
      setState({ connecting: false, signing: false, error: null, installed: true });
      posthog.identify(address, { wallet_address: address });
      posthog.capture("wallet_connected", {
        wallet_address: address,
        has_supabase: !!getSupabaseBrowser(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to connect";
      setState({ connecting: false, signing: false, error: msg, installed: true });
    }
  }, [linkWallet]);

  const disconnect = useCallback(async () => {
    posthog.capture("wallet_disconnected");
    posthog.reset();
    try {
      await disconnectPhantom();
    } finally {
      disconnectStore();
    }
  }, [disconnectStore]);

  return { ...state, connect, disconnect };
}
