-- ============================================================================
-- SNA — add the "Friendly Game" event type
--   Lets the captain schedule non-competitive matches (friendly games) as
--   first-class events alongside practices, tournaments and team events.
--   Safe to re-run.
-- ============================================================================

alter table public.events drop constraint if exists events_type_check;
alter table public.events
  add constraint events_type_check
  check (type in ('practice', 'tournament', 'friendly', 'team_event', 'other'));
