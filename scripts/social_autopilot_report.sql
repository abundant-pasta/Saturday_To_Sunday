-- Social Autopilot report: campaign/post publishing and attributed game actions.
-- Run in Supabase SQL editor or via psql against production.

WITH post_rollup AS (
  SELECT
    sp.id AS social_post_id,
    sc.key AS campaign_key,
    sc.name AS campaign_name,
    sp.platform,
    sp.post_type,
    count(*) FILTER (WHERE sp.status = 'drafted') AS drafted_count,
    count(*) FILTER (WHERE sp.status IN ('approved', 'scheduled')) AS ready_count,
    count(*) FILTER (WHERE sp.status = 'posted') AS posted_count,
    count(*) FILTER (WHERE sp.status = 'failed') AS failed_count
  FROM public.social_posts sp
  LEFT JOIN public.social_campaigns sc ON sc.id = sp.campaign_id
  GROUP BY sp.id, sc.key, sc.name, sp.platform, sp.post_type
),
event_rollup AS (
  SELECT
    metadata->>'social_post_id' AS social_post_id,
    count(*) FILTER (WHERE event_name IN ('campaign_landed', 'shared_link_landed', 'social_link_landed')) AS landing_count,
    count(*) FILTER (WHERE event_name = 'game_started') AS start_count,
    count(*) FILTER (WHERE event_name = 'game_finished') AS finish_count,
    count(*) FILTER (WHERE event_name = 'claim_completed') AS claim_count,
    count(*) FILTER (WHERE event_name = 'share_completed') AS share_count,
    count(*) FILTER (WHERE event_name = 'survival_joined') AS survival_join_count
  FROM public.growth_events
  WHERE created_at >= now() - interval '90 days'
    AND metadata ? 'social_post_id'
  GROUP BY metadata->>'social_post_id'
)
SELECT
  p.campaign_key,
  p.campaign_name,
  p.platform,
  p.post_type,
  p.social_post_id,
  p.drafted_count,
  p.ready_count,
  p.posted_count,
  p.failed_count,
  coalesce(e.landing_count, 0) AS landing_count,
  coalesce(e.start_count, 0) AS start_count,
  coalesce(e.finish_count, 0) AS finish_count,
  coalesce(e.claim_count, 0) AS claim_count,
  coalesce(e.share_count, 0) AS share_count,
  coalesce(e.survival_join_count, 0) AS survival_join_count
FROM post_rollup p
LEFT JOIN event_rollup e USING (social_post_id)
ORDER BY
  coalesce(e.start_count, 0) + coalesce(e.landing_count, 0) + coalesce(e.share_count, 0) DESC,
  p.campaign_name,
  p.platform;
