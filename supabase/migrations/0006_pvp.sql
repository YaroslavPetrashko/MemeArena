-- 0006_pvp.sql
--
-- PvP scaffolding (turn-submit model). The Arena mode is heading to real
-- player-vs-player; this is the fresh schema for it. Resolution stays
-- server-authoritative: each turn both players submit their staged plays, and an
-- Edge Function replays the turn with the shared SNAP engine (see
-- supabase/functions/_shared/snap) and writes the authoritative board state.
--
-- NOTE: the legacy MVP tables in 0001-0005 are unrelated to this. Matchmaking and
-- turn resolution run through the service role (Edge Functions), so RLS here only
-- needs to let a player read their own queue entry and the matches they're in.

-- ----------------------------------------------------------------------------
-- Matchmaking queue: one active entry per player.
-- ----------------------------------------------------------------------------
create table if not exists public.pvp_queue (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null default 'arena',
  mmr integer not null default 1000,
  deck jsonb not null,                       -- array of 12 card ids (validated server-side)
  status text not null default 'waiting' check (status in ('waiting', 'matched', 'cancelled')),
  match_id uuid,                             -- set when paired
  created_at timestamptz not null default now(),
  unique (profile_id)
);
create index if not exists idx_pvp_queue_status on public.pvp_queue (status, mode, created_at);

-- ----------------------------------------------------------------------------
-- Matches: a head-to-head game between two players.
-- ----------------------------------------------------------------------------
create table if not exists public.pvp_matches (
  id uuid primary key default gen_random_uuid(),
  mode text not null default 'arena',
  seed text not null,                        -- drives deterministic locations/draws
  player_a uuid not null references public.profiles (id) on delete cascade,
  player_b uuid not null references public.profiles (id) on delete cascade,
  deck_a jsonb not null,
  deck_b jsonb not null,
  status text not null default 'active' check (status in ('active', 'complete', 'abandoned')),
  current_turn integer not null default 1,
  max_turns integer not null default 6,
  state jsonb,                               -- authoritative board snapshot after the last resolved turn
  result text check (result in ('player_a', 'player_b', 'draw')),
  winner uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_pvp_matches_a on public.pvp_matches (player_a, status);
create index if not exists idx_pvp_matches_b on public.pvp_matches (player_b, status);

-- ----------------------------------------------------------------------------
-- Per-turn submissions. Both rows present for a turn → the Edge Function resolves
-- it and advances pvp_matches.current_turn.
-- ----------------------------------------------------------------------------
create table if not exists public.pvp_match_turns (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.pvp_matches (id) on delete cascade,
  turn integer not null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  actions jsonb not null default '[]'::jsonb,  -- [{ cardId, locationId, orderIndex }]
  submitted_at timestamptz not null default now(),
  unique (match_id, turn, profile_id)
);
create index if not exists idx_pvp_turns_match on public.pvp_match_turns (match_id, turn);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.pvp_queue enable row level security;
alter table public.pvp_matches enable row level security;
alter table public.pvp_match_turns enable row level security;

-- Queue: a player manages only their own entry.
create policy "pvp_queue_select_own" on public.pvp_queue
  for select using (auth.uid() = profile_id);
create policy "pvp_queue_insert_own" on public.pvp_queue
  for insert with check (auth.uid() = profile_id);
create policy "pvp_queue_update_own" on public.pvp_queue
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Matches: only the two participants can read.
create policy "pvp_matches_select_participant" on public.pvp_matches
  for select using (auth.uid() = player_a or auth.uid() = player_b);

-- Turns: participants read all turns of their match; a player inserts only their own.
create policy "pvp_turns_select_participant" on public.pvp_match_turns
  for select using (
    exists (
      select 1 from public.pvp_matches m
      where m.id = match_id and (auth.uid() = m.player_a or auth.uid() = m.player_b)
    )
  );
create policy "pvp_turns_insert_own" on public.pvp_match_turns
  for insert with check (auth.uid() = profile_id);
