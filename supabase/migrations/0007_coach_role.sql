-- ============================================================================
-- SNA — add the 'coach' role
--   Profiles now support three roles: captain, player (member), coach.
--   Coaches get member-level access (read-only team views) — they are NOT
--   captains and never see Captain Admin.
-- Safe to re-run.
-- ============================================================================

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('captain', 'player', 'coach'));

-- Captain changes a roster entry's role (role is never client-writable).
create or replace function public.set_player_role(p_player_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if coalesce(public.get_user_role(), '') <> 'captain' then
    raise exception 'FORBIDDEN';
  end if;
  if p_role not in ('captain', 'player', 'coach') then
    raise exception 'INVALID_ROLE';
  end if;
  if (select team_id from public.profiles where id = p_player_id) <> public.get_user_team_id() then
    raise exception 'FORBIDDEN';
  end if;
  update public.profiles set role = p_role where id = p_player_id;
end;
$$;
