-- Enable the extensions first!
-- You might need to run this part in the 'Extensions' tab of Supabase dashboard if this SQL fails due to permissions, 
-- but usually the postgres user can do it.
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- Now schedule the job. 
-- Note: We explicitly use 'extensions.cron' just in case 'cron' isn't in your search_path.
SELECT extensions.cron.schedule(
  'daily-survival-cut',
  '0 0 * * *', 
  $$
    SELECT extensions.net.http_post(
        url := 'https://[YOUR_PROJECT_REF].supabase.functions.limitation/process-daily-elimination',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer [YOUR_SERVICE_ROLE_KEY]"}'
    )
  $$
);
