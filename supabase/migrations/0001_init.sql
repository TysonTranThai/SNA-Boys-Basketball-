-- ============================================================================
-- SNA — database schema, Row Level Security, functions & triggers
-- Run this entire file in the Supabase SQL Editor (or `supabase db push`).
-- It is idempotent: safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. TEAMS
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  sport           text not null default 'Basketball',
  season          text,
  school          text,
  logo_url        text,
  primary_color   text not null default '#2563eb',
  secondary_color text not null default '#0f172a',
  accent_color    text,
  invite_code     text not null unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. PROFILES (the roster)
-- ---------------------------------------------------------------------------
-- auth_user_id is NULL for roster entries the captain added before the player
-- created an account. It is set by the on_auth_user_created trigger or by
-- join_team_with_code(). It is NOT updatable by any client.
create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users(id) on delete cascade,
  team_id       uuid references public.teams(id) on delete cascade,
  role          text not null default 'player'
                check (role in ('captain', 'player')),
  full_name     text not null default '',
  email         text,
  jersey_number integer check (jersey_number is null or jersey_number between 0 and 999),
  position      text,
  grade         text,
  height_cm     numeric(5,1),
  photo_url     text,
  phone         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_team_idx on public.profiles(team_id);
create index if not exists profiles_auth_user_idx on public.profiles(auth_user_id);

alter table public.profiles enable row level security;

-- Helpers used by RLS policies below. They must be defined AFTER the tables
-- they reference (SQL-language functions are analyzed at creation time).
create or replace function public.get_user_team_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select team_id from public.profiles where auth_user_id = auth.uid()
$$;

create or replace function public.get_user_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where auth_user_id = auth.uid()
$$;

-- Auto-create a profile for every new auth user.
-- Anonymous users (code-first entry) get an empty name: the app treats
-- "in a team + empty name" as "pick your roster identity" and offers the
-- claim step via claim_roster_identity().
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, email, full_name)
  values (
    new.id,
    new.email,
    case
      when coalesce(new.raw_app_meta_data ->> 'provider', '') = 'anon' then ''
      else coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1))
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Column-level control on profiles: clients may never write role, team_id,
-- auth_user_id or is_active directly. Role/team/is_active are only changed
-- through SECURITY DEFINER functions that enforce captain privileges.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert (team_id, full_name, email, jersey_number, position, grade, height_cm, photo_url, phone)
  on public.profiles to authenticated;
grant update (full_name, email, jersey_number, position, grade, height_cm, photo_url, phone)
  on public.profiles to authenticated;

-- Roster visible to team members; users can always see their own row
drop policy if exists "profiles_select_members" on public.profiles;
create policy "profiles_select_members" on public.profiles
  for select using (
    auth_user_id = auth.uid() or team_id = public.get_user_team_id()
  );

-- Captain adds players to the roster (no auth account yet)
drop policy if exists "profiles_insert_captain" on public.profiles;
create policy "profiles_insert_captain" on public.profiles
  for insert with check (
    public.get_user_role() = 'captain'
    and team_id = public.get_user_team_id()
  );

-- Players may update only their own row; WITH CHECK keeps their team AND
-- role fixed (defense-in-depth on top of the column-level grants).
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth_user_id = auth.uid())
  with check (
    auth_user_id = auth.uid()
    and team_id = public.get_user_team_id()
    and role = public.get_user_role()
  );

-- Captain may update any roster entry in their team
drop policy if exists "profiles_update_captain" on public.profiles;
create policy "profiles_update_captain" on public.profiles
  for update using (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  )  with check (team_id = public.get_user_team_id());

-- ---------------------------------------------------------------------------
-- 1b. TEAMS RLS (after the helper functions exist)
-- ---------------------------------------------------------------------------
alter table public.teams enable row level security;

-- Team visible only to its members
drop policy if exists "teams_select_members" on public.teams;
create policy "teams_select_members" on public.teams
  for select using (id = public.get_user_team_id());

-- Only the captain can edit/delete their team (identity, colors, invite code)
drop policy if exists "teams_update_captain" on public.teams;
create policy "teams_update_captain" on public.teams
  for update using (
    public.get_user_role() = 'captain' and id = public.get_user_team_id()
  )
  with check (
    public.get_user_role() = 'captain' and id = public.get_user_team_id()
  );

drop policy if exists "teams_delete_captain" on public.teams;
create policy "teams_delete_captain" on public.teams
  for delete using (
    public.get_user_role() = 'captain' and id = public.get_user_team_id()
  );


