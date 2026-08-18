-- ============================================================================
-- SNA — demo / seed data
-- Run AFTER 0001_init.sql. Safe to re-run (inserts use fixed IDs).
--
-- Demo flow (no email or password anywhere):
--   1. Open the app, enter the invite code:  SNABOYS2627
--   2. Tap your name on "Who are you?" to claim your spot.
--   3. To manage the team, tap "Tyson Tran · CAPTAIN" and enter the
--      captain code:  120505  (change it in Settings → Captain code).
--
-- To wipe demo data and start fresh: select public.delete_demo_data();
-- ============================================================================

-- The demo team (fixed id so re-running is safe)
insert into public.teams (id, name, sport, season, school, logo_url, primary_color, secondary_color, accent_color, invite_code)
values (
  '00000000-0000-4000-8000-000000000001',
  'SNA Basketball',
  'Basketball',
  '2026–2027',
  'SNA Marianapolis International School',
  NULL, -- no logo → the app shows the SNA wordmark
  '#C8102E',
  '#F2A900',
  '#D4AF37',
  'SNABOYS2627'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Roster — 18 players (no auth accounts yet)
-- ---------------------------------------------------------------------------
insert into public.profiles (id, team_id, role, full_name, email, jersey_number, position, grade, height_cm, photo_url) values
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'player', 'Alex Nguyen',   'alex.nguyen@demo.com',   23, 'Point Guard',     '12', 180.3, 'https://i.pravatar.cc/150?img=12'),
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'player', 'Daniel Tran',    'daniel.tran@demo.com',    5, 'Shooting Guard',  '12', 185.4, 'https://i.pravatar.cc/150?img=13'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'player', 'Michael Le',     'michael.le@demo.com',    11, 'Point Guard',     '11', 178.0, 'https://i.pravatar.cc/150?img=14'),
  ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', 'player', 'Jason Pham',     'jason.pham@demo.com',    34, 'Power Forward',   '12', 196.8, 'https://i.pravatar.cc/150?img=15'),
  ('00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000001', 'player', 'Kevin Nguyen',   'kevin.nguyen@demo.com',   7, 'Shooting Guard',  '11', 182.9, 'https://i.pravatar.cc/150?img=16'),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000001', 'player', 'Tyler Brooks',   'tyler.brooks@demo.com',   1, 'Small Forward',   '12', 190.5, 'https://i.pravatar.cc/150?img=17'),
  ('00000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000001', 'player', 'Marcus Johnson', 'marcus.johnson@demo.com', 2, 'Shooting Guard',  '10', 184.1, 'https://i.pravatar.cc/150?img=18'),
  ('00000000-0000-4000-8000-000000000017', '00000000-0000-4000-8000-000000000001', 'player', 'Ethan Kim',      'ethan.kim@demo.com',     13, 'Center',          '11', 201.3, 'https://i.pravatar.cc/150?img=19'),
  ('00000000-0000-4000-8000-000000000018', '00000000-0000-4000-8000-000000000001', 'player', 'Jayden Williams','jayden.williams@demo.com',15, 'Small Forward',   '10', 188.6, 'https://i.pravatar.cc/150?img=20'),
  ('00000000-0000-4000-8000-000000000019', '00000000-0000-4000-8000-000000000001', 'player', 'Brandon Lee',    'brandon.lee@demo.com',   21, 'Power Forward',   '11', 194.5, 'https://i.pravatar.cc/150?img=21'),
  ('00000000-0000-4000-8000-00000000001a', '00000000-0000-4000-8000-000000000001', 'player', 'Chris Tran',     'chris.tran@demo.com',     3, 'Point Guard',     '10', 176.5, 'https://i.pravatar.cc/150?img=22'),
  ('00000000-0000-4000-8000-00000000001b', '00000000-0000-4000-8000-000000000001', 'player', 'Andrew Vo',      'andrew.vo@demo.com',     10, 'Shooting Guard',  '9', 181.0, 'https://i.pravatar.cc/150?img=23'),
  ('00000000-0000-4000-8000-00000000001c', '00000000-0000-4000-8000-000000000001', 'player', 'Nathan Duong',   'nathan.duong@demo.com',  24, 'Center',          '9', 198.7, 'https://i.pravatar.cc/150?img=24'),
  ('00000000-0000-4000-8000-00000000001d', '00000000-0000-4000-8000-000000000001', 'player', 'Justin Huynh',   'justin.huynh@demo.com',  30, 'Power Forward',   '10', 193.2, 'https://i.pravatar.cc/150?img=25'),
  ('00000000-0000-4000-8000-00000000001e', '00000000-0000-4000-8000-000000000001', 'player', 'Derek Lam',      'derek.lam@demo.com',      4, 'Small Forward',   '9', 185.0, 'https://i.pravatar.cc/150?img=26'),
  ('00000000-0000-4000-8000-00000000001f', '00000000-0000-4000-8000-000000000001', 'player', 'Ryan Do',        'ryan.do@demo.com',        8, 'Shooting Guard',  '9', 179.6, 'https://i.pravatar.cc/150?img=27'),
  ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000001', 'player', 'Steven Ngo',     'steven.ngo@demo.com',    12, 'Point Guard',     '10', 177.2, 'https://i.pravatar.cc/150?img=28'),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', 'player', 'Mike Hoang',     'mike.hoang@demo.com',    32, 'Center',          '11', 202.1, 'https://i.pravatar.cc/150?img=29')
