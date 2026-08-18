# 🏀 SNA Boys — Basketball Team Platform

**The digital home base for the SNA varsity team.** One place for the roster, attendance, schedule, games, media and announcements — instead of group chats, paper sheets, and scattered Google Drive links.

- **SNA Captain Admin** (`/captain`) — a dedicated control center: manage the roster, take attendance in seconds, run the schedule, post results, share highlights, and keep everyone informed. Quick actions for the most common tasks.
- **Player view** — see your attendance rate, the next practice/game, team announcements and new clips. You can never edit someone else's data.

Built with **React + TypeScript + Tailwind CSS + Supabase**, deployed as a **completely static site on GitHub Pages** — no Node server required. Works great on phones, tablets, and desktops. Dark mode included.

**Branding** lives in one config: [`src/lib/brand.ts`](src/lib/brand.ts) — SNA Boys name, basketball tagline, red & gold colors, and the SNA logo. The captain's team row can override the accent colors and team name at runtime (Settings → Team identity), and the SNA logo ships in `public/`.

---

## Table of contents

1. [How it works](#how-it-works)
2. [Requirements](#requirements)
3. [Install & run locally](#install--run-locally)
4. [Create a Supabase project](#create-a-supabase-project)
5. [Run the database setup](#run-the-database-setup)
6. [Create the first captain account](#create-the-first-captain-account)
7. [Deploy to GitHub Pages](#deploy-to-github-pages)
8. [Add a custom domain (optional)](#add-a-custom-domain-optional)
9. [Demo data](#demo-data)
10. [Security model](#security-model)
11. [Project structure](#project-structure)
12. [Troubleshooting](#troubleshooting)

---

## How it works

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS, light/dark mode, SNA red & gold |
| Backend | Supabase (PostgreSQL + Auth + Row Level Security) |
| Hosting | GitHub Pages (static build via GitHub Actions) |
| Media | External URLs (YouTube / Google Drive / Cloudinary) — nothing big stored in Git |
| Routing | React Router with `HashRouter` (refresh-safe on GitHub Pages) |

### Two experiences

- **SNA Captain Admin** — captains land on `/captain` (Overview). Navigation: Overview, Attendance, Players, Schedule, Games, Media, Announcements, Reports, Settings. Quick actions: Add Player, Take Attendance, Add Practice, Add Game, Post Announcement, Add Highlight. A player trying to open a captain route sees **Access restricted**.
- **Player** — Home, My Attendance, Team, Schedule, Games, Media, Announcements, Profile.

### Accounts & roles

The database decides who is a **captain** and who is a **player** — the frontend never trusts a role it sets itself.

**Players — code-first entry (no email/password):**

1. The captain adds players to the roster (Captain Admin → Players → Add Player) and shares the team's **invite code** (Settings → copy).
2. A player opens the app and enters the team code on the login screen — no account needed.
3. They tap their name on the roster to **claim their spot**. Their attendance and stats link to that name, and they can't claim someone else's already-taken spot (the database enforces this).
4. Players using the same phone keep their identity; on a new device they re-enter the code and re-pick their name.

This uses Supabase **anonymous sign-ins** — enable them once in the dashboard: **Authentication → Sign In / Up → Providers → Anonymous sign-ins → Enable** (no email confirmation involved).

**Captains — tap your name + captain code (no email needed):**

1. The captain sets a **captain code** in *Settings → Captain code* (a private secret, separate from the team invite code).
2. Join the team with the invite code like any player, tap your name on "Who are you?", and enter the captain code — the database links you to the captain's spot and you're in (works from any device). Anyone without the code gets rejected.
3. **3 wrong codes on the same device locks that device out for 30 minutes** (enforced by the database, not the UI). The starter SNA team ships with `120505` (change it in Settings).

There is **no email login anywhere** — the team code screen is the only way in, for captains and players alike. The captain unlocks their admin powers with the captain code, which the database verifies.

---

## Requirements

- Node.js **20+** (22 recommended) and npm
- A free [Supabase](https://supabase.com) account

---

## Install & run locally

```bash
# 1. Install dependencies
npm install

# 2. Copy the example env file (fill it in the next section)
cp .env.example .env
```

---

## Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Pick a name (e.g. `sna-platform`), a strong database password, and a region near your school.
3. When the project is ready, open **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`

Put them in your `.env` file:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> The anon key is *public by design*. It is only dangerous if the database has no Row Level Security — and this project has it everywhere. Never commit real credentials that can write data (`service_role`).

---

## Run the database setup

Open **SQL Editor** in the Supabase dashboard and run the files in this order (copy-paste each one, then **Run**):

1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — tables, Row Level Security, functions, triggers
2. *(optional but recommended)* [`supabase/migrations/0002_seed.sql`](supabase/migrations/0002_seed.sql) — realistic SNA demo data
3. *(code-first entry only)* [`supabase/migrations/0003_identity_claim.sql`](supabase/migrations/0003_identity_claim.sql) — roster identity claiming for the "team code" flow
4. *(branding)* [`supabase/migrations/0004_sna_branding.sql`](supabase/migrations/0004_sna_branding.sql) — adds the accent color and applies SNA branding
5. *(captain passcode)* [`supabase/migrations/0005_captain_passcode.sql`](supabase/migrations/0005_captain_passcode.sql) — captain code + 3-strike/30-minute lockout 6. *(player management)* [`supabase/migrations/0006_delete_player.sql`](supabase/migrations/0006_delete_player.sql) — captain-only permanent player deletion
 7. *(roles)* [`supabase/migrations/0007_coach_role.sql`](supabase/migrations/0007_coach_role.sql) — adds the **Coach** role (member-level access)
 8. *(game eligibility)* [`supabase/migrations/0008_game_players.sql`](supabase/migrations/0008_game_players.sql) — which players are allowed to play each game (captain picks when creating a game)
 9. *(lateness penalties)* [`supabase/migrations/0009_lateness_penalties.sql`](supabase/migrations/0009_lateness_penalties.sql) — `minutes_late` on attendance, the **Sent home** status, and the lateness → late-marks mapping (5 min = 3 laps · 10 min = 1 mark · 15 min = 3 marks · 20+ = go home)

All six are safe to re-run.

## Create the first captain account

The app has **no sign-up or team-creation form** — there's no email login at all. The captain creates the team with one SQL script, then unlocks Captain Admin with a private captain code.

1. Run the migrations (above), then open [`supabase/captain-bootstrap.sql`](supabase/captain-bootstrap.sql) in the Supabase SQL Editor, edit the team name / invite code / captain code if you like, and press **Run**. It creates **SNA Boys · 2026–2027** (basketball) in SNA red & gold with invite code `SNABOYS2627` and captain code `120505`.
2. Share the **invite code** with your players. They open the app, enter it, and tap their name on "Who are you?" to claim their spot.
3. To manage the team, tap **Tyson Tran · CAPTAIN** on the same "Who are you?" screen and enter the **captain code** — the database links you to the captain's spot and you land in **SNA Captain Admin**. Works from any device, no email or password.
4. Change the captain code anytime in **Settings → Captain code** and keep it private — anyone who knows it is the captain.

---

## Deploy to GitHub Pages

This repo includes a ready-to-use GitHub Actions workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) that builds and deploys on every push to `main`.

1. Push the project to a GitHub repository.
2. In the repo: **Settings → Secrets and variables → Actions** → add two repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Go to **Settings → Pages** → under *Build and deployment*, set **Source** to **GitHub Actions**.
4. Push to `main` (or run the workflow manually from the **Actions** tab).

That's it — every push to `main` deploys automatically.

### How routing works on GitHub Pages

The app uses `HashRouter`, so URLs look like `https://user.github.io/sna/#/schedule`. Refresh, deep links, and back/forward all work without server rewrites. The build also uses a relative `base: './'`, so it works from any subpath.

### Build locally (sanity check)

```bash
npm run build       # typechecks + builds into dist/
npm run preview     # serve the production build locally
```

---

## Add a custom domain (optional)

1. In your repo: **Settings → Pages → Custom domain** → enter your domain (e.g. `sna.myteam.com`).
2. Add the DNS record GitHub tells you (an `A` or `CNAME` record at your DNS provider).
3. Once verified, enable **Enforce HTTPS**.
4. *(Optional)* the workflow deploys with `upload-pages-artifact`, so custom domains set in Pages settings are preserved automatically.

---

## Demo data

`0002_seed.sql` creates **SNA Boys · 2026–2027** with 18 players, 13 events, 8 games (5 completed), 15 media items, 6 announcements, and realistic attendance (~85% present).

To become the captain of the demo team:

1. Run the seed file in the SQL Editor.
2. Open the app, enter the invite code `SNABOYS2627`, and tap **Tyson Tran · CAPTAIN** on "Who are you?".
3. Enter the captain code **`120505`** — you're in Captain Admin.

To wipe all demo data and start fresh: `select public.delete_demo_data();`

> Want your *real* team instead of the demo? Skip the seed and follow [Create the first captain account](#create-the-first-captain-account) — the bootstrap script creates a brand-new SNA team.

---

## Security model

Row Level Security is enabled on **every table**; a user can only ever read/write rows belonging to **their own team**. Key rules:

- **Players & Coaches** can read the roster, schedule, games, media and announcements of their team, and their own profile + attendance. They can **never** write attendance, other players' profiles, games, events, media, or announcements — and captain-only routes show **Access restricted**. (Coaches get the same read-only access as players.)
- **Captains** can manage everything inside their team — and nothing outside it.
- **Roles, team membership, and account links** are only changed by PostgreSQL functions marked `SECURITY DEFINER` (e.g. `create_team_with_captain`, `join_team_with_code`, `set_player_role`, `set_player_active`). No client can set `role`, `team_id`, or `auth_user_id` directly (column-level grants block it).
- **New users** get a profile automatically via a trigger on `auth.users`.

You can verify isolation yourself — log in as two different accounts on two teams, then try to read the other team's data from the browser console (`supabase.from('events').select('*')`). RLS returns nothing.

> ✅ The schema and RLS have been verified against a real PostgreSQL 16 instance with a 27-check test suite (anon sees nothing, players can't write or self-promote, captains can manage their team only, cross-team isolation holds, triggers fire). See `.planning/debug/migration-profiles-order.resolved.md` for the audit trail.

---

## Project structure

```
├── .github/workflows/deploy.yml   # GitHub Actions → GitHub Pages
├── supabase/migrations/           # SQL: schema + RLS + seed data
├── supabase/captain-bootstrap.sql # one-time script captains run to create their team
├── public/                        # PWA manifest, SNA icons, logo, service worker
├── src/
│   ├── components/
│   │   ├── ui/                    # Button, Modal, Input, Card, EmptyState…
│   │   ├── layout/                # Sidebar, mobile nav, notifications bell
│   │   └── cards/                 # PlayerCard, GameCard, MediaCard…
│   ├── hooks/                     # Auth, Team, Theme, Toast, TeamData
│   ├── lib/                       # brand.ts (SNA identity), Supabase client, API, utils
│   ├── pages/                     # One file per route — incl. Captain Overview,
│   │                              #   Players management, Reports, Restricted
│   └── types/                     # Shared TypeScript types
├── .env.example
└── README.md
```

---

## Troubleshooting

**"Supabase isn't configured yet"** — your `.env` is missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` (or the dev server wasn't restarted after adding them).

**"That invite code wasn't found"** — codes are regenerated when the captain clicks *New code* in Settings. Ask for the current one. (The SNA demo team uses `SNABOYS2627`.)

**"duplicate key value violates unique constraint … invite_code"** — that code is already used by another team (e.g. the demo team). Edit the script and pick a different code, or change the demo team's code first.

**Deploy shows the login page but entering the team code fails** — GitHub Actions needs the two secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) set in the repository, and the database needs the migrations run (see [Run the database setup](#run-the-database-setup)).

**I re-ran the seed and players duplicated** — the seed uses fixed IDs and is safe to re-run, but running it twice on top of your own changes is not needed.

**Offline** — the app is a PWA: it caches the app shell and shows a banner when you lose connection. Data always requires the network (Supabase), so changes are never silently "saved" offline.
