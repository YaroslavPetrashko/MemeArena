# MemeArena 🎴⚔️

A minimalist-but-polished **onchain crypto meme card battler**. PvE-first: connect
Phantom (or play as guest), build an 8-card meme deck, fight bot-controlled meme
bosses, earn in-game currency, upgrade cards, climb leaderboards, and win
claimable **MEMEARENA** token rewards on Solana.

> MemeArena is a game. Rewards are not guaranteed. MEMEARENA token rewards are
> subject to validation, caps, and availability. Nothing here is financial
> advice. Play for fun. Bonk responsibly.

---

## ✨ Highlights

- **Slay-the-Spire-lite battles** — turn-based, energy/shield/intent, 60–120s fights.
- **16 meme cards + 8 bot bosses** with combos, statuses, crits, and chaos.
- **4 game modes**: Boss Rush, Daily Meme Boss, Survival, Limited Event (Brainrot Week).
- **Full reward economy**: Coins, Gems, pending/claimable MEMEARENA.
- **Grind-or-pay entry gating** with daily/weekly/per-mode reward caps + anti-farm.
- **Phantom wallet** connect + Sign-In-With-Solana, MEMEARENA→Gems purchase, reward claim flow.
- **Supabase** schema, RLS, and Edge Functions for server-authoritative rewards.
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
  components/     ui/ game/ battle/ layout/ providers/ common/
  data/           cards, bosses, combos, upgrades, modes, shop, rewardEconomy, cosmetics, mockLeaderboards
  lib/
    game/         battleEngine, cardEffects, bossAI, comboEngine, rewards, scoring, upgrades, entryGates, rng, progression
    wallet/       phantom, tokenPurchase, tokenClaim
    supabase/     client, server
    storage/      playerStorage (local-first cache)
    utils/        format, cn
    api/          battle (server submit), env
  store/          gameStore, battleStore (Zustand)
  types/          all shared types
supabase/
  migrations/     0001_initial_schema, 0002_rls_policies, 0003_seed_content
  functions/      create-wallet-nonce, verify-wallet-signature, verify-token-purchase,
                  submit-battle-result, claim-memearena-rewards, consume-mode-entry
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
`src/data/*` so the economy is easy to rebalance. Reward math is a single pure
function (`lib/game/rewards.ts`), mirrored server-side in the Edge Function.degen. on-chain. every single day.
building in public on pump.fun since day one.
watch live


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

### Cards (16 total)

| Card | Cost | Power | Rarity | Ability |
|------|------|-------|--------|---------|
| John Pork | 1 | 1 | Common | On Reveal: Draw a card |
| Moodeng | 1 | 2 | Rare | On Reveal: Give your other cards here +1 Power |
| Chillguy | 2 | 2 | Rare | Ongoing: Your cards here can't be destroyed |
| Pnut | 2 | 2 | Rare | On Reveal: Give this card +2 Power |
| Retardio | 3 | 2 | Epic | Special Attack: Deal 3 damage to an enemy card |
| Popcat | 3 | 6 | Rare | On Reveal: Add a Pop Token here if there is space |
| Tung | 3 | 4 | Rare | On Reveal: Disable the next enemy On Reveal here this turn |
| Dogwifhat | 4 | 4 | Epic | If you are winning this location, this has +2 Power |
| Wojak | 4 | 6 | Epic | On Reveal: Give the next card you play +2 Power |
| Floki | 5 | 7 | Epic | Ongoing: Your other cards here have +1 Power |
| Pepe | 5 | 5 | Legendary | Superhit: If this wins, deal +3 damage to the boss |
| Pengu | 5 | 6 | Epic | On Reveal: Give all your cards here +1 Power |
| Kekius Maximus | 5 | 8 | Legendary | On Reveal: Give your other cards here +2 Power |
| Troll | 6 | 10 | Epic | Ongoing: Enemy cards here have -1 Power |
| Doge | 6 | 8 | Epic | On Reveal: Give all your cards here +1 Power |

### Locations (8 total)

1. Agartha
2. Chillhouse
3. Solangeles
4. Miami
5. Backrooms
6. Wall Street
7. Crypto bro room
8. Garage with supercars

## 🖼 Adding art

Drop images into `public/cards/<slug>.png` and `public/bosses/<slug>.png` (see the
README in each folder for filenames). The UI shows polished placeholders until then —
no broken images, no code changes needed.

---

Not affiliated with any token or meme. Devnet MVP for entertainment.
