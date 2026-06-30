-- 0007_pvp_guest.sql
--
-- Guest-friendly PvP for the MVP: NO login. Players are identified by a stable
-- client-generated guest id (the local `guest_xxx` profile id). Replaces the
-- auth-based 0006 tables. Writes go through the service-role Edge Functions
-- (pvp-matchmake / pvp-submit-turn); clients only SELECT (for Realtime), so RLS
-- is intentionally permissive. TIGHTEN with real auth before production.

drop table if exists public.pvp_match_turns cascade;
drop table if exists public.pvp_matches cascade;
drop table if exists public.pvp_queue cascade;

-- ----------------------------------------------------------------------------
-- Matchmaking queue (one active entry per guest).
-- ----------------------------------------------------------------------------
create table public.pvp_queue (
  id uuid primary key default gen_random_uuid(),
  guest_id text not null unique,
  username text not null default 'Guest',
  deck jsonb not null,                       -- [{ cardId, level }]
  status text not null default 'waiting' check (status in ('waiting', 'matched', 'cancelled')),
  match_id uuid,
  created_at timestamptz not null default now()
);
create index idx_pvp_queue_status on public.pvp_queue (status, created_at);

-- ----------------------------------------------------------------------------
-- Matches. `state` holds the canonical SnapMatchState snapshot after the last
-- resolved turn (player A = "player" side, player B = "boss" side).
-- ----------------------------------------------------------------------------
create table public.pvp_matches (
  id uuid primary key default gen_random_uuid(),
  seed text not null,
  player_a text not null,                    -- guest id
  player_b text not null,
  username_a text not null default 'Guest',
  username_b text not null default 'Guest',
  deck_a jsonb not null,
  deck_b jsonb not null,
  status text not null default 'active' check (status in ('active', 'complete', 'abandoned')),
  current_turn integer not null default 1,
  max_turns integer not null default 6,
  state jsonb,                               -- SnapMatchState snapshot
  result text check (result in ('player_a', 'player_b', 'draw')),
  winner text,                               -- guest id of the winner, or null
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_pvp_matches_players on public.pvp_matches (player_a, player_b, status);

-- ----------------------------------------------------------------------------
-- Per-turn submissions. Both rows present for a turn → the Edge Function
-- replays the match deterministically and advances current_turn.
-- ----------------------------------------------------------------------------
create table public.pvp_match_turns (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.pvp_matches (id) on delete cascade,
  turn integer not null,
  guest_id text not null,
  actions jsonb not null default '[]'::jsonb,  -- [{ instanceId, locationId, orderIndex }]
  submitted_at timestamptz not null default now(),
  unique (match_id, turn, guest_id)
);
create index idx_pvp_turns_match on public.pvp_match_turns (match_id, turn);

-- ----------------------------------------------------------------------------
-- RLS — MVP: permissive SELECT for Realtime; all writes are service-role only.
-- ----------------------------------------------------------------------------
alter table public.pvp_queue enable row level security;
alter table public.pvp_matches enable row level security;
alter table public.pvp_match_turns enable row level security;

create policy "pvp_queue_read" on public.pvp_queue for select using (true);
create policy "pvp_matches_read" on public.pvp_matches for select using (true);
create policy "pvp_turns_read" on public.pvp_match_turns for select using (true);

-- Let a client cancel its own queue entry (MVP: not scoped — tighten with auth).
create policy "pvp_queue_cancel" on public.pvp_queue for update using (true) with check (true);

-- Realtime: clients subscribe to their match row for state/turn/status changes.
alter publication supabase_realtime add table public.pvp_matches;