on conflict (id) do nothing;

-- The captain's spot — shown on "Who are you?" as "Tyson Tran · CAPTAIN".
-- Tapping it asks for the captain code (teams.captain_code) and the database
-- links the current session to this spot. No auth account needed.
insert into public.profiles (id, team_id, role, full_name, position, grade, is_active)
values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000001', 'captain', 'Tyson Tran', 'Captain', '12', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Events — 13 practices (past + upcoming around the season start)
-- ---------------------------------------------------------------------------
insert into public.events (id, team_id, title, type, date, start_time, end_time, location, description) values
  ('00000000-0000-4000-8000-000000000100', '00000000-0000-4000-8000-000000000001', 'Preseason Practice',  'practice', '2026-08-03', '16:00', '18:00', 'School Gym',     'Conditioning + ball handling'),
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'Preseason Practice',  'practice', '2026-08-05', '16:00', '18:00', 'School Gym',     'Shooting drills'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'Preseason Practice',  'practice', '2026-08-07', '16:00', '18:00', 'School Gym',     'Full-court scrimmage'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', 'Practice',            'practice', '2026-08-10', '16:00', '18:00', 'School Gym',     'Defense + transition offense'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', 'Practice',            'practice', '2026-08-12', '16:00', '18:00', 'School Gym',     'Pick & roll coverage'),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000001', 'Practice',            'practice', '2026-08-14', '16:00', '18:00', 'School Gym',     'Press break + free throws'),
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000001', 'Practice',            'practice', '2026-08-17', '16:00', '18:00', 'School Gym',     'Defense + transition offense'),
  ('00000000-0000-4000-8000-000000000107', '00000000-0000-4000-8000-000000000001', 'Practice',            'practice', '2026-08-19', '16:00', '18:00', 'School Gym',     'Film session + walkthrough'),
  ('00000000-0000-4000-8000-000000000108', '00000000-0000-4000-8000-000000000001', 'Practice',            'practice', '2026-08-21', '16:00', '18:00', 'School Gym',     'Zone offense'),
  ('00000000-0000-4000-8000-000000000109', '00000000-0000-4000-8000-000000000001', 'Practice',            'practice', '2026-08-24', '16:00', '18:00', 'School Gym',     'Game prep — Central High'),
  ('00000000-0000-4000-8000-00000000010a', '00000000-0000-4000-8000-000000000001', 'Practice',            'practice', '2026-08-26', '16:00', '18:00', 'School Gym',     'Shooting + conditioning'),
  ('00000000-0000-4000-8000-00000000010b', '00000000-0000-4000-8000-000000000001', 'Practice',            'practice', '2026-08-28', '16:00', '18:00', 'School Gym',     'Scrimmage — 5 on 5'),
  ('00000000-0000-4000-8000-00000000010c', '00000000-0000-4000-8000-000000000001', 'Team Dinner',         'team_event', '2026-08-22', '18:30', '20:00', 'Pizza Palace',    'Team bonding dinner before the season')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Games — 8 (5 completed, 3 upcoming)
-- ---------------------------------------------------------------------------
insert into public.games (id, team_id, opponent, date, time, location, home_away, status, our_score, opponent_score, result, notes) values
  ('00000000-0000-4000-8000-000000000200', '00000000-0000-4000-8000-000000000001', 'West High',       '2026-08-08', '19:00', 'West High Gym',    'away',    'completed', 58, 64, 'loss', 'Turnovers killed us in the 3rd.'),
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', 'Central High',    '2026-08-15', '19:00', 'School Gym',       'home',    'completed', 71, 62, 'win',  'Big home opener win 🏆'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000001', 'Lincoln High',    '2026-08-20', '18:30', 'Lincoln Gym',      'away',    'completed', 66, 59, 'win',  'Great defensive effort.'),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000001', 'North High',      '2026-08-22', '17:00', 'School Gym',       'home',    'completed', 74, 58, 'win',  'Balanced scoring — five in double digits.'),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000001', 'Central High',    '2026-08-25', '19:00', 'School Gym',       'home',    'upcoming',  null, null, null, 'Rematch — they want revenge.'),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000001', 'East High',       '2026-08-27', '19:30', 'East High Gym',    'away',    'upcoming',  null, null, null, ''),
  ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000001', 'Valley HS',       '2026-08-29', '16:00', 'School Gym',       'home',    'upcoming',  null, null, null, ''),
  ('00000000-0000-4000-8000-000000000207', '00000000-0000-4000-8000-000000000001', 'State Tournament','2026-09-05', '12:00', 'Metro Arena',      'neutral', 'upcoming',  null, null, null, 'Round 1 — bus leaves at 9 AM.')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Attendance — deterministic pseudo-random statuses for every practice
