-- Player trust and leaderboard recovery sprint.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS accepted_colleges text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS college_answer_note text,
  ADD COLUMN IF NOT EXISTS image_status text NOT NULL DEFAULT 'unreviewed',
  ADD COLUMN IF NOT EXISTS image_context text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS image_notes text;

DO $$
BEGIN
  ALTER TABLE public.players
    ADD CONSTRAINT players_image_status_check
    CHECK (image_status IN ('unreviewed', 'approved', 'spoiler', 'wrong_person', 'missing'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.players
    ADD CONSTRAINT players_image_context_check
    CHECK (image_context IN ('unknown', 'pro', 'college', 'headshot'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

UPDATE public.players
SET image_status = CASE WHEN coalesce(is_image_verified, false) THEN 'approved' ELSE image_status END,
    image_context = CASE WHEN coalesce(is_image_verified, false) THEN 'pro' ELSE image_context END
WHERE coalesce(is_image_verified, false);

UPDATE public.players
SET college = 'Arkansas',
    accepted_colleges = ARRAY['Florida'],
    college_answer_note = 'Transfer case: Arkansas is the canonical final school, Florida is also accepted.'
WHERE lower(name) = 'feleipe franks'
  AND sport = 'football';

WITH football_survival_pool AS (
  SELECT id
  FROM public.players
  WHERE sport = 'football'
    AND tier IN (1, 2, 3)
    AND coalesce(rating, 0) >= 80
    AND image_url IS NOT NULL
  ORDER BY rating DESC, name ASC
  LIMIT 300
)
UPDATE public.players p
SET game_mode = 'both'
FROM football_survival_pool pool
WHERE p.id = pool.id
  AND p.game_mode = 'daily';

CREATE INDEX IF NOT EXISTS idx_players_accepted_colleges ON public.players USING gin (accepted_colleges);
CREATE INDEX IF NOT EXISTS idx_players_image_status ON public.players(image_status);
CREATE INDEX IF NOT EXISTS idx_players_sport_mode_tier_rating
  ON public.players(sport, game_mode, tier, rating DESC)
  WHERE image_url IS NOT NULL;

ALTER TABLE public.survival_tournaments
  ADD COLUMN IF NOT EXISTS sport_mode text NOT NULL DEFAULT 'basketball';

DO $$
BEGIN
  ALTER TABLE public.survival_tournaments
    ADD CONSTRAINT survival_tournaments_sport_mode_check
    CHECK (sport_mode IN ('basketball', 'football', 'mixed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_survival_tournaments_sport_mode
  ON public.survival_tournaments(sport_mode);

CREATE OR REPLACE FUNCTION public.get_user_awards(p_user_id uuid)
RETURNS TABLE (
  football_daily_wins bigint,
  basketball_daily_wins bigint,
  football_podium_finishes bigint,
  basketball_podium_finishes bigint,
  football_top_10_finishes bigint,
  basketball_top_10_finishes bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      dr.user_id,
      dr.sport,
      dr.score,
      row_number() OVER (
        PARTITION BY dr.game_date, dr.sport
        ORDER BY dr.score DESC NULLS LAST, dr.created_at ASC NULLS LAST, dr.id ASC
      ) AS ordered_rank,
      max(dr.score) OVER (PARTITION BY dr.game_date, dr.sport) AS top_score
    FROM public.daily_results dr
    WHERE dr.user_id IS NOT NULL
      AND dr.sport IN ('football', 'basketball')
  )
  SELECT
    count(*) FILTER (WHERE sport = 'football' AND ordered_rank = 1 AND top_score > 0) AS football_daily_wins,
    count(*) FILTER (WHERE sport = 'basketball' AND ordered_rank = 1 AND top_score > 0) AS basketball_daily_wins,
    count(*) FILTER (WHERE sport = 'football' AND ordered_rank <= 3 AND top_score > 0) AS football_podium_finishes,
    count(*) FILTER (WHERE sport = 'basketball' AND ordered_rank <= 3 AND top_score > 0) AS basketball_podium_finishes,
    count(*) FILTER (WHERE sport = 'football' AND ordered_rank <= 10 AND top_score > 0) AS football_top_10_finishes,
    count(*) FILTER (WHERE sport = 'basketball' AND ordered_rank <= 10 AND top_score > 0) AS basketball_top_10_finishes
  FROM ranked
  WHERE user_id = p_user_id
    AND auth.uid() = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_all_time_leaderboard(
  p_sport text,
  p_squad_id uuid DEFAULT NULL,
  p_current_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  rank integer,
  user_id uuid,
  score bigint,
  games_played bigint,
  average_score numeric,
  username text,
  full_name text,
  avatar_url text,
  show_avatar boolean,
  streak_football integer,
  streak_basketball integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH totals AS (
    SELECT
      dr.user_id,
      sum(dr.score)::bigint AS score,
      count(*)::bigint AS games_played,
      round(avg(dr.score)::numeric, 1) AS average_score
    FROM public.daily_results dr
    WHERE dr.user_id IS NOT NULL
      AND dr.sport = p_sport
      AND (
        p_squad_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.squad_members sm
          WHERE sm.squad_id = p_squad_id
            AND sm.user_id = dr.user_id
        )
      )
    GROUP BY dr.user_id
  ),
  ranked AS (
    SELECT
      row_number() OVER (ORDER BY t.score DESC, t.average_score DESC, t.games_played DESC, t.user_id ASC)::integer AS rank,
      t.*
    FROM totals t
  )
  SELECT
    r.rank,
    r.user_id,
    r.score,
    r.games_played,
    r.average_score,
    p.username,
    p.full_name,
    p.avatar_url,
    p.show_avatar,
    p.streak_football,
    p.streak_basketball
  FROM ranked r
  JOIN public.profiles p ON p.id = r.user_id
  WHERE r.rank <= LEAST(GREATEST(coalesce(p_limit, 50), 1), 100)
    OR (p_current_user_id IS NOT NULL AND r.user_id = p_current_user_id)
  ORDER BY r.rank ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_awards(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_time_leaderboard(text, uuid, uuid, integer) TO anon, authenticated;
