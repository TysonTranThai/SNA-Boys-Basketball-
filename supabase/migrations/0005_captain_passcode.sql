-- ============================================================================
-- SNA — captain passcode (with lockout)
--   1. Adds teams.captain_code — the secret that unlocks the captain's spot.
--   2. captain_attempts — tracks failed codes per team + device/browser.
--      3 wrong codes → 30-minute timeout for that device. Enforced inside
--      promote_to_captain, so it cannot be bypassed from the client.
--   3. promote_to_captain(p_code, p_device_id) — SECURITY DEFINER: anyone
--      already on the team who enters the correct code gets linked to the
--      captain's spot and becomes captain (their old empty player profile is
--      removed, exactly like claiming a roster name).
--   4. Sets a starter code for the SNA team — change it in Settings.
-- Safe to re-run.
-- ============================================================================

alter table public.teams
  add column if not exists captain_code text;

-- Failed-attempt ledger, keyed by (team, device). No client has direct access;
-- only promote_to_captain (SECURITY DEFINER) reads and writes it.
create table if not exists public.captain_attempts (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  device_id    text not null,
  attempts     integer not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now(),
  unique (team_id, device_id)
);

revoke all on public.captain_attempts from anon, authenticated;

-- NOTE: wrong codes are NOT raised as exceptions. In Postgres, a raised
-- exception rolls back the whole transaction — including the attempt counter
-- — so the lockout would never persist. Instead the function RETURNS a status
-- string and only raises for genuine error conditions:
--   OK:<team-id>      correct code, caller is now the captain
--   INVALID:<left>    wrong code, <left> tries remaining before lockout
--   LOCKED:<minutes>  device is in its 30-minute timeout
create or replace function public.promote_to_captain(p_code text, p_device_id text default null)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_team       uuid;
  v_spot       public.profiles%rowtype;
  v_attempts   integer;
  v_locked     timestamptz;
  v_remaining  integer;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select team_id into v_team from public.profiles where auth_user_id = v_uid;
  if v_team is null then
    raise exception 'NOT_IN_TEAM';
  end if;

  -- Lockout gate: a device still in its 30-minute timeout is refused.
  if p_device_id is not null then
    select attempts, locked_until into v_attempts, v_locked
      from public.captain_attempts
     where team_id = v_team and device_id = p_device_id;

    if v_locked is not null and v_locked > now() then
      v_remaining := greatest(1, ceil(extract(epoch from (v_locked - now())) / 60))::int;
      return 'LOCKED:' || v_remaining;
    end if;
  end if;

  if p_code is null or p_code <> coalesce((select captain_code from public.teams where id = v_team), '') then
    -- Wrong code. Count it for this device; the 3rd failure locks it out.
    if p_device_id is not null then
      insert into public.captain_attempts (team_id, device_id, attempts)
      values (v_team, p_device_id, 1)
      on conflict (team_id, device_id)
      do update set attempts = public.captain_attempts.attempts + 1,
                    updated_at = now();

      select attempts into v_attempts
        from public.captain_attempts
       where team_id = v_team and device_id = p_device_id;

      if v_attempts >= 3 then
        update public.captain_attempts
           set locked_until = now() + interval '30 minutes',
               attempts = 0,
               updated_at = now()
         where team_id = v_team and device_id = p_device_id;
        return 'LOCKED:30';
      end if;

      return 'INVALID:' || (3 - v_attempts);
    end if;

    return 'INVALID';
  end if;

  -- Correct code: clear the ledger, then link the caller to the captain spot.
  if p_device_id is not null then
    delete from public.captain_attempts where team_id = v_team and device_id = p_device_id;
  end if;

  select * into v_spot from public.profiles
   where team_id = v_team and role = 'captain'
   order by created_at asc
   limit 1;
  if not found then
    raise exception 'NO_CAPTAIN_SPOT';
  end if;

  if v_spot.auth_user_id is distinct from v_uid then
    -- Remove the caller's old (empty) profile, then link them to the captain spot.
    delete from public.profiles where auth_user_id = v_uid and id <> v_spot.id;
    update public.profiles set auth_user_id = v_uid where id = v_spot.id;
  end if;

  return 'OK:' || v_team;
end;
$$;

-- Starter code for the SNA team (change it anytime in Settings → Captain code)
update public.teams
   set captain_code = '120505'
 where id = '00000000-0000-4000-8000-000000000001'
   and captain_code is null;
