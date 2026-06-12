CREATE TABLE IF NOT EXISTS public.growth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_id text,
  event_name text NOT NULL,
  sport text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_events_created_at
  ON public.growth_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_growth_events_event_created
  ON public.growth_events(event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_growth_events_user_created
  ON public.growth_events(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_growth_events_guest_created
  ON public.growth_events(guest_id, created_at DESC)
  WHERE guest_id IS NOT NULL;

ALTER TABLE public.growth_events ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.growth_events TO authenticated;

CREATE POLICY "Users can read their own growth events"
  ON public.growth_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.growth_events IS 'Append-only growth and retention funnel events written by the app server.';
COMMENT ON COLUMN public.growth_events.metadata IS 'Low-cardinality event context. Do not store secrets or sensitive user data.';
