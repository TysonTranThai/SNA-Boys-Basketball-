-- ============================================================================
-- SNA — game eligibility (which players are allowed to play a game)
--   game_players links games to the roster entries the captain picked when
--   creating the game. Captains manage the list; team members can read it.
--   Deleting a game or a player removes their eligibility rows automatically.
-- Safe to re-run.
-- ============================================================================

create table if not exists public.game_players (
  game_id    uuid not null references public.games(id) on delete cascade,
  player_id  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (game_id, player_id)
);

create index if not exists game_players_player_idx on public.game_players(player_id);

alter table public.game_players enable row level security;

drop policy if exists "game_players_select_members" on public.game_players;
create policy "game_players_select_members" on public.game_players
  for select using (
    exists (
      select 1 from public.games g
       where g.id = game_id
         and g.team_id = public.get_user_team_id()
    )
  );

drop policy if exists "game_players_insert_captain" on public.game_players;
create policy "game_players_insert_captain" on public.game_players
  for insert with check (
    public.get_user_role() = 'captain'
    and exists (
      select 1 from public.games g
       where g.id = game_id
         and g.team_id = public.get_user_team_id()
    )
  );

drop policy if exists "game_players_delete_captain" on public.game_players;
create policy "game_players_delete_captain" on public.game_players
  for delete using (
    public.get_user_role() = 'captain'
    and exists (
      select 1 from public.games g
       where g.id = game_id
         and g.team_id = public.get_user_team_id()
    )
  );

revoke all on public.game_players from anon;
grant select, insert, delete on public.game_players to authenticated;
