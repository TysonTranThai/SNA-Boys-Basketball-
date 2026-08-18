-- ============================================================================
-- SNA — lateness penalties
--   Attendance now records how late a player was (minutes_late) and supports a
--   'sent_home' status (20+ minutes late → "go home"). Late marks are derived
--   from minutes_late so totals always stay consistent with attendance:
--     5  min → 0 marks (3 laps)
--     10 min → 1 mark  (5 laps + 1 mark)
--     15 min → 3 marks (5 laps + 3 marks)
--     20+ min → 5 marks (go home)
--   Accumulated marks → consequences:
--     4  → bench one quarter · 6 → bench half · 10 → no friendlies/school games
--     15 → no tournaments
-- Safe to re-run.
-- ============================================================================

alter table public.attendance add column if not exists minutes_late integer
  check (minutes_late is null or minutes_late >= 0);

alter table public.attendance drop constraint if exists attendance_status_check;

alter table public.attendance
  add constraint attendance_status_check
  check (status in ('present', 'absent', 'late', 'excused', 'sent_home'));

-- Lateness → late marks (shared by the app and any SQL-side logic).
create or replace function public.late_marks_for(p_minutes_late integer)
returns integer
language sql immutable
as $$
  select case
    when p_minutes_late is null or p_minutes_late < 5  then 0
    when p_minutes_late < 10                           then 0
    when p_minutes_late < 15                           then 1
    when p_minutes_late < 20                           then 3
    else 5
  end;
$$;
