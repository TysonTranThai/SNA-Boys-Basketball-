-- ============================================================================
-- SNA — code-first player entry: claim a roster identity
-- Run AFTER 0001_init.sql (and optionally 0002_seed.sql). Safe to re-run.
--
-- Flow: player enters the team code → app signs in anonymously → joins the
-- team → player taps their name on the roster → claim_roster_identity links
-- that roster entry to their account. The roster entry keeps its id, so its
-- attendance history stays intact.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Claim a roster identity (SECURITY DEFINER — the DB decides who can claim)
-- ---------------------------------------------------------------------------
create or replace function public.claim_roster_identity(p_profile_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_team   uuid;
  v_target public.profiles%rowtype;
  v_mine   public.profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  v_team := public.get_user_team_id();
  if v_team is null then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_target from public.profiles where id = p_profile_id;
  if not found then
    raise exception 'PLAYER_NOT_FOUND';
  end if;
  if v_target.team_id <> v_team then
    raise exception 'FORBIDDEN';
  end if;
  if not v_target.is_active then
    raise exception 'PLAYER_INACTIVE';
  end if;

  -- Already linked to this account → idempotent success
  if v_target.auth_user_id = v_uid then
    return v_team;
  end if;

  -- Someone else already claimed this roster spot
  if v_target.auth_user_id is not null then
    raise exception 'IDENTITY_TAKEN';
  end if;

  -- Drop the caller's auto-created placeholder profile (anonymous account),
  -- then link the roster entry to the caller.
  select * into v_mine from public.profiles where auth_user_id = v_uid;
  if found and v_mine.id <> v_target.id then
    delete from public.profiles where id = v_mine.id;
  end if;

  update public.profiles set auth_user_id = v_uid where id = v_target.id;
  return v_team;
end;
$$;