-- ---------------------------------------------------------------------------
-- 3. EVENTS (practices, tournaments, team events)
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  title       text not null,
  type        text not null default 'practice'
              check (type in ('practice', 'tournament', 'team_event', 'other')),
  date        date not null,
  start_time  time,
  end_time    time,
  location    text,
  description text,
  notes       text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists events_team_date_idx on public.events(team_id, date);

alter table public.events enable row level security;

drop policy if exists "events_select_members" on public.events;
create policy "events_select_members" on public.events
  for select using (team_id = public.get_user_team_id());

drop policy if exists "events_insert_captain" on public.events;
create policy "events_insert_captain" on public.events
  for insert with check (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  );

drop policy if exists "events_update_captain" on public.events;
create policy "events_update_captain" on public.events
  for update using (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  )
  with check (team_id = public.get_user_team_id());

drop policy if exists "events_delete_captain" on public.events;
create policy "events_delete_captain" on public.events
  for delete using (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  );

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. ATTENDANCE
-- ---------------------------------------------------------------------------
create table if not exists public.attendance (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  event_id   uuid not null references public.events(id) on delete cascade,
  player_id  uuid not null references public.profiles(id) on delete cascade,
  status     text not null check (status in ('present', 'absent', 'late', 'excused')),
  marked_by  uuid references public.profiles(id),
  marked_at  timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, player_id)
);

create index if not exists attendance_team_idx on public.attendance(team_id);
create index if not exists attendance_player_idx on public.attendance(player_id);
create index if not exists attendance_event_idx on public.attendance(event_id);

alter table public.attendance enable row level security;

-- Players can read attendance (needed to show the roster percentages)
drop policy if exists "attendance_select_members" on public.attendance;
create policy "attendance_select_members" on public.attendance
  for select using (team_id = public.get_user_team_id());

-- Only the captain marks or edits attendance
drop policy if exists "attendance_insert_captain" on public.attendance;
create policy "attendance_insert_captain" on public.attendance
  for insert with check (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  );

drop policy if exists "attendance_update_captain" on public.attendance;
create policy "attendance_update_captain" on public.attendance
  for update using (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  )
  with check (team_id = public.get_user_team_id());

drop policy if exists "attendance_delete_captain" on public.attendance;
create policy "attendance_delete_captain" on public.attendance
  for delete using (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  );

