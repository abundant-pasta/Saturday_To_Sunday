# Survival Go-Live Runbook (Tomorrow Morning)

Target date: **Thursday, February 19, 2026**

This checklist is for enabling `/survival` end-to-end in production.

## 1. Preflight (DB State)

Run in Supabase SQL editor:

```sql
-- A) Confirm one active tournament
select id, name, start_date, end_date, is_active
from survival_tournaments
where is_active = true
order by created_at desc;

-- B) Confirm enough eligible players for survival game generation
select game_mode, count(*) as players
from players
where game_mode in ('survival', 'both')
group by game_mode;

-- C) Confirm participants table is writable
select count(*) as registered
from survival_participants sp
join survival_tournaments st on st.id = sp.tournament_id
where st.is_active = true;
```

Expected:
- Exactly one active tournament row.
- At least 10 players eligible for survival mode.

## 2. Deploy Edge Functions

From project root:

```bash
npx supabase functions deploy process-daily-elimination
npx supabase functions deploy reset-streaks
```

## 3. Configure Elimination Schedule (pg_cron)

The repo migration placeholders are not production-safe as written.  
Use your actual project URL and service role key:

```sql
-- Unschedule old job if present
select extensions.cron.unschedule('daily-survival-cut');

-- Schedule daily elimination at 00:00 UTC
select extensions.cron.schedule(
  'daily-survival-cut',
  '0 0 * * *',
  $$
    select extensions.net.http_post(
      url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/process-daily-elimination',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer <YOUR_SERVICE_ROLE_KEY>"}'
    )
  $$
);
```

## 4. App Route Smoke Test

1. Logged out user:
- Open `/survival/play` -> should redirect to `/survival`.

2. Logged in user, not joined:
- Open `/survival/play` -> should redirect to `/survival`.
- Join from `/survival`.

3. Logged in + joined + tournament started:
- Open `/survival/play` -> should load Survival game grid.

## 5. Verify Auto-Join Flow

1. Logged out, click survival CTA or popup.
2. Complete Google OAuth.
3. Confirm redirect lands at `/survival` and user is registered in active tournament.

## 6. Manual Elimination Dry Run (Recommended)

Trigger once manually to confirm function wiring:

```bash
curl -X POST \
  "https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/process-daily-elimination" \
  -H "Authorization: Bearer <YOUR_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json"
```

Then verify new rows in `survival_logs`.

## 7. Launch Monitoring (First 2 Hours)

- Track errors for:
  - `/survival`
  - `/survival/play`
  - `joinTournament` action
  - `submitSurvivalScore` action
- Watch `survival_logs` growth and elimination outcomes.
- Watch registration count trend in `survival_participants`.

