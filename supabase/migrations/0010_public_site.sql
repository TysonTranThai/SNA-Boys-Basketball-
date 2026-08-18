-- ============================================================================
-- SNA — public website layer
--   * teams.public_visible  → marks the team shown on the public SNA website
--   * anon-safe RLS        → anonymous visitors can READ games, events and
--                            media for the public team ONLY (never other
--                            teams, never attendance, never notifications)
--   * public_roster view   → public player info only (no email/phone)
--   * player_stats         → flexible per-player, per-game statistics
--                            (stat_name + stat_value) so other sports work
--                            without schema changes. Captain-only writes.
-- Safe to re-run.
-- ============================================================================

-- 1. public team flag + privacy toggles --------------------------------------
alter table public.teams add column if not exists public_visible boolean not null default false;
alter table public.teams add column if not exists public_show_stats boolean not null default true;
alter table public.teams add column if not exists public_show_attendance boolean not null default true;
alter table public.teams add column if not exists public_show_names boolean not null default true;
alter table public.teams add column if not exists public_show_jersey boolean not null default true;

-- The SNA Basketball team (seeded / bootstrap) becomes the public team.
update public.teams
   set public_visible = true
 where id = '00000000-0000-4000-8000-000000000001'
   and public_visible = false;

-- Helper: the one team exposed on the public website (or null).
create or replace function public.public_team_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.teams where public_visible order by created_at asc limit 1
$$;

-- 1b. Privacy flags helper (SECURITY DEFINER so policies/views can read the
-- team's public settings without tripping teams' own RLS for anonymous
-- visitors).
create or replace function public.public_team_flag(flag text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select case flag
    when 'show_stats'      then t.public_show_stats
    when 'show_attendance' then t.public_show_attendance
    when 'show_names'      then t.public_show_names
    when 'show_jersey'     then t.public_show_jersey
    else false
  end
  from public.teams t
  where t.id = public.public_team_id()
$$;

-- 2. Public RLS — anon may only read public-team rows ------------------------
-- (Additional SELECT policies OR with the existing member policies; anon has
--  no team, so the member policies simply don't match for visitors.)

drop policy if exists "games_select_public" on public.games;
create policy "games_select_public" on public.games
  for select using (team_id = public.public_team_id());

drop policy if exists "events_select_public" on public.events;
create policy "events_select_public" on public.events
  for select using (team_id = public.public_team_id());

drop policy if exists "media_select_public" on public.media;
create policy "media_select_public" on public.media
  for select using (team_id = public.public_team_id());

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public" on public.profiles
  for select using (team_id = public.public_team_id());

grant select on public.games, public.events, public.media to anon;

-- 3. Public roster view — public fields only, never email/phone/account info --
-- Honors the team's privacy toggles: names/jersey numbers vanish when the
-- captain switches them off (frontend shows generic fallbacks).
create or replace view public.public_roster as
select
  p.id,
  p.team_id,
  p.role,
  case when public.public_team_flag('show_names') then p.full_name else null end as full_name,
  case when public.public_team_flag('show_jersey') then p.jersey_number else null end as jersey_number,
  p.position,
  p.grade,
  p.photo_url,
  p.is_active
from public.profiles p
where p.team_id = public.public_team_id()
  and p.is_active;

grant select on public.public_roster to anon, authenticated;

-- 3b. Public attendance summary — team rate + per-player rates, no records -----
-- Empty when the captain disables the public attendance leaderboard.
create or replace view public.public_attendance_summary as
select
  p.id as player_id,
  p.full_name,
  p.photo_url,
  count(a.id)                                                                  as marked,
  count(*) filter (where a.status in ('present', 'late'))                      as present_or_late,
  count(*) filter (where a.status = 'late')                                    as late,
  round(100.0 * count(*) filter (where a.status in ('present', 'late')) / nullif(count(a.id), 0)) as rate
from public.profiles p
left join public.attendance a
       on a.player_id = p.id
      and a.team_id = p.team_id
where p.team_id = public.public_team_id()
  and p.is_active
  and p.role <> 'captain'
  and public.public_team_flag('show_attendance')
group by p.id, p.full_name, p.photo_url;

grant select on public.public_attendance_summary to anon, authenticated;

-- 4. Player statistics (flexible — works for any sport) ----------------------
create table if not exists public.player_stats (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  player_id  uuid not null references public.profiles(id) on delete cascade,
  game_id    uuid references public.games(id) on delete set null,
  stat_name  text not null,
  stat_value numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, game_id, stat_name)
);

create index if not exists player_stats_team_idx on public.player_stats(team_id);
create index if not exists player_stats_player_idx on public.player_stats(player_id);

alter table public.player_stats enable row level security;

drop policy if exists "player_stats_select_public" on public.player_stats;
create policy "player_stats_select_public" on public.player_stats
  for select using (
    (team_id = public.public_team_id() and public.public_team_flag('show_stats'))
    or team_id = public.get_user_team_id()
  );

-- Captain writes stats (roles are never client-writable; stats are).
drop policy if exists "player_stats_insert_captain" on public.player_stats;
create policy "player_stats_insert_captain" on public.player_stats
  for insert with check (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  );

drop policy if exists "player_stats_update_captain" on public.player_stats;
create policy "player_stats_update_captain" on public.player_stats
  for update using (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  )
  with check (team_id = public.get_user_team_id());

drop policy if exists "player_stats_delete_captain" on public.player_stats;
create policy "player_stats_delete_captain" on public.player_stats
  for delete using (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  );

drop trigger if exists player_stats_updated_at on public.player_stats;
create trigger player_stats_updated_at before update on public.player_stats
  for each row execute function public.set_updated_at();

grant select on public.player_stats to anon, authenticated;
grant insert, update, delete on public.player_stats to authenticated;
