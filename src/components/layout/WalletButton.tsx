"use client";

import { Wallet, LogOut, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { useGameStore } from "@/store/gameStore";
import { useMounted } from "@/hooks/useMounted";
import { shortAddress } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function WalletButton({ className }: { className?: string }) {
  const mounted = useMounted();
  const { connect, disconnect, connecting, signing, error, installed } = useWallet();
  const address = useGameStore((s) => s.save.profile.walletAddress);
  const [open, setOpen] = useState(false);

  if (!mounted) {
    return <div className={cn("h-9 w-32 rounded-xl bg-white/5 animate-pulse", className)} />;
  }

  if (address) {
    return (
      <div className={cn("relative", className)}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="btn-pop inline-flex h-9 items-center gap-2 rounded-xl border border-lime/30 bg-lime/10 px-3 text-sm font-medium text-lime"
        >
          <span className="size-2 rounded-full bg-lime shadow-[0_0_8px_var(--lime)]" />
          {shortAddress(address)}
        </button>
        {open && (
          <div className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-white/10 bg-surface p-1 shadow-2xl">
            <button
              onClick={() => { disconnect(); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-foreground"
            >
              <LogOut className="size-4" /> Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-end", className)}>
      <Button size="sm" onClick={connect} loading={connecting || signing}>
        {connecting || signing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Wallet className="size-4" />
        )}
        {signing ? "Sign message…" : connecting ? "Connecting…" : "Connect Phantom"}
      </Button>
      {error && !installed && (
        <span className="mt-1 text-[10px] text-magenta">Phantom not found — opening install page</span>
      )}
      {error && installed && <span className="mt-1 text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
