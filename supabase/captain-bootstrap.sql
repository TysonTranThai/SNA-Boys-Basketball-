-- ============================================================================
-- CREATE YOUR SNA TEAM  ·  run this once in the Supabase SQL Editor
--
-- The app has no sign-up or "create team" screen. Captains create their team
-- right here in SQL, then manage everything from the app with a private
-- captain code — no email or password anywhere.
--
-- The team is created as "SNA Boys" (basketball) in SNA red & gold with the
-- invite code SNABOYS2627 and captain code 120505. Edit any of these before
-- running if you like.
--
-- HOW TO USE
--   1. Open Supabase → SQL Editor → + New query, paste this, and press Run.
--   2. Share the INVITE CODE with your players — they enter it in the app and
--      tap their name on "Who are you?" to claim their spot.
--   3. To manage the team, tap "Tyson Tran · CAPTAIN" on that same screen and
--      enter the CAPTAIN CODE. Change it anytime in Settings → Captain code.
--
-- Safe to re-run? No — it raises a "duplicate key" error on the invite code
-- if a team already uses it. Pick a different code in that case.
-- ============================================================================

do $$
declare
  v_team uuid;
begin
  insert into public.teams (name, sport, season, school, primary_color, secondary_color, accent_color, invite_code, captain_code)
  values ('SNA Boys', 'Basketball', '2026–2027', 'SNA Marianapolis International School', '#C8102E', '#F2A900', '#D4AF37', 'SNABOYS2627', '120505')
  returning id into v_team;

  -- The captain's spot — unlock it in the app by tapping this name and
  -- entering the captain code. No auth account needed.
  insert into public.profiles (team_id, role, full_name, position, grade, is_active)
  values (v_team, 'captain', 'Tyson Tran', 'Captain', '12', true);

  raise notice 'SNA team created — invite code: SNABOYS2627 · captain code: 120505';
end $$;

-- Shows your brand-new team once the script above succeeds.
select name, sport, season, school, invite_code
from public.teams
order by created_at desc
limit 1;
