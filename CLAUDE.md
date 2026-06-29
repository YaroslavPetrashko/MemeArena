# CLAUDE.md

The full project guide — what MemeArena is, the owner's goals, current progress,
and the critical invariants — lives in **AGENTS.md** and is imported below.
Read it in full before working in this codebase.

@AGENTS.md

## Notes for Claude Code specifically

- **Single source of truth:** keep project documentation in `AGENTS.md`, not
  here. This file just imports it so both `AGENTS.md`-aware tools and Claude Code
  see the same context. Update `AGENTS.md` when the project changes.
- **Before writing any Next.js code**, read the relevant guide in
  `node_modules/next/dist/docs/` — this is Next.js 16 and differs from training
  data (see the top of `AGENTS.md`).
- **The engine is mirrored client↔server** (`src/lib/game/snap/` ↔
  `supabase/functions/_shared/snap/`). Change both. Rewards are
  server-authoritative. See the CRITICAL invariants in `AGENTS.md`.
- **The game is one free "Arena" mode, heading toward PvP.** Don't reintroduce
  the old PvE modes.
- **Economy is Coins + Gems only.** XP, Shards, Arena Tickets, and "Ape In" were
  removed — don't reintroduce them. Cards have **no rarity**.
- **Card upgrades are becoming cosmetic-only.** Don't add power/cost/ability
  scaling to card levels; leveling should change art and borders only.
- **The UI is migrating to shadcn/ui** (full migration) with a green palette and
  a light/dark toggle, and the layout to a responsive bottom-nav (mobile) /
  sidebar (desktop). Prefer shadcn components over the legacy `components/ui/*`.
- Verify visual/gameplay changes by running the app; finish with `npm run build`
  + `npm run lint`.
