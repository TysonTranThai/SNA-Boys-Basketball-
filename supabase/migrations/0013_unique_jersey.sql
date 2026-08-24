-- ============================================================================
-- SNA — enforce unique jersey numbers within a team
--   Two players in the same team can't wear the same number. Players without
--   a number (jersey_number IS NULL) are ignored, so any number of unnamed
--   spots may stay empty — this only guards real numbers.
--   Safe to re-run. (Index is on (team_id, jersey_number): different teams may
--   still use the same numbers.)
-- ============================================================================

create unique index if not exists profiles_team_jersey_unique
  on public.profiles (team_id, jersey_number)
  where jersey_number is not null;
