<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# MemeArena — project guide for agents

> Read this before touching the codebase. It captures what the project is, where
> the owner is coming from, the current state, and the rules that aren't obvious
> from the code. Keep it updated as the project evolves.

## What this is

MemeArena is an **onchain crypto-meme card battler** — a Marvel SNAP-style game
with a Solana token layer. The player connects a Phantom wallet (or plays as a
guest), builds a 12-card meme deck, and fights bot-controlled opponents across a
3-location board. Winning earns soft currency (Coins/Gems) and **pending,
claimable MEMEARENA** token rewards for wallet players.

It is built as a polished MVP / vertical slice: it should look and feel like a
real game, run with **zero configuration** (local guest mode + mocked onchain
flows), and progressively light up real Supabase + Solana when env vars are set.

**Compliance posture matters to the owner.** MemeArena is framed as a *game*, not
an investment. Reward copy everywhere says rewards are not guaranteed, are
capped/validated, and nothing is financial advice. Preserve that framing.

## Owner's goals & where they're coming from

- This is a solo-built project; the owner iterates fast and visually, often
  asking for tuning of the battle UI (card sizes, spacing, layout, drag/drop).
- **The current focus is the gameplay feel and the battle screen** — getting the
  SNAP-style board to look great and play smoothly.
- **Direction: the single mode will become PvP.** The game was just collapsed
  from five PvE modes down to one free, unlimited **"Arena"** mode (bot opponents
  for now). It is intentionally named neutrally so PvP can slot in. Do NOT
  reintroduce the old modes; build toward player-vs-player.
- The card/boss/location art is being generated incrementally (Marvel-SNAP-style
  full-art PNGs). Expect missing art to be common; always degrade gracefully
  (placeholder initials / themed fallbacks), never a broken image or crash.
- Prefer **descriptive, self-explanatory changes** and confirm visual results;
  the owner will tell you if sizing/spacing needs another pass.

## Tech stack

- **Next.js 16** (App Router) — ⚠️ see the breaking-changes note at the top; check
  `node_modules/next/dist/docs/` before using Next APIs.
- **React 19**, **TypeScript**, **Tailwind v4**, **Framer Motion** (animation +
  drag), **Zustand** (state), **TanStack Query**.
- **Supabase** (Postgres + Auth + RLS + Deno Edge Functions) for
  server-authoritative rewards.
- **Solana** web3.js + SPL Token, **Phantom** provider, Sign-In-With-Solana.
- No test runner is installed (see "Testing" below).

## How to run

```bash
npm install
cp .env.example .env.local   # optional — works with no keys
npm run dev                  # http://localhost:3000
npm run build                # production build (also runs tsc)
npm run lint                 # eslint
```

With no env vars, everything runs in **local guest mode**: progress saves to
`localStorage` (`src/lib/storage/playerStorage.ts`, version-migrated), and
wallet/purchase/claim use safe mocks. Real Supabase/Solana light up when the
corresponding env vars + Edge Function secrets are set (see README).

## The game, concretely

- **Match:** 6 turns, 3 locations, simultaneous reveal. Win 2 of 3 locations.
  Energy ramps each turn; cards have a cost and Power.
- **Abilities:** On Reveal, Ongoing, Conditional, End Game. ~16 cards, 8 bosses
  (with AI personalities), 8 locations with board effects.
- **Single mode:** `"arena"` — free, unlimited, bot opponents drawn from
  `BOSS_RUSH_ORDER`. (Was Boss Rush / Daily Boss / Survival / Limited Event /
  High Roller — all removed.)
- **Economy:** Coins + Gems are soft currency. MEMEARENA is the onchain reward
  token, always recomputed server-side and never trusted from the client.

## Architecture map

```
src/
  app/                 routes: / play battle deck upgrades shop leaderboards
                       profile claim admin/dev-tools
  components/
    snap/              SnapBattleScreen + SnapBossArt + SnapCard
      ui/              the battle-screen pieces: BattleShell, SnapGameBoard,
                       SnapLocationPanel, SnapHand, SnapCard, score badges,
                       energy orb, end-turn/retreat buttons, result modal
    ui/ layout/ providers/ common/
  data/                snapCards, snapBosses, snapLocations, snapModes, modes,
                       shop, rewardEconomy, cosmetics, upgrades, mockLeaderboards
  lib/
    game/snap/         THE ENGINE: snapEngine, snapAbilities, snapLocations,
                       snapScoring, snapRewards, snapBossAI, bossPassives,
                       bossIntent, replay, prng, engineOps, helpers, cardGuide
    game/              entryGates, progression, snapUpgrades, rng
    wallet/            phantom, tokenPurchase, tokenClaim
    supabase/ storage/ utils/ api/  (api/snap.ts submits results to the server)
  store/               gameStore (profile/save/rewards), snapStore (live match),
                       snapLaunchStore (play→battle handoff), snapDragStore
                       (drag-to-place), snapCardModalStore
  types/               index.ts, snap.ts
supabase/
  migrations/          0001 schema, 0002 RLS, 0003 seed, 0004 snap_match,
                       0005 single_arena_mode  (apply with `supabase db push`)
  functions/           submit-snap-result (authoritative replay), consume-mode-
                       entry, claim-memearena-rewards, verify-token-purchase,
                       create-wallet-nonce, verify-wallet-signature,
                       submit-battle-result (legacy, not on the active path)
    _shared/snap/      MIRROR of the client engine (see CRITICAL invariant below)
```

