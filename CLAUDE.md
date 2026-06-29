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
- **Card ownership:** new players own **6 free cards**; the rest unlock via
  winning matches, Mystery Boxes, or buying. **Decks are 6–12 cards** (min 6 to
  play). Don't assume a full 12-card deck or that all cards are owned.
- **Card upgrades are cosmetic-only.** Don't add power/cost/ability scaling to
  card levels; leveling unlocks a frame tier (`snapFrameTier`) only.
- **The UI uses shadcn/ui** (lowercase `components/ui/*`) with a green palette and
  a light/dark toggle, and a responsive bottom-nav (mobile) / sidebar (desktop).
  Use semantic theme tokens (`bg-card`, `text-muted-foreground`, `border-border`,
  `bg-primary`) — never `bg-white/x` / `bg-black/x` / `text-white/x` (they don't
  adapt to light mode). The battle screen stays dark in both themes.
- Verify visual/gameplay changes by running the app; finish with `npm run build`
  + `npm run lint`.
