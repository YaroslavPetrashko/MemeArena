# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into MemeArena. PostHog is initialized via `instrumentation-client.ts` (Next.js 15.3+ pattern) with a reverse proxy through `/ingest` so ad-blockers cannot block analytics. Fifteen events spanning the core battle, economy, deck-building, and wallet flows are instrumented across six files. Users are identified by their Phantom wallet address on connection, and PostHog is reset on disconnect.

| Event | Description | File |
|---|---|---|
| `battle_started` | User launches a battle by selecting a mode and entry method | `src/app/play/page.tsx` |
| `game_mode_selected` | User selects a game mode on the play page | `src/app/play/page.tsx` |
| `battle_completed` | A battle ends and the result modal is shown | `src/components/snap/SnapBattleScreen.tsx` |
| `battle_retreated` | User retreats from an active battle | `src/components/snap/SnapBattleScreen.tsx` |
| `ape_in_toggled` | User activates the Ape-In reward multiplier mid-battle | `src/components/snap/SnapBattleScreen.tsx` |
| `deck_card_toggled` | User adds or removes a card from their deck | `src/components/deck/SnapDeckBuilder.tsx` |
| `deck_completed` | User fills all 12 deck slots | `src/components/deck/SnapDeckBuilder.tsx` |
| `gem_purchase_initiated` | User clicks the buy button for a gem package | `src/app/shop/page.tsx` |
| `gem_purchase_completed` | Gem purchase transaction succeeds | `src/app/shop/page.tsx` |
| `gem_purchase_failed` | Gem purchase transaction fails | `src/app/shop/page.tsx` |
| `card_upgraded` | User successfully upgrades a card to the next level | `src/app/upgrades/page.tsx` |
| `token_claim_initiated` | User clicks the Claim MEMEARENA button | `src/app/claim/page.tsx` |
| `token_claim_completed` | Token claim transaction succeeds | `src/app/claim/page.tsx` |
| `wallet_connected` | User successfully connects their Phantom wallet | `src/hooks/useWallet.ts` |
| `wallet_disconnected` | User disconnects their Phantom wallet | `src/hooks/useWallet.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/489137/dashboard/1770247)
- [Battles started per day](https://us.posthog.com/project/489137/insights/FsscR44p)
- [Battle outcomes (win vs loss)](https://us.posthog.com/project/489137/insights/iPUrhRTo)
- [Gem shop conversion funnel](https://us.posthog.com/project/489137/insights/A5pYrTkm)
- [Wallet connections per day](https://us.posthog.com/project/489137/insights/pHiEBnN1)
- [Token claim funnel](https://us.posthog.com/project/489137/insights/p1cJH7ZU)

## Verify before merging

- [ ] Run a full production build (`npm run build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify in PostHog Error Tracking.
- [ ] Confirm the returning-visitor path also calls `posthog.identify()` — currently identify is called only on fresh wallet connection. Returning users who skip the connect flow will remain on anonymous IDs until they reconnect. Consider calling `posthog.identify(walletAddress)` during app hydration if a saved wallet address is found in local storage.

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
