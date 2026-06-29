-- 0005_single_arena_mode
--
-- Collapse the game to a single "arena" mode (PvP may be added later). The old
-- modes (boss_rush, daily_boss, survival, limited_event, high_roller) are gone
-- from the app, so this migration aligns the database:
--   * daily_limits: replace the per-mode reward columns with one `arena_rewards`
--     (carrying over any existing per-mode totals), and drop the now-unused
--     free-entry tracking columns (arena is free + unlimited).
--   * normalize historical `mode` text values to 'arena' on battles,
--     leaderboard_entries, mode_entries, and reward_ledger metadata.
--   * point every boss's `mode_availability` at {arena} so all bosses are
--     selectable as Arena opponents.
--
-- `mode` columns are plain text (no enum/CHECK), so no type change is needed.

-- --- daily_limits: consolidate per-mode reward counters into arena_rewards ----
alter table public.daily_limits
  add column if not exists arena_rewards numeric not null default 0;

-- Carry over any existing per-mode usage into the single arena bucket so today's
-- caps aren't silently reset for active players.
update public.daily_limits
set arena_rewards = coalesce(boss_rush_rewards, 0)
                  + coalesce(daily_boss_rewards, 0)
                  + coalesce(survival_rewards, 0)
                  + coalesce(event_rewards, 0);

alter table public.daily_limits
  drop column if exists boss_rush_rewards,
  drop column if exists daily_boss_rewards,
  drop column if exists survival_rewards,
  drop column if exists event_rewards,
  drop column if exists free_daily_boss_used,
  drop column if exists free_survival_runs_used;

-- --- normalize historical mode values to 'arena' ----------------------------
update public.battles set mode = 'arena' where mode is distinct from 'arena';
update public.leaderboard_entries set mode = 'arena' where mode is distinct from 'arena';
update public.mode_entries set mode = 'arena' where mode is distinct from 'arena';

-- reward_ledger stores mode inside jsonb metadata.
update public.reward_ledger
set metadata = jsonb_set(metadata, '{mode}', '"arena"')
where metadata ? 'mode' and metadata->>'mode' is distinct from 'arena';

-- --- bosses: make every boss an Arena opponent ------------------------------
update public.bosses set mode_availability = '{arena}';
