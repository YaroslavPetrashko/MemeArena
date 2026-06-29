"use client";

import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  username: string;
  walletAddress: string | null;
  className?: string;
}

/** Compact bottom-left player identity chip. */
export function SnapPlayerHud({ username, walletAddress, className }: Props) {
  const short = walletAddress ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}` : null;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-lime/30 to-cyan-500/20 font-display text-sm font-black text-white/85 ring-1 ring-lime/30">
        {username.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-xs font-bold text-white/90">{username}</div>
        <div className="flex items-center gap-1 text-[10px] text-muted">
          {short ? (
            <>
              <Wallet className="size-2.5 text-lime" /> {short}
            </>
          ) : (
            "Guest"
          )}
        </div>
      </div>
    </div>
  );
}
