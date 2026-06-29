# MemeArena 🎴⚔️

A minimalist-but-polished **onchain crypto meme card battler**. PvE-first (PvP
incoming): connect Phantom (or play as guest), build a meme deck (6–12 cards),
fight bot-controlled meme bosses, unlock new cards from wins and Mystery Boxes,
climb leaderboards, and win claimable **MEMEARENA** token rewards on Solana.

> MemeArena is a game. Rewards are not guaranteed. MEMEARENA token rewards are
> subject to validation, caps, and availability. Nothing here is financial
> advice. Play for fun. Bonk responsibly.

---

## ✨ Highlights

- **SNAP-style card battles** — 6 turns, 3 locations, simultaneous reveal. Win 2 of 3 locations to beat the opponent.
- **15 meme cards + 8 bot bosses** with On Reveal, Ongoing, Conditional, and End Game abilities.
- **Single free "Arena" mode** — unlimited bot matches today, heading toward PvP.
- **Collection meta** — start with 6 free cards; unlock the rest by winning matches, opening **Mystery Boxes**, or buying. Build a 6–12 card deck.
- **Cosmetic-only upgrades** — leveling unlocks card frames (Bronze → Prismatic), never stats.
- **Coins + Gems economy** with pending/claimable MEMEARENA for wallet players.
- **shadcn UI** with a green palette and a **light/dark theme toggle**; responsive (bottom-nav on mobile, sidebar on desktop).
- **Phantom wallet** connect + Sign-In-With-Solana, MEMEARENA→Gems purchase, reward claim flow.
- **Supabase** schema, RLS, and Edge Functions for server-authoritative rewards (+ a PvP scaffold).
- **Runs with zero config** — local guest mode + mock onchain flows out of the box.
- **Placeholder-safe art** — gradient/initials slots; drop real PNGs in `/public` later.

## 🧱 Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Framer Motion · Zustand ·
TanStack Query · Supabase (Postgres + Auth + RLS + Edge Functions) ·
Solana web3.js + SPL Token · Phantom provider.

## 🚀 Getting started

```bash
npm install
cp .env.example .env.local   # optional — works without any keys
npm run dev                  # http://localhost:3000
```

With **no environment variables**, MemeArena runs fully in local guest mode:
progress is saved to `localStorage`, and wallet/purchase/claim flows use safe mocks.

### Enable real Supabase + Solana

1. Fill `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Apply the database:
   ```bash
   supabase start
   supabase db reset        # runs supabase/migrations + seed
   supabase functions serve # serves the 6 Edge Functions
   ```
3. Set Solana env vars (`NEXT_PUBLIC_SOLANA_*`, token mint, treasury).
4. Edge Function secrets (server-only): `SUPABASE_SERVICE_ROLE_KEY`,
   `SOLANA_RPC_URL`, `MEMEARENA_TOKEN_MINT`, `TREASURY_WALLET`,
   `REWARD_VAULT_PUBLIC_KEY`, `REWARD_VAULT_SECRET_KEY`.

## 📁 Project structure

```
src/
  app/            routes: / play battle deck upgrades shop leaderboards profile claim admin/dev-tools
  components/     ui/ cards/ snap/ layout/ providers/ common/
  data/           snapCards, snapBosses, snapLocations, snapModes, upgrades, modes, shop, rewardEconomy, cosmetics
  lib/
    game/         snap/ (engine, abilities, locations, rewards, scoring), entryGates, rng, progression, snapUpgrades
    wallet/       phantom, tokenPurchase, tokenClaim
    supabase/     client, server
    storage/      playerStorage (local-first save, version-migrated)
    utils/        format, cn
    api/          snap (server submit), pvp (matchmaking/turns), env
  store/          gameStore, snapStore, snapLaunchStore, snapDragStore (Zustand)
  types/          index.ts, snap.ts
supabase/
  migrations/     0001_initial_schema … 0005_single_arena_mode, 0006_pvp
  functions/      create-wallet-nonce, verify-wallet-signature, verify-token-purchase,
                  submit-snap-result, claim-memearena-rewards, consume-mode-entry,
                  pvp-matchmake, pvp-submit-turn
