-- 0004_snap_match
--
-- MemeArena is now a Marvel SNAP-style PvE card game. The match engine is
-- deterministic and replayed server-side by the submit-snap-result Edge
-- Function. This migration is ADDITIVE only — it reuses the existing `battles`
-- table (which already stores battle_seed + action_log + deck_snapshot as
-- jsonb) and adds two nullable columns for SNAP-specific board/scoring data.
-- No drops, no destructive changes; existing RLS on `battles` still applies
-- (users read their own; only the service role writes via Edge Functions).

alter table public.battles
  add column if not exists snap_locations jsonb,
  add column if not exists snap_result jsonb;

comment on column public.battles.snap_locations is
  'Per-location final scores for a SNAP match (player/boss power + winner).';
comment on column public.battles.snap_result is
  'Full SnapScore object recomputed by the authoritative server replay.';
