-- Keep one open/reviewing image report per player and game mode.
-- Duplicate rows are retained for history, but ignored so the admin queue stays work-oriented.

WITH ranked_reports AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        coalesce('id:' || player_id::text, 'name:' || lower(trim(player_name))),
        lower(trim(sport)),
        game_mode
      ORDER BY created_at ASC, id ASC
    ) AS report_rank
  FROM public.image_audit_reports
  WHERE status IN ('open', 'reviewing')
)
UPDATE public.image_audit_reports AS reports
SET
  status = 'ignored',
  updated_at = now(),
  metadata = reports.metadata || jsonb_build_object(
    'dedupe_status', 'ignored_duplicate',
    'deduped_at', now()
  )
FROM ranked_reports
WHERE reports.id = ranked_reports.id
  AND ranked_reports.report_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_image_audit_reports_unique_open_player_mode
  ON public.image_audit_reports (
    player_id,
    lower(trim(sport)),
    game_mode
  )
  WHERE status IN ('open', 'reviewing')
    AND player_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_image_audit_reports_unique_open_name_mode
  ON public.image_audit_reports (
    lower(trim(player_name)),
    lower(trim(sport)),
    game_mode
  )
  WHERE status IN ('open', 'reviewing')
    AND player_id IS NULL;
