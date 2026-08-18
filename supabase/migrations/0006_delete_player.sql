-- ============================================================================
-- SNA — permanently delete a player
--   Soft removal (deactivate) is the default and keeps attendance history.
--   delete_player() is the hard delete: it removes the roster entry AND their
--   attendance records (attendance.player_id is ON DELETE CASCADE). Only the
--   captain of the same team can call it, and the captain spot itself can
--   never be deleted (there must always be a captain).
-- Safe to re-run.
-- ============================================================================

create or replace function public.delete_player(p_player_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
begin
  if public.get_user_role() <> 'captain' then
    raise exception 'FORBIDDEN';
  end if;

  if (select team_id from public.profiles where id = p_player_id) <> public.get_user_team_id() then
    raise exception 'FORBIDDEN';
  end if;

  -- The captain spot can't be deleted (and a captain can't delete themselves).
  select role into v_role from public.profiles where id = p_player_id;
  if v_role = 'captain' then
    raise exception 'FORBIDDEN';
  end if;

  -- Detach content this profile authored/created so the delete can't trip the
  -- foreign keys (RESTRICT by default). Announcements, events, games and
  -- attendance markers keep their rows and fall back to the "Captain" label
  -- in the UI when the author is gone.
  update public.announcements set author_id = null where author_id = p_player_id;
  update public.events        set created_by = null where created_by = p_player_id;
  update public.media         set created_by = null where created_by = p_player_id;
  update public.attendance    set marked_by  = null where marked_by  = p_player_id;

  -- attendance.player_id is ON DELETE CASCADE, so their records go with them.
  delete from public.profiles where id = p_player_id;
end;
$$;
