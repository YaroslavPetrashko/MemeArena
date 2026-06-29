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
- **Make it feel like a game, on every device.** The desktop sidebar is being
  replaced by a **responsive nav** — a bottom tab bar on mobile/tablet
  (Marvel-SNAP style) and a refined sidebar on desktop — and the whole app is
  being made mobile-friendly. See "Design system & UX direction" below.
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
- **UI:** migrating to **shadcn/ui** (full migration) with a **green** accent
  palette and a **light/dark theme toggle**. The legacy `components/ui/*`
  (Button, Panel, Badge, …) are being replaced by shadcn equivalents.
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
- **Abilities:** On Reveal, Ongoing, Conditional, End Game. 15 meme cards, 8
  bosses (with AI personalities), 8 locations with board effects. Cards have
  **no rarity** (removed) — only Energy (cost) and Strength (power).
- **Single mode:** `"arena"` — free, unlimited, bot opponents drawn from
  `BOSS_RUSH_ORDER`. (Was Boss Rush / Daily Boss / Survival / Limited Event /
  High Roller — all removed.)
- **Economy:** Coins + Gems are the only soft currencies — **XP, Shards, and
  Arena Tickets were removed**. MEMEARENA is the onchain reward token, always
  recomputed server-side and never trusted from the client.
- **No "Ape In":** the old match-stake "Ape In" multiplier was removed from the
  battle UI (a vestigial `ApeInState` may still linger in engine types).
- **Card upgrades are moving to cosmetic-only** (see open work): leveling a card
  should unlock new art / frames — **not** change its Energy, Strength, or
  ability magnitude.

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
                       0005 single_arena_mode, 0006 pvp  (apply with `supabase db push`)
  functions/           submit-snap-result (authoritative replay), consume-mode-
                       entry, claim-memearena-rewards, verify-token-purchase,
                       create-wallet-nonce, verify-wallet-signature,
                       pvp-matchmake + pvp-submit-turn (PvP scaffold),
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

## Design system & UX direction (in progress)

A "visual foundation" overhaul is underway. Build new screens against it, and
migrate old ones as you touch them:

- **shadcn/ui, full migration.** Replace the custom `components/ui/*` primitives
  with shadcn components. New UI should use shadcn.
- **Green accent palette** and a **light/dark theme toggle** (theme persisted).
- **Responsive nav:** bottom tab bar on mobile/tablet (Marvel-SNAP style), a
  refined sidebar on desktop. The old always-left `AppShell` sidebar is going.
- **Mobile-friendly everywhere** — layouts, tap targets, the battle board.
- The **dashboard / landing page** still ships the first-MVP layout and needs a
  full redesign.

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
- ✅ **Simplified the economy** to Coins + Gems only (removed XP, Shards, Arena
  Tickets) and removed the "Ape In" button/flow from the battle UI.
- ✅ **Removed card rarity** entirely; upgrade cost is now flat (not rarity-scaled).
- ✅ **Overhauled content:** 15 meme cards (John Pork → Doge) and 8 new locations;
  starter deck + boss decks rebuilt around the new pool.

## Near-term direction / open work

Agreed roadmap (owner-driven, roughly in priority order):

1. **Visual foundation (in progress).** Full **shadcn/ui** migration, **green**
   palette, **light/dark theme toggle**, **responsive nav** (bottom tab bar on
   mobile, sidebar on desktop), mobile-friendly throughout, and a full
   **dashboard / landing-page redesign**. See "Design system & UX direction".
2. **Deck builder rework.** Clash-Royale-style: the active 12-card deck on top,
   the rest of the collection in an inventory below it.
3. **Cosmetic-only upgrades.** Card leveling changes **only** art and borders —
   never Energy/Strength or ability magnitude. This lets the level→power/cost
   scaling be removed from the engine (and its server mirror).
4. **Economy / unlocks.** Add **mystery boxes / cases** (gem-purchased) to unlock
   new cards, a real card **ownership/unlock** system (cards are currently all
   unlocked at start), and more **gem sinks**.
5. **PvP** — the destination for the Arena mode (currently bots). **Scaffolded**
   (turn-submit model): migration `0006_pvp.sql` (`pvp_queue` / `pvp_matches` /
   `pvp_match_turns` + RLS), Edge Functions `pvp-matchmake` (enqueue + pairing)
   and `pvp-submit-turn` (per-turn submission), and the client API
   `src/lib/api/pvp.ts`. **Remaining:** a two-player engine variant
   (`createPvpMatch` — today's engine is bot-vs-player) to authoritatively
   resolve a turn from both players' actions and set winner/result, plus the
   realtime battle UI. Apply `0006` on the Supabase project to use it. (The older
   `0001`–`0005` migrations are first-MVP cruft, largely superseded.)
6. **Battle polish.** Drag-and-drop placement feel + animations, and reconciling
   the client↔server card pools (invariant #1) before live reward replay.
7. **Production hardening:** rate limits, fraud flagging, reward-vault key
   handling, treasury controls (scaffolding + `TODO` markers exist).

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
