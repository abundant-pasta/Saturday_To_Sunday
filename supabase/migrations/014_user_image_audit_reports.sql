-- User-submitted image audit reports from completed games.

CREATE TABLE IF NOT EXISTS public.image_audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id bigint NULL REFERENCES public.players(id) ON DELETE SET NULL,
  reporter_user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_id text NULL,
  game_date date NULL,
  sport text NOT NULL,
  game_mode text NOT NULL DEFAULT 'daily',
  player_name text NOT NULL,
  image_url text NULL,
  issue_type text NOT NULL,
  notes text NULL,
  status text NOT NULL DEFAULT 'open',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  ALTER TABLE public.image_audit_reports
    ADD CONSTRAINT image_audit_reports_issue_type_check
    CHECK (issue_type IN ('wrong_person', 'college_spoiler', 'broken_image', 'other'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.image_audit_reports
    ADD CONSTRAINT image_audit_reports_status_check
    CHECK (status IN ('open', 'reviewing', 'fixed', 'ignored'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.image_audit_reports
    ADD CONSTRAINT image_audit_reports_game_mode_check
    CHECK (game_mode IN ('daily', 'survival'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_image_audit_reports_status_created_at
  ON public.image_audit_reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_audit_reports_player_id
  ON public.image_audit_reports(player_id);

CREATE INDEX IF NOT EXISTS idx_image_audit_reports_reporter_user_id
  ON public.image_audit_reports(reporter_user_id);

CREATE INDEX IF NOT EXISTS idx_image_audit_reports_sport
  ON public.image_audit_reports(sport);

CREATE INDEX IF NOT EXISTS idx_image_audit_reports_game_date
  ON public.image_audit_reports(game_date DESC);

ALTER TABLE public.image_audit_reports ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.image_audit_reports IS 'Player-submitted reports for wrong, spoiler, or broken game images. Admin-reviewed before changing players.';
