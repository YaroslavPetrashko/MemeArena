import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";
import type { Rarity } from "@/types";

/**
 * shadcn-style badge. Supports the canonical `variant` API plus the project's
 * `tone` API (neutral/lime/magenta/gold/danger) for backwards compatibility.
 * Neutral is theme-aware; brand tones use the fixed accent colors.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        success: "border-primary/30 bg-primary/15 text-primary",
        neutral: "bg-secondary text-muted-foreground border-border",
        lime: "bg-lime/15 text-lime border-lime/30",
        magenta: "bg-magenta/15 text-magenta border-magenta/30",
        gold: "bg-gold/15 text-gold border-gold/30",
        danger: "bg-red-500/15 text-red-400 border-red-500/30",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

type Tone = "neutral" | "lime" | "magenta" | "gold" | "danger";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    Omit<VariantProps<typeof badgeVariants>, "variant"> {
  /** Canonical shadcn variant. */
  variant?: NonNullable<VariantProps<typeof badgeVariants>["variant"]>;
  /** Legacy alias; maps onto `variant`. Takes precedence when set. */
  tone?: Tone;
}

function Badge({ className, variant, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant: tone ?? variant }), className)} {...props} />;
}

const rarityStyles: Record<Rarity, string> = {
  Common: "text-[var(--rarity-common)] border-[var(--rarity-common)]/40 bg-foreground/5",
  Rare: "text-[var(--rarity-rare)] border-[var(--rarity-rare)]/40 bg-[var(--rarity-rare)]/10",
  Epic: "text-[var(--rarity-epic)] border-[var(--rarity-epic)]/40 bg-[var(--rarity-epic)]/10",
  Legendary: "text-[var(--rarity-legendary)] border-[var(--rarity-legendary)]/50 bg-[var(--rarity-legendary)]/10",
};

export function RarityBadge({ rarity, className }: { rarity: Rarity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        rarityStyles[rarity],
        className,
      )}
    >
      {rarity}
    </span>
  );
}

export { Badge, badgeVariants };