-- (~85% present, 5% late, 5% absent, 5% excused)
-- ---------------------------------------------------------------------------
insert into public.attendance (team_id, event_id, player_id, status)
select
  '00000000-0000-4000-8000-000000000001',
  e.id,
  p.id,
  case (abs(hashtextextended(e.id::text || p.id::text, 42)) % 20)
    when 0 then 'absent'
    when 1 then 'late'
    when 2 then 'excused'
    else 'present'
  end
from public.events e
cross join public.profiles p
where e.team_id = '00000000-0000-4000-8000-000000000001'
  and p.team_id = '00000000-0000-4000-8000-000000000001'
  and e.type = 'practice'
on conflict (event_id, player_id) do nothing;

-- ---------------------------------------------------------------------------
-- Media — 15 items (external URLs only)
-- ---------------------------------------------------------------------------
insert into public.media (id, team_id, title, description, category, thumbnail_url, video_url, date) values
  ('00000000-0000-4000-8000-000000000300', '00000000-0000-4000-8000-000000000001', 'Home Opener Highlights — SNA vs Central', 'All the big plays from our 71–62 win.', 'game', 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '2026-08-15'),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000001', 'Alex Nguyen — 28 pt game', 'Career night from the point guard.', 'highlight', 'https://i.ytimg.com/vi/3JZ_D3ELwOQ/hqdefault.jpg', 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ', '2026-08-15'),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000001', 'Practice — Transition Offense', 'Full court drills from Monday.', 'practice', 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg', 'https://www.youtube.com/watch?v=9bZkp7q19f0', '2026-08-17'),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000001', 'Team Photo Day', 'Everyone looking sharp in the new jerseys.', 'photo', 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800', 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800', '2026-08-10'),
  ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000001', 'Defense Wins Championships — Film', 'Breakdown of our press coverage.', 'practice', 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg', 'https://www.youtube.com/watch?v=jNQXAC9IVRw', '2026-08-14'),
  ('00000000-0000-4000-8000-000000000305', '00000000-0000-4000-8000-000000000001', 'Game 1 vs West High — Full Game', 'Film from the season opener.', 'game', 'https://i.ytimg.com/vi/1YVQ3B3zKqU/hqdefault.jpg', 'https://www.youtube.com/watch?v=1YVQ3B3zKqU', '2026-08-08'),
  ('00000000-0000-4000-8000-000000000306', '00000000-0000-4000-8000-000000000001', 'Slam of the Week — Mike Hoang', 'Poster dunk in practice. Unstoppable.', 'highlight', 'https://i.ytimg.com/vi/5NV6Rdv1a3I/hqdefault.jpg', 'https://www.youtube.com/watch?v=5NV6Rdv1a3I', '2026-08-12'),
  ('00000000-0000-4000-8000-000000000307', '00000000-0000-4000-8000-000000000001', 'Shooting Drills — Guard Workout', 'Form shooting circuit from Wednesday.', 'practice', 'https://i.ytimg.com/vi/2Vv-BfVoq4g/hqdefault.jpg', 'https://www.youtube.com/watch?v=2Vv-BfVoq4g', '2026-08-19'),
  ('00000000-0000-4000-8000-000000000308', '00000000-0000-4000-8000-000000000001', 'Gym Banner Reveal', 'Our new banner goes up.', 'photo', 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800', 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800', '2026-08-05'),
  ('00000000-0000-4000-8000-000000000309', '00000000-0000-4000-8000-000000000001', 'Win vs Lincoln — Highlights', 'Road win highlights.', 'game', 'https://i.ytimg.com/vi/ZTidn2dBYbY/hqdefault.jpg', 'https://www.youtube.com/watch?v=ZTidn2dBYbY', '2026-08-20'),
  ('00000000-0000-4000-8000-00000000030a', '00000000-0000-4000-8000-000000000001', 'Captain''s Cut — Film Session', 'Alex breaks down the Lincoln game.', 'highlight', 'https://i.ytimg.com/vi/eRZgYvBn7As/hqdefault.jpg', 'https://www.youtube.com/watch?v=eRZgYvBn7As', '2026-08-21'),
  ('00000000-0000-4000-8000-00000000030b', '00000000-0000-4000-8000-000000000001', 'Team Dinner Night', 'Good vibes at Pizza Palace.', 'photo', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', '2026-08-22'),
  ('00000000-0000-4000-8000-00000000030c', '00000000-0000-4000-8000-000000000001', 'Press Break Drills', 'Breaking the full-court press.', 'practice', 'https://i.ytimg.com/vi/OPf0YbXqDm0/hqdefault.jpg', 'https://www.youtube.com/watch?v=OPf0YbXqDm0', '2026-08-24'),
  ('00000000-0000-4000-8000-00000000030d', '00000000-0000-4000-8000-000000000001', 'Win vs North High — Highlights', 'Five players in double figures.', 'game', 'https://i.ytimg.com/vi/uelHwf8o7_U/hqdefault.jpg', 'https://www.youtube.com/watch?v=uelHwf8o7_U', '2026-08-22'),
  ('00000000-0000-4000-8000-00000000030e', '00000000-0000-4000-8000-000000000001', 'Intro Video — 2026–27 Season', 'Season hype video. Go Eagles!', 'highlight', 'https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', '2026-08-01')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Announcements — 6 (1 pinned)
-- ---------------------------------------------------------------------------
insert into public.announcements (id, team_id, title, content, author_id, pinned, created_at) values
  ('00000000-0000-4000-8000-000000000400', '00000000-0000-4000-8000-000000000001', 'Practice moved to Court 2', 'Today''s practice is moved to Court 2 (the smaller gym) — the girls team has Court 1. Same time, 4:00 PM sharp. Be early, be loud.', '00000000-0000-4000-8000-000000000010', true,  now() - interval '2 hours'),
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000001', 'Game day vs Central High — Tuesday', 'Home game Tuesday 7:00 PM. Wear warmups to school, dress code applies. Parents: tickets at the door. Let''s protect home court!', '00000000-0000-4000-8000-000000000010', false, now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000001', 'Team dinner Friday 6:30 PM', 'Pizza Palace after practice. Coach is buying. Bring $5 if you want extra slices.', '00000000-0000-4000-8000-000000000010', false, now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000001', 'Film session added to Thursday', 'Coach wants everyone at Thursday''s film session. We''re watching the West High game — bring your notebook.', '00000000-0000-4000-8000-000000000010', false, now() - interval '3 days'),
  ('00000000-0000-4000-8000-000000000404', '00000000-0000-4000-8000-000000000001', 'Fundraiser — car wash this Saturday', 'Sign-up sheet is in the locker room. Shifts are 9–12 and 12–3. Every player needs one shift before the end of the season.', '00000000-0000-4000-8000-000000000010', false, now() - interval '4 days'),
  ('00000000-0000-4000-8000-000000000405', '00000000-0000-4000-8000-000000000001', 'Welcome to the season!', '18 players. One team. Let''s make this season count. Download the app — everything lives here now: schedule, attendance, highlights.', '00000000-0000-4000-8000-000000000010', false, now() - interval '6 days')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Demo helpers
-- ---------------------------------------------------------------------------
create or replace function public.join_demo_team_as_captain()
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_demo uuid := '00000000-0000-4000-8000-000000000001';
  v_my   public.profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  select * into v_my from public.profiles where auth_user_id = v_uid;
  if not found then
    raise exception 'PROFILE_MISSING';
  end if;
  if v_my.team_id is not null then
    if v_my.team_id = v_demo and v_my.role = 'captain' then
      return v_demo;
    end if;
    raise exception 'ALREADY_IN_TEAM';
  end if;
  update public.profiles set team_id = v_demo, role = 'captain' where id = v_my.id;
  return v_demo;
end;
$$;

create or replace function public.delete_demo_data()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_demo uuid := '00000000-0000-4000-8000-000000000001';
begin
  delete from public.notification_reads
    where notification_id in (select id from public.notifications where team_id = v_demo);
  delete from public.notifications where team_id = v_demo;
  delete from public.announcements where team_id = v_demo;
  delete from public.media where team_id = v_demo;
  delete from public.games where team_id = v_demo;
  delete from public.attendance where team_id = v_demo;
  delete from public.events where team_id = v_demo;
  delete from public.profiles where team_id = v_demo and auth_user_id is null;
  delete from public.teams where id = v_demo;
end;
$$;
