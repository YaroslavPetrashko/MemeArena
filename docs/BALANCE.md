# MemeArena — Balance & Economy

Single source for the gameplay/economy tuning rationale. Numbers live in
`src/data/ranks.ts`, `src/data/rewardEconomy.ts`, and
`src/lib/game/snap/snapRewards.ts` (mirrored to the server).

## Match shape

- 6 turns · 3 locations · simultaneous reveal · win 2 of 3 lanes.
- Energy **ramps with the turn** (turn _t_ → _t_ energy), **21 total** over 6 turns.
- Decks are **6–12 cards** (`SNAP_MIN_DECK_SIZE` = 6, `SNAP_DECK_SIZE` = 12).

## Card power curve (current)

Rough SNAP benchmark: a vanilla card ≈ `cost·2`; cards under that "pay" the
difference in ability value.

| Card | Energy | Strength | Notes |
|------|:--:|:--:|------|
| John Pork | 1 | 1 | vanilla, intentionally weak filler |
| Moodeng | 1 | 2 | can't be reduced (sticky) |
| Chillguy | 2 | 2 | ongoing +1 others here |
| Pnut | 2 | 2 | energy ramp |
| Retardio | 3 | 2 | strong random swing |
| **Popcat** | 3 | **5** | **was 6** — over-curve + spawns a token; now on-curve |
| Tung | 3 | 4 | On-Reveal silence |
| Dogwifhat | 4 | 4 | +2 while winning here |
| Wojak | 4 | 6 | buffs next card +2 |
| Floki | 5 | 7 | ongoing debuff of small enemies |
| Pepe | 5 | 5 | +1 others here (lane buffer) |
| Pengu | 5 | 6 | ongoing buff to On-Reveal cards |
| **Land Wolf** (`kekius_maximus`) | 4 | 6 | alone-here bonus **+3** (was +4) |
| Troll | 6 | 10 | end-game power swap (high variance) |
| Doge | 6 | 8 | +2 others here (lane buffer) |

## Abuse cases addressed (this pass)

1. **Popcat 3/6 → 3/5.** 6 Strength at 3 Energy *and* a spawned token was the most
   efficient body in the pool. Still a strong free starter at 5.
2. **Land Wolf alone-bonus +4 → +3.** At **Garage with Supercars (1 slot/side)** a
   card is always "alone", so the bonus was auto-active → a guaranteed 10-Strength
   lane for 4 Energy. Now 9 (and Wall Street taxes it: ≥5 Strength −2). Engine
   change in `conditionalOngoing` (client + server mirror).
3. **Score over-stack farm.** `powerPoints = (playerTotal − bossTotal) · 8` let a
   player overload one lane to inflate the composite score → MEMEARENA. Capped the
   differential at **40** (`min(40, diff) · 8`). Winning 2/3 only needs a modest
   lead anyway. `snapScoring.ts` (client + server mirror).
4. **Solangeles (On-Reveal ×2) + buffers (Pepe/Doge):** can explode a single lane,
   but you still only win 2 of 3 — over-investing one lane loses the match.
   Left as intentional high-variance; watch.

## Economy / supply

- **Entry:** free + unlimited (best for grinding ranks). Emission is controlled by
  caps + tapers below rather than an entry fee.
- **Start:** 100 Coins, 0 Gems, 6 free cards (rest unlocked by winning / boxes / buying).
- **Coins/win:** `(40·diffMult + 10·locationsWon)` × **rankMult** × **streakMult** × **dailyTaper**.
- **Daily coin taper** (`SOFT_CURRENCY_TAPER`): first 10 wins full → wins 11–20 ×0.5
  → beyond ×0.25. Stops unlimited free entry from minting infinite Coins.
- **Gems/win:** `round((1 + floor(diffValue/2)) · rankMult)` — scarce, untapered.
- **MEMEARENA:** **server-authoritative**. `base · diffMult · scoreMult · streak ·
  antiFarm`, then `min`'d by the global daily caps **and** the per-tier cap. Wallet
  players only; the client value is optimistic/pending until the server replay approves.

## Competitive ranks (ELO)

`src/data/ranks.ts`. Ladder: **Paperhands → Shrimp → Crab → Degen → Ape → Chad →
Whale → Giga** (each III→II→I) → **Meme Lord** (apex).

- 100 RP per division, 300 per tier, apex at **2400 RP**.
- **Win RP** `= 25 + difficultyValue·3 + min(streak,5)·2` (~28–55). **Loss RP** `= −12`
  (forgiving; floored at 0).
- **rankRewardMultiplier** `= 1 + tierIndex·0.12` (1.0 → 2.0, Coins/Gems).
- **streakMultiplier** `= 1 + min(0.5, streak·0.1)`.
- **tierTokenCap** `= round(5 + tierIndex·2.5)` (Paperhands 5 → Meme Lord 25) — raises the
  personal MEMEARENA ceiling as you climb (still under global caps).
- **Season:** monthly (`YYYY-MM`); on rollover RP soft-resets to 40% + a peak-tier reward.

## Known divergence / follow-ups

- The **server card-data pool** (`supabase/functions/_shared/snap/data_snapCards.ts`)
  is stale (different ids/stats, still has `rarity`). Card **stat** tweaks here are
  **client-only**; the shared **engine logic** (alone bonus, score cap, reward
  formula) IS mirrored. Reconcile the pools before relying on live reward replay
  (AGENTS invariant #1).
- Card art bakes in stats — Popcat/Land Wolf PNGs show old numbers until regenerated
  (art degrades gracefully, so this is cosmetic).
- The README card table still lists "Kekius Maximus 5/8"; the card is now **Land Wolf
  4/6** — refresh when convenient.
- Rank-scaled **MEMEARENA** is optimistic client-side; full server rank-aware emission
  needs rank persisted in `profiles` (ties into PvP/profiles).
