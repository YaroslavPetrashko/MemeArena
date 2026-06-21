"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "magenta" | "gold" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-lime to-lime-deep text-black shadow-[0_6px_24px_rgba(182,255,27,0.25)] hover:shadow-[0_8px_32px_rgba(182,255,27,0.4)]",
  magenta:
    "bg-gradient-to-b from-magenta to-magenta-deep text-white shadow-[0_6px_24px_rgba(255,43,214,0.25)] hover:shadow-[0_8px_32px_rgba(255,43,214,0.4)]",
  gold: "bg-gradient-to-b from-gold to-amber-600 text-black shadow-[0_6px_24px_rgba(255,210,74,0.25)]",
  ghost: "bg-white/5 text-foreground hover:bg-white/10 border border-white/10",
  outline: "bg-transparent text-foreground border border-white/15 hover:border-lime/50 hover:bg-white/5",
  danger: "bg-gradient-to-b from-red-500 to-red-700 text-white",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-11 px-5 text-sm rounded-xl gap-2",
  lg: "h-14 px-7 text-base rounded-2xl gap-2.5",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "btn-pop inline-flex items-center justify-center font-display font-semibold tracking-tight select-none",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