drop trigger if exists attendance_updated_at on public.attendance;
create trigger attendance_updated_at before update on public.attendance
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. GAMES
-- ---------------------------------------------------------------------------
create table if not exists public.games (
  id               uuid primary key default gen_random_uuid(),
  team_id          uuid not null references public.teams(id) on delete cascade,
  opponent         text not null,
  date             date not null,
  time             time,
  location         text,
  home_away        text not null default 'home' check (home_away in ('home', 'away', 'neutral')),
  status           text not null default 'upcoming'
                   check (status in ('upcoming', 'completed', 'cancelled', 'postponed')),
  our_score        integer,
  opponent_score   integer,
  result           text check (result in ('win', 'loss', 'tie')),
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists games_team_date_idx on public.games(team_id, date);

alter table public.games enable row level security;

drop policy if exists "games_select_members" on public.games;
create policy "games_select_members" on public.games
  for select using (team_id = public.get_user_team_id());

drop policy if exists "games_insert_captain" on public.games;
create policy "games_insert_captain" on public.games
  for insert with check (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  );

drop policy if exists "games_update_captain" on public.games;
create policy "games_update_captain" on public.games
  for update using (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  )
  with check (team_id = public.get_user_team_id());

drop policy if exists "games_delete_captain" on public.games;
create policy "games_delete_captain" on public.games
  for delete using (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  );

drop trigger if exists games_updated_at on public.games;
create trigger games_updated_at before update on public.games
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. MEDIA (clips, highlights, photos — external URLs only)
-- ---------------------------------------------------------------------------
create table if not exists public.media (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  title         text not null,
  description   text,
  category      text not null default 'highlight'
                check (category in ('game', 'practice', 'highlight', 'photo', 'other')),
  thumbnail_url text,
  video_url     text not null,
  date          date,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists media_team_idx on public.media(team_id);

alter table public.media enable row level security;

drop policy if exists "media_select_members" on public.media;
create policy "media_select_members" on public.media
  for select using (team_id = public.get_user_team_id());

drop policy if exists "media_insert_captain" on public.media;
create policy "media_insert_captain" on public.media
  for insert with check (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  );

drop policy if exists "media_update_captain" on public.media;
create policy "media_update_captain" on public.media
  for update using (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  )
  with check (team_id = public.get_user_team_id());

drop policy if exists "media_delete_captain" on public.media;
create policy "media_delete_captain" on public.media
  for delete using (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  );

drop trigger if exists media_updated_at on public.media;
create trigger media_updated_at before update on public.media
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. ANNOUNCEMENTS
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  title      text not null,
  content    text not null,
  author_id  uuid references public.profiles(id),
  pinned     boolean not null default false,
  image_url  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists announcements_team_idx on public.announcements(team_id);

alter table public.announcements enable row level security;

drop policy if exists "announcements_select_members" on public.announcements;
create policy "announcements_select_members" on public.announcements
  for select using (team_id = public.get_user_team_id());

drop policy if exists "announcements_insert_captain" on public.announcements;
create policy "announcements_insert_captain" on public.announcements
  for insert with check (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  );

drop policy if exists "announcements_update_captain" on public.announcements;
create policy "announcements_update_captain" on public.announcements
  for update using (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  )
  with check (team_id = public.get_user_team_id());

drop policy if exists "announcements_delete_captain" on public.announcements;
create policy "announcements_delete_captain" on public.announcements
  for delete using (
    public.get_user_role() = 'captain' and team_id = public.get_user_team_id()
  );

drop trigger if exists announcements_updated_at on public.announcements;
create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. NOTIFICATIONS
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  type       text not null default 'announcement'
             check (type in ('announcement', 'media', 'game', 'result', 'schedule')),
  title      text not null,
  body       text,
  link       text,
  created_at timestamptz not null default now()
);

create index if not exists notifications_team_idx on public.notifications(team_id);

alter table public.notifications enable row level security;

-- Team members see team notifications (read state lives in notification_reads)
drop policy if exists "notifications_select_members" on public.notifications;
create policy "notifications_select_members" on public.notifications
  for select using (team_id = public.get_user_team_id());

create table if not exists public.notification_reads (
  user_id        uuid not null references auth.users(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  read_at        timestamptz not null default now(),
  primary key (user_id, notification_id)
);

alter table public.notification_reads enable row level security;

drop policy if exists "notification_reads_select_self" on public.notification_reads;
create policy "notification_reads_select_self" on public.notification_reads
  for select using (user_id = auth.uid());

drop policy if exists "notification_reads_insert_self" on public.notification_reads;
create policy "notification_reads_insert_self" on public.notification_reads
  for insert with check (user_id = auth.uid());

drop policy if exists "notification_reads_delete_self" on public.notification_reads;
create policy "notification_reads_delete_self" on public.notification_reads
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 9. INVITE CODES & TEAM SETUP (SECURITY DEFINER RPCs)
-- ---------------------------------------------------------------------------
create or replace function public.generate_invite_code()
returns text
language plpgsql security definer set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I confusion
  code  text := '';
  i     int;
begin
  for i in 1..8 loop
    code := code || substr(chars, 1 + (abs(get_byte(gen_random_bytes(1), 0)) % length(chars)), 1);
  end loop;
  return code;
end;
$$;

-- First-time setup: create the team and make the caller the captain.
create or replace function public.create_team_with_captain(
  p_name            text,
  p_sport           text default 'Basketball',
  p_season          text default null,
  p_school          text default null,
  p_logo_url        text default null,
  p_primary_color   text default '#2563eb',
  p_secondary_color text default '#0f172a'
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_team_id  uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if (select team_id from public.profiles where auth_user_id = v_uid) is not null then
    raise exception 'ALREADY_HAS_TEAM';
  end if;
  insert into public.teams (name, sport, season, school, logo_url, primary_color, secondary_color, invite_code)
  values (p_name, p_sport, p_season, p_school, p_logo_url, p_primary_color, p_secondary_color, public.generate_invite_code())
  returning id into v_team_id;

  update public.profiles
     set team_id = v_team_id, role = 'captain'
   where auth_user_id = v_uid;

  return v_team_id;
end;
$$;

-- Players join a team with the captain's invite code.
create or replace function public.join_team_with_code(p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_team      uuid;
  v_my        public.profiles%rowtype;
  v_existing  public.profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select id into v_team
    from public.teams
   where invite_code = upper(trim(p_code));

  if v_team is null then
    raise exception 'INVITE_INVALID';
  end if;

  select * into v_my from public.profiles where auth_user_id = v_uid;
  if not found then
    raise exception 'PROFILE_MISSING';
  end if;
  if v_my.team_id is not null then
    raise exception 'ALREADY_IN_TEAM';
  end if;

  -- If the captain pre-added this player to the roster by email, link that
  -- roster entry instead of creating a duplicate.
  select * into v_existing
    from public.profiles
   where team_id = v_team
     and auth_user_id is null
     and email is not null
     and lower(email) = lower(v_my.email)
   limit 1;

  if found then
    update public.profiles
       set auth_user_id = v_uid,
           full_name    = coalesce(nullif(v_my.full_name, ''), v_existing.full_name)
     where id = v_existing.id;
    delete from public.profiles where id = v_my.id;
    return v_team;
  end if;

  update public.profiles set team_id = v_team where id = v_my.id;
  return v_team;
end;
$$;

-- Captain regenerates the invite code.
create or replace function public.regenerate_invite_code()
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_code text;
begin
  if public.get_user_role() <> 'captain' then
    raise exception 'FORBIDDEN';
  end if;
  update public.teams
     set invite_code = public.generate_invite_code()
   where id = public.get_user_team_id()
   returning invite_code into v_code;
  return v_code;
end;
$$;

-- Captain promotes/demotes a player (role is never client-writable).
create or replace function public.set_player_role(p_player_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.get_user_role() <> 'captain' then
    raise exception 'FORBIDDEN';
  end if;
  if p_role not in ('captain', 'player') then
    raise exception 'INVALID_ROLE';
  end if;
  if (select team_id from public.profiles where id = p_player_id) <> public.get_user_team_id() then
    raise exception 'FORBIDDEN';
  end if;
  update public.profiles set role = p_role where id = p_player_id;
end;
$$;

-- Captain activates/deactivates a roster entry ("remove player" keeps history).
create or replace function public.set_player_active(p_player_id uuid, p_active boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.get_user_role() <> 'captain' then
    raise exception 'FORBIDDEN';
  end if;
  if (select team_id from public.profiles where id = p_player_id) <> public.get_user_team_id() then
    raise exception 'FORBIDDEN';
  end if;
  update public.profiles set is_active = p_active where id = p_player_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. NOTIFICATION TRIGGERS
-- ---------------------------------------------------------------------------
create or replace function public.notify_team(p_team uuid, p_type text, p_title text, p_body text, p_link text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications (team_id, type, title, body, link)
  values (p_team, p_type, p_title, p_body, p_link);
end;
$$;

create or replace function public.on_announcement_created()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform public.notify_team(new.team_id, 'announcement', new.title, left(new.content, 120), '/announcements');
  return new;
end;
$$;

create or replace function public.on_media_created()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform public.notify_team(new.team_id, 'media', new.title, 'New ' || new.category || ' added to Media.', '/media');
  return new;
end;
$$;

create or replace function public.on_game_inserted()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform public.notify_team(new.team_id, 'game', 'New game added', 'VS ' || new.opponent || ' — ' || to_char(new.date, 'Mon DD'), '/games');
  return new;
end;
$$;

create or replace function public.on_game_result()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    perform public.notify_team(new.team_id, 'result',
      'Game final: ' || case when new.result = 'win' then 'WIN 🏆' else upper(coalesce(new.result, 'tie')) end,
      'VS ' || new.opponent || ' — ' || coalesce(new.our_score::text, '?') || '–' || coalesce(new.opponent_score::text, '?'),
      '/games');
  end if;
  return new;
end;
$$;

create or replace function public.on_event_changed()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_team(new.team_id, 'schedule', new.title || ' added',
      initcap(new.type) || ' on ' || to_char(new.date, 'EEE, MMM d') || coalesce(' at ' || new.start_time::text, ''), '/schedule');
  elsif tg_op = 'UPDATE'
        and (new.title is distinct from old.title
             or new.date is distinct from old.date
             or new.start_time is distinct from old.start_time
             or new.location is distinct from old.location) then
    perform public.notify_team(new.team_id, 'schedule', new.title || ' updated',
      to_char(new.date, 'EEE, MMM d') || coalesce(' at ' || new.start_time::text, '') || coalesce(' — ' || new.location, ''), '/schedule');
  end if;
  return new;
end;
$$;

drop trigger if exists announcements_notify on public.announcements;
create trigger announcements_notify
  after insert on public.announcements
  for each row execute function public.on_announcement_created();

drop trigger if exists media_notify on public.media;
create trigger media_notify
  after insert on public.media
  for each row execute function public.on_media_created();

drop trigger if exists games_notify_insert on public.games;
create trigger games_notify_insert
  after insert on public.games
  for each row execute function public.on_game_inserted();

drop trigger if exists games_notify_result on public.games;
create trigger games_notify_result
  after update on public.games
  for each row execute function public.on_game_result();

drop trigger if exists events_notify on public.events;
create trigger events_notify
  after insert or update on public.events
  for each row execute function public.on_event_changed();

-- ---------------------------------------------------------------------------
-- 11. SANITY CHECK: grants to anon should be read-only / empty
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.teams, public.events, public.attendance,
  public.games, public.media, public.announcements, public.notifications,
  public.notification_reads from anon;
