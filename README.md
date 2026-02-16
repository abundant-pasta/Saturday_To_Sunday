# Saturday to Sunday

A multi-mode sports trivia app built with Next.js + Supabase.

Players guess the college for pro football and basketball athletes in daily timed grids, compete on leaderboards, maintain streaks, earn streak-freezes, join squads, and play tournament-style Survival mode.

## Features

- Daily grids for `football` and `basketball`
- Tier-weighted scoring with timed point decay
- Global and squad leaderboards (daily + weekly)
- User auth (Google via Supabase)
- Streak tracking per sport
- Rewarded-ad streak freeze inventory
- Push notifications for daily game drops
- Survival tournament mode with daily eliminations
- Admin player dashboard and image audit workflow
- PWA install support (service worker + manifest)

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Supabase (Auth, Postgres, Edge Functions, RLS)
- Tailwind CSS 4
- `next-pwa`
- Vercel cron jobs

## Project Structure

- `app/` - routes, server actions, API endpoints
- `components/` - game UI, leaderboard, admin and squads UI
- `lib/` - constants, conference/distractor helpers, static guides data
- `utils/supabase/` - browser/server Supabase client helpers
- `supabase/migrations/` - SQL schema changes
- `supabase/functions/` - edge functions (`reset-streaks`, `process-daily-elimination`)
- `tests/` - logic tests (currently survival elimination logic)
- `scripts/` - data seeding and maintenance scripts

## Game Modes

### Daily

- `/daily` -> football daily grid
- `/daily/basketball` -> basketball daily grid
- Date logic is based on `TIMEZONE_OFFSET_MS` in `lib/constants.ts`.

### Survival

- `/survival` -> tournament signup and status
- Uses `survival_tournaments`, `survival_participants`, and `survival_scores`
- Daily elimination logic runs in edge function: `supabase/functions/process-daily-elimination/index.ts`

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local` with at least:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ADMIN_EMAIL=...

# Cron auth (production)
CRON_SECRET=...

# Web push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com

# Rewarded ads
NEXT_PUBLIC_GOOGLE_AD_CLIENT=ca-pub-...
NEXT_PUBLIC_REWARDED_AD_UNIT_PATH=/network/ad-unit
```

See also `ENV_SETUP.md` and `MIGRATION_INSTRUCTIONS.md`.

### 3. Run database migrations

Run SQL files from `supabase/migrations/` in order in your Supabase project.

### 4. Start dev server

```bash
npm run dev
```

Open <http://localhost:3000>

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Scheduled Jobs

`vercel.json` defines two cron jobs:

- `GET /api/cron?action=generate` - generates upcoming daily games
- `GET /api/cron?action=notify` - sends push notifications

In production, cron endpoint checks `Authorization: Bearer $CRON_SECRET`.

## Core Routes

- `/` - home/game hub
- `/daily` - football game
- `/daily/basketball` - basketball game
- `/leaderboard` - public leaderboard
- `/profile` - account, streaks, freezes, settings
- `/collection` - trophy room and badge progress
- `/squads` - squad management + squad leaderboard
- `/survival` - survival mode
- `/admin` - admin dashboard (restricted by `ADMIN_EMAIL`)
- `/admin/images` - admin image audit

## Supabase Notes

- Uses RLS, with service-role client for privileged admin/cron operations.
- Some legacy SQL files may not represent current full schema; treat `supabase/migrations/` + app code as source of truth.

## Testing

Current test file:

- `tests/survival-logic.test.ts`

Run with your preferred TS test runner setup (or adapt into your existing test harness).

## Deployment

- Optimized for Vercel + Supabase.
- PWA output is generated to `public/` via `next-pwa`.
- `next.config.ts` disables Next image optimization (`images.unoptimized = true`) to reduce Vercel image transformation usage.