```

## 🪙 Economy & security model

There are **two token flows**, and rewards are **never client-trusted**:

1. **Spending MEMEARENA** → buy Gems: on-chain SPL transfer to treasury, then
   `verify-token-purchase` confirms before crediting Gems.
2. **Winning MEMEARENA** → gameplay creates **pending** reward ledger entries.
   `submit-battle-result` validates plausibility, caps, and mode eligibility, then
   marks rewards **approved**. Players **claim** approved rewards via
   `claim-memearena-rewards` (mock on devnet; real reward-vault transfer in prod).

All reward values, caps, and tokenomics live in `src/data/rewardEconomy.ts` and
`src/data/*` so the economy is easy to rebalance.

> **Production TODO**: server-authoritative battle replay (seed + action log),
> rate limits, fraud/abuse flagging, secure reward-vault key handling, treasury
> controls. Scaffolding and `TODO` markers are in place.

## 🎮 Scripts

```bash
npm run dev     # dev server
npm run build   # production build
npm run start   # serve production build
npm run lint    # eslint
```

## 🃏 Card list

### Cards (15 total)

| Card | Energy | Strength | Ability |
|------|--------|----------|---------|
| John Pork | 1 | 1 | No ability. |
| Moodeng | 1 | 2 | Ongoing: This card's Power can't be reduced. |
| Chillguy | 2 | 2 | Ongoing: Your other cards here have +1 Power. |
| Pnut | 2 | 2 | On Reveal: Next turn, you have +1 Energy. |
| Retardio | 3 | 2 | On Reveal: A random friendly +3 Power or random enemy -3 Power. |
| Popcat | 3 | 6 | On Reveal: Add a 1-Power Pop Token here if there is space. |
| Tung | 3 | 4 | On Reveal: Disable the next enemy On Reveal here this turn. |
| Dogwifhat | 4 | 4 | If you are winning this location, this has +2 Power. |
| Wojak | 4 | 6 | On Reveal: Give the next card you play +2 Power. |
| Floki | 5 | 7 | Ongoing: Enemy cards here with 2 or less Power have -1 Power. |
| Pepe | 5 | 5 | On Reveal: Give your other cards here +1 Power. |
| Pengu | 5 | 6 | Ongoing: Your On Reveal cards here have +1 Power. |
| Kekius Maximus | 5 | 8 | If this is your only card here, +4 Power. |
| Troll | 6 | 10 | End of game: Swap this card's Power with the strongest enemy here. |
| Doge | 6 | 8 | On Reveal: Give your other cards here +2 Power. |

### Locations (8 total)

| Location | Effect |
|----------|--------|
| Agartha | Cards played here contribute to a shared pool; highest pool wins. |
| Chillhouse | Cards here can't have their Power reduced. |
| Solangeles | On Reveal abilities trigger twice here. |
| Miami | Cards played here gain +1 Power. |
| Backrooms | At the end of each turn, the lowest-Power card here is destroyed. |
| Wall Street | Cards cost 1 less Energy here. |
| Crypto Bro Room | The first card played here each turn gets +3 Power. |
| Garage with Supercars | Each side can only play 1 card here. |

### Bosses (8 total)

| Boss | Signature Card |
|------|---------------|
| Rug Pull Goblin | Retardio |
| Bot Swarm | Popcat |
| Jeet Dragon | Dogwifhat |
| Whale Lord | Kekius Maximus |
| Market Maker | Wojak |
| Pepe the Ancient | Pepe |
| Moo Deng Rampage | Moodeng |
| Liquidity Vampire | Doge |

## 🖼 Adding art

Drop images into `public/cards/<slug>.png` and `public/bosses/<slug>.png` (see the
README in each folder for filenames). The UI shows polished placeholders until then —
no broken images, no code changes needed.

## 🗺 Roadmap

**Shipped**

- ✅ Visual foundation — shadcn/ui, green palette, light/dark toggle, responsive
  nav (bottom-nav mobile / sidebar desktop), mobile-friendly, redesigned dashboard.
- ✅ Clash-Royale-style deck builder (active deck on top, collection inventory below).
- ✅ Cosmetic-only upgrades (card frame tiers — no stat changes).
- ✅ Card ownership (6 free cards) + Mystery Boxes + win-a-card drops.

**Next**

- **PvP** — the destination for the Arena mode (bots today). The turn-submit
  backend is scaffolded (migration `0006`, `pvp-matchmake` / `pvp-submit-turn`,
  `src/lib/api/pvp.ts`); still needs a two-player engine resolver and the realtime
  battle UI.

---

Not affiliated with any token or meme. Devnet MVP for entertainment.
