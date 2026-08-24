-- ============================================================================
-- SNA — allow anonymous visitors to read the public team row
-- Migration 0010 granted anon SELECT on games/events/media/profiles but
-- forgot the teams table itself. The public site resolves the team via
-- `select * from teams where public_visible = true` (fetchPublicTeam) as an
-- anonymous user — without a policy here RLS returns zero rows, the site
-- finds no team, and it never loads the roster (shows "No roster yet").
-- Safe to re-run.
-- ============================================================================

drop policy if exists "teams_select_public" on public.teams;
create policy "teams_select_public" on public.teams
  for select using (id = public.public_team_id());

grant select on public.teams to anon;
