import { SAFETY_COPY } from "@/data/rewardEconomy";

export function SafetyFooter() {
  return (
    <footer className="mt-16 border-t border-white/8 px-4 py-8 text-center">
      <div className="mx-auto max-w-3xl space-y-1 text-xs text-muted">
        <p className="font-medium text-foreground/80">{SAFETY_COPY.game}</p>
        <p>{SAFETY_COPY.rewards}</p>
        <p>{SAFETY_COPY.advice}</p>
        <p className="text-lime/70">{SAFETY_COPY.fun}</p>
      </div>
      <p className="mt-4 text-[10px] text-muted/60">
        MemeArena · PvE meme card battler on Solana · Devnet MVP · Not affiliated with any token or meme.
      </p>
    </footer>
  );
}
