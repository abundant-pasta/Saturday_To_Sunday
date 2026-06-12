CREATE TABLE IF NOT EXISTS public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  handle text NOT NULL,
  status text NOT NULL DEFAULT 'needs_setup',
  publish_capability text NOT NULL DEFAULT 'copy_export',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_accounts_platform_check CHECK (platform IN ('x', 'tiktok', 'instagram', 'youtube')),
  CONSTRAINT social_accounts_status_check CHECK (status IN ('planned', 'needs_setup', 'connected', 'disabled')),
  CONSTRAINT social_accounts_publish_capability_check CHECK (publish_capability IN ('direct', 'copy_export', 'disabled'))
);

CREATE TABLE IF NOT EXISTS public.social_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  theme_key text NULL,
  school text NULL,
  sport text NULL,
  default_path text NOT NULL DEFAULT '/daily',
  utm_campaign text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_campaigns_status_check CHECK (status IN ('active', 'paused', 'archived')),
  CONSTRAINT social_campaigns_sport_check CHECK (sport IS NULL OR sport IN ('football', 'basketball', 'both'))
);

CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.social_campaigns(id) ON DELETE SET NULL,
  platform text NOT NULL,
  post_type text NOT NULL,
  caption text NOT NULL,
  asset_url text NULL,
  campaign_url text NOT NULL,
  short_script text NULL,
  scheduled_at timestamptz NULL,
  status text NOT NULL DEFAULT 'drafted',
  approved_at timestamptz NULL,
  published_at timestamptz NULL,
  external_post_id text NULL,
  error text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_posts_platform_check CHECK (platform IN ('x', 'tiktok', 'instagram', 'youtube')),
  CONSTRAINT social_posts_type_check CHECK (post_type IN ('guess_college', 'score_to_beat', 'school_spotlight', 'survival_promo')),
  CONSTRAINT social_posts_status_check CHECK (status IN ('drafted', 'approved', 'scheduled', 'posted', 'failed', 'skipped', 'copied'))
);

CREATE TABLE IF NOT EXISTS public.social_post_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.social_campaigns(id) ON DELETE SET NULL,
  post_id uuid REFERENCES public.social_posts(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT social_post_events_name_check CHECK (event_name IN ('drafted', 'approved', 'posted', 'failed', 'copied', 'skipped', 'metric_refresh', 'scheduled', 'regenerated', 'manual_posted'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_accounts_platform_handle_unique
  ON public.social_accounts(platform, lower(handle));

CREATE UNIQUE INDEX IF NOT EXISTS idx_social_posts_daily_unique
  ON public.social_posts(campaign_id, platform, post_type, ((metadata->>'draft_date')))
  WHERE campaign_id IS NOT NULL AND status <> 'skipped' AND metadata ? 'draft_date';

CREATE INDEX IF NOT EXISTS idx_social_accounts_status
  ON public.social_accounts(status, platform);

CREATE INDEX IF NOT EXISTS idx_social_campaigns_status
  ON public.social_campaigns(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_campaigns_key
  ON public.social_campaigns(key);

CREATE INDEX IF NOT EXISTS idx_social_posts_status
  ON public.social_posts(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_posts_platform_status
  ON public.social_posts(platform, status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_social_posts_campaign
  ON public.social_posts(campaign_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_post_events_post_created
  ON public.social_post_events(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_social_post_events_name_created
  ON public.social_post_events(event_name, created_at DESC);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.social_accounts FROM anon, authenticated;
REVOKE ALL ON public.social_campaigns FROM anon, authenticated;
REVOKE ALL ON public.social_posts FROM anon, authenticated;
REVOKE ALL ON public.social_post_events FROM anon, authenticated;

INSERT INTO public.social_accounts (platform, handle, status, publish_capability, metadata)
VALUES
  ('x', '@plays2s', 'needs_setup', 'direct', '{"fallback_handles":["@PlayS2S","@PlaySatToSun","@SaturdayToSundayGame"]}'::jsonb),
  ('tiktok', '@plays2s', 'needs_setup', 'copy_export', '{"fallback_handles":["@PlayS2S","@PlaySatToSun","@SaturdayToSundayGame"]}'::jsonb),
  ('instagram', '@plays2s', 'needs_setup', 'copy_export', '{"fallback_handles":["@PlayS2S","@PlaySatToSun","@SaturdayToSundayGame"]}'::jsonb),
  ('youtube', '@plays2s', 'needs_setup', 'copy_export', '{"fallback_handles":["@PlayS2S","@PlaySatToSun","@SaturdayToSundayGame"]}'::jsonb)
ON CONFLICT (platform, lower(handle)) DO UPDATE
SET
  publish_capability = EXCLUDED.publish_capability,
  metadata = public.social_accounts.metadata || EXCLUDED.metadata,
  updated_at = now();

COMMENT ON TABLE public.social_accounts IS 'Admin-managed brand account setup and publish capability for Social Autopilot.';
COMMENT ON TABLE public.social_campaigns IS 'Theme and school campaigns used to generate social links with UTM attribution.';
COMMENT ON TABLE public.social_posts IS 'Approval-gated social draft, schedule, publish, and copy/export records.';
COMMENT ON TABLE public.social_post_events IS 'Append-only audit log for Social Autopilot workflow actions.';
