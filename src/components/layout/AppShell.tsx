"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Swords,
  Layers,
  ArrowUpCircle,
  ShoppingBag,
  Trophy,
  User,
  Gift,
  Wrench,
  HelpCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CurrencyHud } from "./CurrencyHud";
import { WalletButton } from "./WalletButton";
import { SafetyFooter } from "@/components/common/SafetyFooter";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/play", label: "Play", icon: Swords },
  { href: "/pvp", label: "Versus", icon: Users },
  { href: "/deck", label: "Deck", icon: Layers },
  { href: "/upgrades", label: "Upgrades", icon: ArrowUpCircle },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/leaderboards", label: "Ranks", icon: Trophy },
  { href: "/claim", label: "Claim", icon: Gift },
  { href: "/profile", label: "Profile", icon: User },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="MemeArena"
        className="size-10 rounded-xl object-contain shadow-[0_4px_20px_rgba(182,255,27,0.25)]"
      />
      <span className="font-display text-lg font-bold tracking-tight">
        Meme<span className="text-gradient">Arena</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBattle = pathname === "/battle";

  // Battle is a fullscreen "game mode": hide the whole app chrome so the board
  // is the hero. BattleShell paints its own background + back button.
  if (isBattle) {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  return (
    <>
      <div className="arena-bg" aria-hidden />
      <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/70 px-4 py-5 backdrop-blur-xl lg:flex">
        <Logo />
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <item.icon className={cn("size-5 transition-transform group-hover:scale-110", active && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/admin/dev-tools"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted/60 hover:text-muted"
        >
          <Wrench className="size-3.5" /> Dev Tools
        </Link>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden flex-1 lg:block">
            <CurrencyHud />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/faq"
              aria-label="How to play / FAQ"
              className="grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <HelpCircle className="size-5" />
            </Link>
            <WalletButton />
          </div>
        </header>

        {/* Mobile currency strip */}
        <div className="overflow-x-auto border-b border-border bg-surface/60 px-4 py-2 lg:hidden">
          <CurrencyHud compact />
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-28 lg:pb-10">
          {children}
          <SafetyFooter />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-background/95 px-1 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        {NAV.slice(0, 6).map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      </div>
    </>
  );
}
