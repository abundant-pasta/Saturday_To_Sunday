ALTER TABLE public.daily_games
  ADD COLUMN IF NOT EXISTS theme_key text,
  ADD COLUMN IF NOT EXISTS theme_name text,
  ADD COLUMN IF NOT EXISTS theme_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.survival_tournaments
  ADD COLUMN IF NOT EXISTS theme_key text,
  ADD COLUMN IF NOT EXISTS theme_name text,
  ADD COLUMN IF NOT EXISTS theme_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_daily_games_theme_key
  ON public.daily_games(theme_key)
  WHERE theme_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_survival_tournaments_theme_key
  ON public.survival_tournaments(theme_key)
  WHERE theme_key IS NOT NULL;

COMMENT ON COLUMN public.daily_games.theme_key IS 'Growth programming theme key used for campaign copy and reporting.';
COMMENT ON COLUMN public.daily_games.theme_metadata IS 'Small JSON payload for weekly growth programming prompts, school lists, and CTAs.';
COMMENT ON COLUMN public.survival_tournaments.theme_key IS 'Growth programming theme key used for weekly Survival promotion.';
COMMENT ON COLUMN public.survival_tournaments.theme_metadata IS 'Small JSON payload for weekly Survival programming prompts, school lists, and CTAs.';
