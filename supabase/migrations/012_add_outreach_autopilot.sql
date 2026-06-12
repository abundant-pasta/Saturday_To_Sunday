CREATE TABLE IF NOT EXISTS public.outreach_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  theme_key text NULL,
  school text NULL,
  sport text NULL,
  base_path text NOT NULL,
  utm_campaign text NOT NULL,
  default_subject text NOT NULL,
  default_pitch text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outreach_campaigns_status_check CHECK (status IN ('active', 'paused', 'archived'))
);

CREATE TABLE IF NOT EXISTS public.outreach_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  platform text NOT NULL,
  display_name text NOT NULL,
  url text NOT NULL,
  email text NULL,
  contact_url text NULL,
  school text NULL,
  sport text NULL,
  target_type text NOT NULL,
  fit_score int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'discovered',
  last_checked_at timestamptz NULL,
  next_action_at timestamptz NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outreach_targets_status_check CHECK (status IN ('discovered', 'enriched', 'drafted', 'approved', 'sent', 'skipped', 'opted_out', 'failed', 'opted_in')),
  CONSTRAINT outreach_targets_type_check CHECK (target_type IN ('podcast', 'newsletter', 'fan_site', 'alumni_page', 'creator', 'generic_contact'))
);

CREATE TABLE IF NOT EXISTS public.outreach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.outreach_campaigns(id) ON DELETE SET NULL,
  target_id uuid REFERENCES public.outreach_targets(id) ON DELETE SET NULL,
  channel text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  campaign_url text NOT NULL,
  status text NOT NULL DEFAULT 'drafted',
  approved_at timestamptz NULL,
  sent_at timestamptz NULL,
  followup_after timestamptz NULL,
  error text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outreach_messages_channel_check CHECK (channel IN ('email', 'contact_form', 'copy_only')),
  CONSTRAINT outreach_messages_status_check CHECK (status IN ('drafted', 'approved', 'sent', 'skipped', 'failed'))
);

CREATE TABLE IF NOT EXISTS public.outreach_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.outreach_campaigns(id) ON DELETE SET NULL,
  target_id uuid REFERENCES public.outreach_targets(id) ON DELETE SET NULL,
  message_id uuid REFERENCES public.outreach_messages(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outreach_events_name_check CHECK (event_name IN ('discovered', 'enriched', 'drafted', 'approved', 'sent', 'skipped', 'failed', 'opted_out', 'reply_logged', 'regenerated'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_targets_url_unique
  ON public.outreach_targets(url);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_targets_email_unique
  ON public.outreach_targets(lower(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_outreach_messages_campaign_target_unique
  ON public.outreach_messages(campaign_id, target_id)
  WHERE campaign_id IS NOT NULL AND target_id IS NOT NULL AND status <> 'skipped';

CREATE INDEX IF NOT EXISTS idx_outreach_campaigns_status
  ON public.outreach_campaigns(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outreach_targets_status
  ON public.outreach_targets(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outreach_targets_school
  ON public.outreach_targets(school)
  WHERE school IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outreach_targets_platform
  ON public.outreach_targets(platform);

CREATE INDEX IF NOT EXISTS idx_outreach_targets_fit_score
  ON public.outreach_targets(fit_score DESC);

CREATE INDEX IF NOT EXISTS idx_outreach_targets_next_action
  ON public.outreach_targets(next_action_at)
  WHERE next_action_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outreach_messages_status
  ON public.outreach_messages(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outreach_messages_sent
  ON public.outreach_messages(sent_at DESC)
  WHERE sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outreach_events_created
  ON public.outreach_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outreach_events_name_created
  ON public.outreach_events(event_name, created_at DESC);

ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.outreach_campaigns FROM anon, authenticated;
REVOKE ALL ON public.outreach_targets FROM anon, authenticated;
REVOKE ALL ON public.outreach_messages FROM anon, authenticated;
REVOKE ALL ON public.outreach_events FROM anon, authenticated;

COMMENT ON TABLE public.outreach_campaigns IS 'Admin-managed outreach campaigns for school/theme acquisition links.';
COMMENT ON TABLE public.outreach_targets IS 'Discovered outreach targets from public sources; cold outbound remains approval-gated.';
COMMENT ON TABLE public.outreach_messages IS 'Approval-gated outreach drafts and send records.';
COMMENT ON TABLE public.outreach_events IS 'Append-only audit log for outreach workflow actions.';
