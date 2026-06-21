-- MemeArena — initial schema
-- Tables for profiles, wallet auth, cards/bosses content, decks, battles,
-- rewards, claims, purchases, leaderboards, cosmetics, and daily limits.

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  wallet_address text unique,
  username text not null default 'Anon Degen',
  avatar_url text,
  player_level int not null default 1,
  xp int not null default 0,
  coins int not null default 100,
  gems int not null default 0,
  arena_tickets int not null default 0,
  shards int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- wallet_auth_nonces (SIWS-style sign-in)
-- ------------------------------------------------------------------
create table if not exists public.wallet_auth_nonces (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  nonce text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_nonces_wallet on public.wallet_auth_nonces (wallet_address);

-- ------------------------------------------------------------------
-- cards (public content)
-- ------------------------------------------------------------------
create table if not exists public.cards (
  id text primary key,
  name text not null,
  slug text not null,
  role text not null,
  rarity text not null,
  base_cost int not null,
  base_effect jsonb not null default '{}'::jsonb,
  image_path text,
  is_active boolean not null default true
);

-- ------------------------------------------------------------------
-- owned_cards
-- ------------------------------------------------------------------
create table if not exists public.owned_cards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  card_id text not null references public.cards (id),
  level int not null default 1,
  shards int not null default 0,
  cosmetic_frame_id text,
  unlocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, card_id)
);
create index if not exists idx_owned_cards_profile on public.owned_cards (profile_id);

-- ------------------------------------------------------------------
-- active_decks
-- ------------------------------------------------------------------
create table if not exists public.active_decks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'Main Deck',
  card_ids text[] not null default '{}',
  is_selected boolean not null default true,
  updated_at timestamptz not null default now()
);
create index if not exists idx_decks_profile on public.active_decks (profile_id);

-- ------------------------------------------------------------------
-- bosses (public content)
-- ------------------------------------------------------------------
create table if not exists public.bosses (
  id text primary key,
  name text not null,
  slug text not null,
  difficulty int,
  max_hp int not null,
  mode_availability text[] not null default '{}',
  unlock_requirement jsonb not null default '{}'::jsonb,
  ai_pattern jsonb not null default '{}'::jsonb,
  rewards_config jsonb not null default '{}'::jsonb,
  image_path text,
  is_active boolean not null default true
);

-- ------------------------------------------------------------------
-- mode_entries
-- ------------------------------------------------------------------
create table if not exists public.mode_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null,
  entry_type text not null,
  cost_currency text,
  cost_amount numeric not null default 0,
  status text not null default 'granted',
  created_at timestamptz not null default now()
);
create index if not exists idx_mode_entries_profile on public.mode_entries (profile_id, created_at);

-- ------------------------------------------------------------------
-- battles
-- ------------------------------------------------------------------
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null,
  boss_id text,
  deck_snapshot jsonb not null default '[]'::jsonb,
  battle_seed text,
  action_log jsonb not null default '[]'::jsonb,
  result text not null,
  score int not null default 0,
  turns int not null default 0,
  damage_dealt int not null default 0,
  remaining_hp int not null default 0,
  combos_triggered text[] not null default '{}',
  validation_status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists idx_battles_profile on public.battles (profile_id, created_at);

-- ------------------------------------------------------------------
-- reward_ledger
-- ------------------------------------------------------------------
create table if not exists public.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  battle_id uuid references public.battles (id) on delete set null,
  reward_type text not null,
  currency text not null,
  amount numeric not null default 0,
  status text not null default 'pending',
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  claimed_at timestamptz
);
create index if not exists idx_reward_ledger_profile on public.reward_ledger (profile_id, status);

-- ------------------------------------------------------------------
-- token_claims
-- ------------------------------------------------------------------
create table if not exists public.token_claims (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  wallet_address text not null,
  amount numeric not null default 0,
  status text not null default 'pending',
  transaction_signature text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_claims_profile on public.token_claims (profile_id, created_at);

-- ------------------------------------------------------------------
-- purchases
-- ------------------------------------------------------------------
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  wallet_address text not null,
  package_id text not null,
  memearena_amount numeric not null default 0,
  gems_amount int not null default 0,
  transaction_signature text unique,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- leaderboard_entries
-- ------------------------------------------------------------------
create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null,
  period text not null,
  score int not null default 0,
  rank int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_leaderboard_mode_period on public.leaderboard_entries (mode, period, score desc);

-- ------------------------------------------------------------------
-- cosmetic_frames (public content)
-- ------------------------------------------------------------------
create table if not exists public.cosmetic_frames (
  id text primary key,
  name text not null,
  rarity text not null,
  cost_gems int not null default 0,
  style_config jsonb not null default '{}'::jsonb,
  unlock_requirement jsonb
);

-- ------------------------------------------------------------------
-- player_cosmetics
-- ------------------------------------------------------------------
create table if not exists public.player_cosmetics (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  cosmetic_frame_id text not null references public.cosmetic_frames (id),
  unlocked_at timestamptz not null default now(),
  unique (profile_id, cosmetic_frame_id)
);

-- ------------------------------------------------------------------
-- daily_limits
-- ------------------------------------------------------------------
create table if not exists public.daily_limits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  date date not null default current_date,
  boss_rush_rewards numeric not null default 0,
  daily_boss_rewards numeric not null default 0,
  survival_rewards numeric not null default 0,
  event_rewards numeric not null default 0,
  total_rewards numeric not null default 0,
  free_daily_boss_used boolean not null default false,
  free_survival_runs_used int not null default 0,
  unique (profile_id, date)
);

-- ------------------------------------------------------------------
-- updated_at trigger helper
-- ------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_owned_cards_updated on public.owned_cards;
create trigger trg_owned_cards_updated before update on public.owned_cards
  for each row execute function public.set_updated_at();