## CRITICAL invariants — read before editing

1. **The SNAP engine is mirrored client↔server.** `src/lib/game/snap/` is
   duplicated into `supabase/functions/_shared/snap/` because Deno can't import
   the `@/` alias. When you change engine logic, scoring, rewards, replay, or
   `src/data/snap*`, **apply the same change to both copies.** In the mirror:
   imports are flat with explicit `.ts` extensions, data files are `data_*`
   prefixed, and engine code must stay pure/isomorphic (no React, no
   `Math.random`, no `Date` — all randomness flows through the seeded PRNG in
   `prng.ts`). A divergence silently breaks reward validation.
   - **Known drift:** the card/boss *data pools* have diverged between client and
     server (different IDs). The engine *logic* is mirrored; the *data* is not
     fully. A real shared client↔server replay can't reproduce until that's
     reconciled — worth fixing before wiring up live token rewards.

2. **Rewards are server-authoritative.** `submit-snap-result` replays the match
   from the seed + action log and recomputes the result, score, and MEMEARENA.
   Never trust or grant token rewards from the client. The client mirror in
   `gameStore.applySnapOutcome` is an optimistic, "pending" local view only.

3. **Drag-to-place perf + correctness.** The battle board uses a dedicated
   `snapDragStore`. Never store the live drag pointer in shared/reactive state
   (it caused a 60fps render storm that froze the board) — keep zone rects in a
   module-level Map and expose only a derived `hoveredZoneId`. The draggable
   wrapper must own the gesture (the inner card is `pointer-events-none`), and
   framer-motion's `PanInfo.point` is in **page** coords — convert to viewport
   coords before hit-testing rects.

4. **Art degrades gracefully.** Cards and locations are frameless full-art PNGs
   with cost/power/name baked into the image. Many are missing. Always fall back
   to placeholder initials / themed gradients; guard the cached-`<img>` onLoad
   race by checking `img.complete` in the ref callback.

## Progress so far

- ✅ Deterministic SNAP engine (client + server mirror), seeded replay, scoring.
- ✅ Full battle screen redesign: cinematic 3-location board, full-art locations
  (Chillhouse / Miami / Garage so far), drag-to-place + tap-to-place, hand fan,
  energy orb, result modal, match log.
- ✅ Wallet connect (Phantom + SIWS), reward ledger, claim flow, gem purchase —
  all with mock fallbacks for keyless local dev.
- ✅ Supabase schema, RLS, seed, and Edge Functions.
- ✅ PostHog analytics wired (`instrumentation-client.ts`, `battle_*` events).
- ✅ **Collapsed to a single free "Arena" mode** (migration `0005`); removed
  Survival/event mechanics, per-mode entry gating, and event modifiers.

## Near-term direction / open work

- **PvP** is the destination for the Arena mode (currently bots).
- Finish generating card/location/boss art; reconcile the client↔server card
  pools (invariant #1) before relying on live reward replay.
- Battle-screen polish is ongoing and owner-driven.
- Production hardening: rate limits, fraud flagging, reward-vault key handling,
  treasury controls (scaffolding + `TODO` markers exist).

## Conventions

- File references in chat use clickable `[text](relative/path#Lline)` markdown.
- Match the surrounding code's style; this codebase favors descriptive comments
  explaining *why* (especially around the engine, rewards, and drag perf).
- `cn()` (`src/lib/utils/cn.ts`) merges Tailwind classes.
- Confirm hard-to-reverse / outward-facing actions (commits, deploys, applying
  migrations) before doing them. The owner applies DB migrations themselves.

## Testing

No test runner is installed. To validate the engine, compile a throwaway `.ts`
under `src/` with a `/tmp` tsconfig (`module: commonjs`, alias `@/` → built
output) and run with node. Validate: (a) same seed → identical client result
(determinism), and (b) the server mirror runs/scores on its own data. Always
finish with `npm run build` (it runs `tsc`) + `npm run lint`.
