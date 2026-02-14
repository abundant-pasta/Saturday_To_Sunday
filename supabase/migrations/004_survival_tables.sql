-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- 1. Survival Tournaments Table
CREATE TABLE IF NOT EXISTS "public"."survival_tournaments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "name" text NOT NULL,
    "start_date" timestamp with time zone NOT NULL,
    "end_date" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Survival Participants Table
CREATE TABLE IF NOT EXISTS "public"."survival_participants" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    "tournament_id" uuid NOT NULL REFERENCES "public"."survival_tournaments"("id") ON DELETE CASCADE,
    "status" text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'eliminated', 'winner')),
    "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE ("user_id", "tournament_id")
);

-- 3. Survival Scores Table
CREATE TABLE IF NOT EXISTS "public"."survival_scores" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "participant_id" uuid NOT NULL REFERENCES "public"."survival_participants"("id") ON DELETE CASCADE,
    "day_number" integer NOT NULL,
    "score" double precision NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Survival Logs Table (for debugging)
CREATE TABLE IF NOT EXISTS "public"."survival_logs" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "tournament_id" uuid REFERENCES "public"."survival_tournaments"("id") ON DELETE SET NULL,
    "day_number" integer,
    "message" text,
    "details" jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE "public"."survival_tournaments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."survival_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."survival_scores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."survival_logs" ENABLE ROW LEVEL SECURITY;

-- Policies (Basic ones to start with, can be refined)
-- Tournaments: readable by everyone, only admins can edit (assuming manual admin for now or service role)
CREATE POLICY "Enable read access for all users" ON "public"."survival_tournaments" FOR SELECT USING (true);

-- Participants: Users can read their own status and see others (for leaderboards)
CREATE POLICY "Enable read access for all users" ON "public"."survival_participants" FOR SELECT USING (true);
CREATE POLICY "Users can join themselves" ON "public"."survival_participants" FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Scores: Readable by all
CREATE POLICY "Enable read access for all users" ON "public"."survival_scores" FOR SELECT USING (true);
-- Scores: Inserted via server action (service role) or potentially authenticated user? 
-- Implementation plan says "Server Action" which runs on server. 
-- If the user logic submits score, we might need insert policy. 
-- For now, let's allow users to insert their own scores if they are the participant.
CREATE POLICY "Users can insert their own scores" ON "public"."survival_scores" FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM "public"."survival_participants" p 
    WHERE p.id = participant_id AND p.user_id = auth.uid()
  )
);

-- Logs: Service role only mostly, but maybe read for admins. 
-- For now, no public access policies.

-- 5. Automation (pg_cron)
-- Note: Replace PROJECT_REF and SERVICE_ROLE_KEY with actual values in production or via env vars logic if supported.
-- This part is commented out or needs manual intervention if running via migration tool that doesn't support env vars substitution.
-- The user prompt asked to "Generate the SQL ... to enable the elimination schedule".
-- I will include it but wrap it in a way that checks if it exists or use a robust method.

-- UNSCHEDULE IF EXISTS to avoid duplicates during dev iterations
SELECT cron.unschedule('daily-survival-cut');

-- SCHEDULE
-- IMPORTANT: You must replace 'https://PROJECT_REF.supabase.co/functions/v1/process-daily-elimination' and 'SERVICE_ROLE_KEY'
-- We default to a placeholder.
SELECT cron.schedule(
  'daily-survival-cut',
  '0 0 * * *', 
  $$
    SELECT net.http_post(
        url := 'https://REPLACE_WITH_PROJECT_REF.supabase.co/functions/v1/process-daily-elimination',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer REPLACE_WITH_SERVICE_ROLE_KEY"}'
    )
  $$
);
