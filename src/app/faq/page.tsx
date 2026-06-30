"use client";

import { Panel, SectionTitle } from "@/components/ui/Panel";
import {
  Swords,
  Layers,
  Zap,
  MapPin,
  Trophy,
  Gift,
  Coins,
  Wallet,
  Clock,
  Sparkles,
} from "lucide-react";

interface Entry {
  icon: typeof Swords;
  q: string;
  a: React.ReactNode;
}

const ENTRIES: Entry[] = [
  {
    icon: Swords,
    q: "How do I win a match?",
    a: (
      <>
        A match is <b>6 turns</b> across <b>3 locations</b>. Each turn both sides place cards
        face-down and reveal at the same time. The side with more total <b>Strength</b> at a
        location wins it — <b>win 2 of the 3 locations</b> to win the match. If you each take one
        and tie one, total board Strength is the tiebreaker.
      </>
    ),
  },
  {
    icon: Zap,
    q: "How does Energy work?",
    a: (
      <>
        You get <b>Energy equal to the turn number</b> — 1 on turn 1, up to 6 on turn 6. Every card
        has an Energy cost; you can play as many cards as your Energy allows (up to 4 per location,
        or 1 at Garage). Unused Energy doesn&apos;t carry over.
      </>
    ),
  },
  {
    icon: Layers,
    q: "How do I place and undo cards?",
    a: (
      <>
        <b>Drag</b> a card from your hand onto a glowing location, or <b>tap</b> the card then tap a
        location. To take a staged card back before you end the turn, <b>drag it off the board</b>{" "}
        (or tap it). Press <b>End Turn</b> when you&apos;re done — or the move timer will submit for you.
      </>
    ),
  },
  {
    icon: Clock,
    q: "Is there a turn timer?",
    a: (
      <>
        Yes — you have <b>45 seconds</b> per turn (shown as the bar across the top and the countdown
        by the Energy orb). When it runs out, your turn auto-submits with whatever you&apos;ve staged,
        so games never stall.
      </>
    ),
  },
  {
    icon: Sparkles,
    q: "What are card abilities?",
    a: (
      <>
        <b>On Reveal</b> fires once when the card flips. <b>Ongoing</b> applies continuously while in
        play. <b>Conditional</b> depends on the board (e.g. &ldquo;if you&apos;re winning here&rdquo;).{" "}
        <b>End of Game</b> resolves at final scoring. Cards have no rarity — just Energy and Strength.
      </>
    ),
  },
  {
    icon: MapPin,
    q: "What do locations do?",
    a: (
      <>
        Each of the 8 locations has an effect (e.g. <i>Miami</i> gives +1 Strength, <i>Solangeles</i>{" "}
        triggers On Reveals twice, <i>Garage</i> allows only 1 card per side). Three are chosen each
        match and reveal over the first 3 turns — adapt your plays to them.
      </>
    ),
  },
  {
    icon: Coins,
    q: "Coins, Gems, and MEMEARENA?",
    a: (
      <>
        <b>Coins</b> and <b>Gems</b> are soft currencies you earn by playing (more for harder
        opponents, higher rank, and win streaks). <b>Gems</b> open Mystery Boxes and buy cosmetics.{" "}
        <b>MEMEARENA</b> is the claimable on-chain reward token — it&apos;s always validated
        server-side, capped, and never guaranteed. A game first; rewards are a bonus.
      </>
    ),
  },
  {
    icon: Gift,
    q: "How do I unlock more cards?",
    a: (
      <>
        You start with <b>6 free cards</b>. Unlock the rest by <b>winning matches</b> (a card drops
        on a win while your collection is small), opening <b>Mystery Boxes</b> in the Shop with Gems,
        or buying. Build a deck of <b>6–12 cards</b> in the Deck builder.
      </>
    ),
  },
  {
    icon: Trophy,
    q: "How do ranks work?",
    a: (
      <>
        Wins earn <b>Rank Points</b> (more vs. tougher opponents and on win streaks); losses cost a
        little. Climb the ladder from <b>Paperhands</b> up to <b>Meme Lord</b>. Your rank scales your
        rewards and the opponent&apos;s skill, so matches stay challenging. Seasons reset monthly.
      </>
    ),
  },
  {
    icon: Wallet,
    q: "Do I need a wallet?",
    a: (
      <>
        No — you can play everything as a guest, with progress saved locally. Connecting a Phantom
        wallet is only needed to earn and claim <b>MEMEARENA</b> token rewards.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="space-y-6">
      <SectionTitle title="How to play & FAQ" subtitle="Everything you need to win the Arena." />
      <div className="grid gap-3 sm:grid-cols-2">
        {ENTRIES.map((e) => (
          <Panel key={e.q} className="p-5">
            <div className="flex items-center gap-2">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <e.icon className="size-5" />
              </div>
              <h3 className="font-display font-bold">{e.q}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{e.a}</p>
          </Panel>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        MemeArena is a game. Rewards are not guaranteed and are subject to validation and caps.
        Nothing here is financial advice.
      </p>
    </div>
  );
}
