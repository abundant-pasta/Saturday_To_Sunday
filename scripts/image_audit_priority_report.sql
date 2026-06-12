-- High-priority player image audit queue.
-- Run in Supabase SQL editor. Review rows marked unreviewed/spoiler/wrong_person/missing first.

WITH upcoming_daily AS (
  SELECT DISTINCT (question->>'id')::bigint AS player_id, 'upcoming_daily' AS reason
  FROM public.daily_games dg
  CROSS JOIN LATERAL jsonb_array_elements(dg.content) AS question
  WHERE dg.date BETWEEN current_date AND current_date + 14
    AND question ? 'id'
),
survival_candidates AS (
  SELECT id AS player_id, 'survival_candidate' AS reason
  FROM public.players
  WHERE game_mode IN ('survival', 'both')
    AND sport IN ('football', 'basketball')
    AND image_url IS NOT NULL
),
unverified_tier_1 AS (
  SELECT id AS player_id, 'unverified_tier_1' AS reason
  FROM public.players
  WHERE tier = 1
    AND coalesce(image_status, 'unreviewed') <> 'approved'
),
reported_examples AS (
  SELECT id AS player_id, 'reported_example' AS reason
  FROM public.players
  WHERE lower(name) IN ('tony romo', 'eddie lacy', 'feleipe franks')
),
queue AS (
  SELECT * FROM upcoming_daily
  UNION ALL SELECT * FROM survival_candidates
  UNION ALL SELECT * FROM unverified_tier_1
  UNION ALL SELECT * FROM reported_examples
)
SELECT
  p.id,
  p.name,
  p.sport,
  p.team,
  p.position,
  p.college,
  p.image_url,
  p.image_status,
  p.image_context,
  p.is_image_verified,
  array_agg(DISTINCT q.reason ORDER BY q.reason) AS reasons
FROM queue q
JOIN public.players p ON p.id = q.player_id
GROUP BY p.id
ORDER BY
  CASE WHEN 'reported_example' = ANY(array_agg(q.reason)) THEN 0 ELSE 1 END,
  CASE coalesce(p.image_status, 'unreviewed')
    WHEN 'wrong_person' THEN 0
    WHEN 'spoiler' THEN 1
    WHEN 'missing' THEN 2
    WHEN 'unreviewed' THEN 3
    ELSE 4
  END,
  p.sport,
  p.rating DESC NULLS LAST,
  p.name;

