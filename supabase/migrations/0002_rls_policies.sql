-- MemeArena — Row Level Security
--
-- Principles:
--   * Users read/update only their own rows where safe.
--   * Users may NOT mutate currency balances (coins/gems/xp/tickets) or insert
--     approved token rewards directly. Those happen via Edge Functions using the
--     service role (which bypasses RLS).
--   * Public content (cards, bosses, cosmetics) and leaderboard display are
--     world-readable.

-- Enable RLS on user-owned tables.
alter table public.profiles            enable row level security;
alter table public.owned_cards         enable row level security;
alter table public.active_decks        enable row level security;
alter table public.mode_entries        enable row level security;
alter table public.battles             enable row level security;
alter table public.reward_ledger       enable row level security;
alter table public.token_claims        enable row level security;
alter table public.purchases           enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.player_cosmetics    enable row level security;
alter table public.daily_limits        enable row level security;
alter table public.wallet_auth_nonces  enable row level security;

-- Public read-only content tables: RLS enabled, public select policy.
alter table public.cards           enable row level security;
alter table public.bosses          enable row level security;
alter table public.cosmetic_frames enable row level security;

create policy "cards_public_read"    on public.cards           for select using (true);
create policy "bosses_public_read"   on public.bosses          for select using (true);
create policy "cosmetics_public_read" on public.cosmetic_frames for select using (true);

-- ------------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Anyone can see basic profile fields for leaderboard display. Restrict columns
-- in the view layer; here we allow row visibility for usernames/levels only via
-- a dedicated public view (see leaderboard_public below).
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

-- Users may update their own profile, but NOT economy columns. We guard the
-- sensitive columns by only permitting updates that leave them unchanged.
create policy "profiles_update_safe" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and coins = (select coins from public.profiles p where p.id = auth.uid())
    and gems = (select gems from public.profiles p where p.id = auth.uid())
    and xp = (select xp from public.profiles p where p.id = auth.uid())
    and arena_tickets = (select arena_tickets from public.profiles p where p.id = auth.uid())
    and shards = (select shards from public.profiles p where p.id = auth.uid())
    and player_level = (select player_level from public.profiles p where p.id = auth.uid())
  );

-- ------------------------------------------------------------------
-- owned_cards: read own; no client writes to level/shards (Edge Function only).
-- ------------------------------------------------------------------
create policy "owned_cards_select_own" on public.owned_cards
  for select using (auth.uid() = profile_id);

-- ------------------------------------------------------------------
-- active_decks: full CRUD on own decks (deck composition is not sensitive).
-- ------------------------------------------------------------------
create policy "decks_select_own" on public.active_decks
  for select using (auth.uid() = profile_id);
create policy "decks_insert_own" on public.active_decks
  for insert with check (auth.uid() = profile_id);
create policy "decks_update_own" on public.active_decks
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);
create policy "decks_delete_own" on public.active_decks
  for delete using (auth.uid() = profile_id);

-- ------------------------------------------------------------------
-- mode_entries / battles / reward_ledger / token_claims / purchases:
-- read own only. Inserts/approvals happen via Edge Functions (service role).
-- ------------------------------------------------------------------
create policy "mode_entries_select_own" on public.mode_entries
  for select using (auth.uid() = profile_id);

create policy "battles_select_own" on public.battles
  for select using (auth.uid() = profile_id);

create policy "reward_ledger_select_own" on public.reward_ledger
  for select using (auth.uid() = profile_id);

create policy "token_claims_select_own" on public.token_claims
  for select using (auth.uid() = profile_id);

create policy "purchases_select_own" on public.purchases
  for select using (auth.uid() = profile_id);

create policy "daily_limits_select_own" on public.daily_limits
  for select using (auth.uid() = profile_id);

create policy "player_cosmetics_select_own" on public.player_cosmetics
  for select using (auth.uid() = profile_id);

-- ------------------------------------------------------------------
-- leaderboard_entries: public read for display, own-row insert disabled
-- (Edge Function writes ranked entries).
-- ------------------------------------------------------------------
create policy "leaderboard_public_read" on public.leaderboard_entries
  for select using (true);

-- ------------------------------------------------------------------
-- wallet_auth_nonces: no client access. Only the service role (Edge Functions)
-- touches this table. RLS is enabled with NO permissive policy → denied.
-- ------------------------------------------------------------------

-- NOTE: The service role used by Edge Functions bypasses RLS entirely, so all
-- reward approval, claim processing, purchase verification, currency mutation,
-- and leaderboard ranking is performed there.
