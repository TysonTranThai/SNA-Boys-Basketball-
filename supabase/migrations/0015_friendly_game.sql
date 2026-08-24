-- ============================================================================
-- SNA — mark games as friendly (exhibition) matches
--   Lets the captain tag a game as a friendly so it can live in the schedule
--   and results without counting toward the official win/loss record. Defaults
--   to false (competitive). Safe to re-run.
-- ============================================================================

alter table public.games add column if not exists is_friendly boolean not null default false;
