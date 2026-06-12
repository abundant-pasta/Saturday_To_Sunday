-- Weekly growth funnel report for Saturday to Sunday.
-- Run in Supabase SQL editor or via psql. Adjust the interval if needed.

WITH params AS (
  SELECT now() - interval '28 days' AS start_at
),
events AS (
  SELECT *
  FROM public.growth_events, params
  WHERE created_at >= params.start_at
),
weekly_events AS (
  SELECT
    date_trunc('week', created_at)::date AS week_start,
    count(*) FILTER (WHERE event_name = 'game_started') AS game_starts,
    count(*) FILTER (WHERE event_name = 'game_finished') AS game_finishes,
    count(*) FILTER (WHERE event_name = 'claim_prompt_shown') AS claim_prompts,
    count(*) FILTER (WHERE event_name = 'claim_started') AS claim_starts,
    count(*) FILTER (WHERE event_name = 'claim_completed') AS claim_completions,
    count(*) FILTER (WHERE event_name = 'push_subscribed') AS push_subscriptions,
    count(*) FILTER (WHERE event_name = 'share_completed') AS shares,
    count(*) FILTER (WHERE event_name = 'survival_joined') AS survival_joins,
    count(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS active_registered_tracked,
    count(DISTINCT guest_id) FILTER (WHERE guest_id IS NOT NULL) AS active_guests_tracked
  FROM events
  GROUP BY 1
),
weekly_signups AS (
  SELECT
    date_trunc('week', created_at)::date AS week_start,
    count(*) AS new_signups
  FROM auth.users, params
  WHERE created_at >= params.start_at
    AND deleted_at IS NULL
  GROUP BY 1
),
weekly_active_registered AS (
  SELECT
    date_trunc('week', created_at)::date AS week_start,
    count(DISTINCT user_id) AS active_registered_players
  FROM public.daily_results, params
  WHERE created_at >= params.start_at
    AND user_id IS NOT NULL
  GROUP BY 1
),
weekly_returning_registered AS (
  SELECT
    week_start,
    count(*) AS returning_registered_2plus_days
  FROM (
    SELECT
      date_trunc('week', created_at)::date AS week_start,
      user_id,
      count(DISTINCT game_date) AS active_days
    FROM public.daily_results, params
    WHERE created_at >= params.start_at
      AND user_id IS NOT NULL
    GROUP BY 1, 2
  ) users_by_week
  WHERE active_days >= 2
  GROUP BY 1
),
weekly_campaigns AS (
  SELECT
    date_trunc('week', created_at)::date AS week_start,
    coalesce(
      nullif(metadata->>'utm_campaign', ''),
      nullif(metadata->>'theme', ''),
      nullif(metadata->>'school', ''),
      'uncategorized'
    ) AS campaign,
    coalesce(nullif(metadata->>'utm_source', ''), 'unknown') AS source,
    count(*) FILTER (WHERE event_name IN ('campaign_landed', 'shared_link_landed')) AS landings,
    count(*) FILTER (WHERE event_name = 'game_started') AS starts,
    count(*) FILTER (WHERE event_name = 'game_finished') AS finishes,
    count(*) FILTER (WHERE event_name = 'share_completed') AS shares,
    count(*) FILTER (WHERE event_name = 'claim_completed') AS claims
  FROM events
  WHERE metadata ? 'utm_campaign'
     OR metadata ? 'theme'
     OR metadata ? 'school'
  GROUP BY 1, 2, 3
)
SELECT
  coalesce(we.week_start, ws.week_start, war.week_start, wrr.week_start) AS week_start,
  coalesce(ws.new_signups, 0) AS new_signups,
  coalesce(war.active_registered_players, 0) AS active_registered_players,
  coalesce(wrr.returning_registered_2plus_days, 0) AS returning_registered_2plus_days,
  coalesce(we.game_starts, 0) AS game_starts,
  coalesce(we.game_finishes, 0) AS game_finishes,
  coalesce(we.claim_prompts, 0) AS claim_prompts,
  coalesce(we.claim_starts, 0) AS claim_starts,
  coalesce(we.claim_completions, 0) AS claim_completions,
  coalesce(we.push_subscriptions, 0) AS push_subscriptions,
  coalesce(we.shares, 0) AS shares,
  coalesce(we.survival_joins, 0) AS survival_joins,
  coalesce(we.active_guests_tracked, 0) AS active_guests_tracked
FROM weekly_events we
FULL OUTER JOIN weekly_signups ws USING (week_start)
FULL OUTER JOIN weekly_active_registered war USING (week_start)
FULL OUTER JOIN weekly_returning_registered wrr USING (week_start)
ORDER BY week_start DESC;

-- Campaign/source drilldown for the same window.
WITH params AS (
  SELECT now() - interval '28 days' AS start_at
),
events AS (
  SELECT *
  FROM public.growth_events, params
  WHERE created_at >= params.start_at
),
weekly_campaigns AS (
  SELECT
    date_trunc('week', created_at)::date AS week_start,
    coalesce(
      nullif(metadata->>'utm_campaign', ''),
      nullif(metadata->>'theme', ''),
      nullif(metadata->>'school', ''),
      'uncategorized'
    ) AS campaign,
    coalesce(nullif(metadata->>'utm_source', ''), 'unknown') AS source,
    count(*) FILTER (WHERE event_name IN ('campaign_landed', 'shared_link_landed')) AS landings,
    count(*) FILTER (WHERE event_name = 'game_started') AS starts,
    count(*) FILTER (WHERE event_name = 'game_finished') AS finishes,
    count(*) FILTER (WHERE event_name = 'share_completed') AS shares,
    count(*) FILTER (WHERE event_name = 'claim_completed') AS claims
  FROM events
  WHERE metadata ? 'utm_campaign'
     OR metadata ? 'theme'
     OR metadata ? 'school'
  GROUP BY 1, 2, 3
)
SELECT *
FROM weekly_campaigns
ORDER BY week_start DESC, starts DESC, landings DESC;

-- Outreach autopilot weekly funnel.
WITH params AS (
  SELECT now() - interval '28 days' AS start_at
),
outreach AS (
  SELECT
    c.id,
    c.key,
    c.name,
    c.utm_campaign
  FROM public.outreach_campaigns c
),
message_week AS (
  SELECT
    date_trunc('week', m.created_at)::date AS week_start,
    m.campaign_id,
    coalesce(t.source, 'unknown') AS source,
    count(DISTINCT m.target_id) AS target_count,
    count(*) FILTER (WHERE m.status = 'drafted') AS drafted,
    count(*) FILTER (WHERE m.status = 'approved') AS approved,
    count(*) FILTER (WHERE m.status = 'sent') AS sent,
    count(*) FILTER (WHERE m.status = 'failed') AS failed
  FROM public.outreach_messages m
  CROSS JOIN params
  LEFT JOIN public.outreach_targets t ON t.id = m.target_id
  WHERE m.created_at >= params.start_at
  GROUP BY 1, 2, 3
),
growth_week AS (
  SELECT
    date_trunc('week', ge.created_at)::date AS week_start,
    o.id AS campaign_id,
    coalesce(t.source, 'unknown') AS source,
    count(*) FILTER (WHERE ge.event_name IN ('campaign_landed', 'shared_link_landed')) AS landings,
    count(*) FILTER (WHERE ge.event_name = 'game_started') AS starts,
    count(*) FILTER (WHERE ge.event_name = 'game_finished') AS finishes,
    count(*) FILTER (WHERE ge.event_name = 'claim_completed') AS claims,
    count(*) FILTER (WHERE ge.event_name = 'share_completed') AS shares
  FROM public.growth_events ge
  JOIN outreach o
    ON ge.metadata->>'utm_campaign' = o.utm_campaign
  LEFT JOIN public.outreach_targets t
    ON t.id::text = ge.metadata->>'outreach_target'
  JOIN params ON ge.created_at >= params.start_at
  WHERE nullif(ge.metadata->>'outreach_target', '') IS NOT NULL
  GROUP BY 1, 2, 3
)
SELECT
  coalesce(mw.week_start, gw.week_start) AS week_start,
  o.key AS campaign,
  coalesce(mw.source, gw.source, 'unknown') AS source,
  o.name,
  coalesce(mw.target_count, 0) AS target_count,
  coalesce(mw.drafted, 0) AS drafted,
  coalesce(mw.approved, 0) AS approved,
  coalesce(mw.sent, 0) AS sent,
  coalesce(mw.failed, 0) AS failed,
  coalesce(gw.landings, 0) AS landings,
  coalesce(gw.starts, 0) AS starts,
  coalesce(gw.finishes, 0) AS finishes,
  coalesce(gw.claims, 0) AS claims,
  coalesce(gw.shares, 0) AS shares
FROM outreach o
LEFT JOIN message_week mw ON mw.campaign_id = o.id
LEFT JOIN growth_week gw
  ON gw.campaign_id = o.id
  AND gw.week_start = mw.week_start
  AND gw.source = mw.source
WHERE coalesce(mw.week_start, gw.week_start) IS NOT NULL
ORDER BY week_start DESC, sent DESC, starts DESC;

-- Outreach target queue health.
SELECT
  count(*) AS targets,
  count(*) FILTER (WHERE status = 'discovered') AS discovered,
  count(*) FILTER (WHERE status = 'enriched') AS enriched,
  count(*) FILTER (WHERE status = 'drafted') AS drafted,
  count(*) FILTER (WHERE status = 'sent') AS sent,
  count(*) FILTER (WHERE status = 'opted_in') AS opted_in,
  count(*) FILTER (WHERE status = 'opted_out') AS opted_out,
  min(next_action_at) FILTER (WHERE next_action_at IS NOT NULL AND status <> 'opted_out') AS next_action_at
FROM public.outreach_targets;
