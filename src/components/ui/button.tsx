"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

/**
 * shadcn-style button. Variants include the canonical shadcn set plus the
 * project's brand variants (primary/magenta/gold/danger) so existing call sites
 * keep working during the migration. Neutral variants (ghost/outline/secondary)
 * are theme-aware (light/dark) via design tokens.
 */
const buttonVariants = cva(
  "btn-pop inline-flex items-center justify-center font-display font-semibold tracking-tight select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // canonical shadcn
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline:
          "border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        destructive: "bg-destructive text-destructive-foreground shadow hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
        // brand (theme-independent gradients)
        primary:
          "bg-gradient-to-b from-lime to-lime-deep text-black shadow-[0_6px_24px_rgba(182,255,27,0.25)] hover:shadow-[0_8px_32px_rgba(182,255,27,0.4)]",
        magenta:
          "bg-gradient-to-b from-magenta to-magenta-deep text-white shadow-[0_6px_24px_rgba(255,43,214,0.25)] hover:shadow-[0_8px_32px_rgba(255,43,214,0.4)]",
        gold: "bg-gradient-to-b from-gold to-amber-600 text-black shadow-[0_6px_24px_rgba(255,210,74,0.25)]",
        danger: "bg-gradient-to-b from-red-500 to-red-700 text-white",
      },
      size: {
        default: "h-10 px-4 text-sm rounded-xl gap-2",
        sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
        md: "h-11 px-5 text-sm rounded-xl gap-2",
        lg: "h-14 px-7 text-base rounded-2xl gap-2.5",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {!asChild && loading && (
          <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        )}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
