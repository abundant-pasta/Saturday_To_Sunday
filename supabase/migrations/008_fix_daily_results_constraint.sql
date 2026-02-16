-- Fix Daily Results Constraints
-- Description: Update unique constraints to include 'sport' so users/guests can play both sports on the same day.

-- 1. Ensure 'sport' column exists (it should, but safety first)
ALTER TABLE daily_results ADD COLUMN IF NOT EXISTS sport TEXT DEFAULT 'football';

-- 2. Drop old constraints if they exist (these might be preventing multi-sport play)
-- We use DO blocks to avoid errors if they don't exist, though DROP CONSTRAINT IF EXISTS is usually fine.
-- Common old names might be: daily_results_user_id_game_date_key, daily_results_guest_id_game_date_key

ALTER TABLE daily_results DROP CONSTRAINT IF EXISTS daily_results_user_id_game_date_key;
ALTER TABLE daily_results DROP CONSTRAINT IF EXISTS daily_results_guest_id_game_date_key;

-- 3. Create new unique indexes that include 'sport'
-- For Users
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_results_user_date_sport 
ON daily_results (user_id, game_date, sport) 
WHERE user_id IS NOT NULL;

-- For Guests
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_results_guest_date_sport 
ON daily_results (guest_id, game_date, sport) 
WHERE guest_id IS NOT NULL;

-- 4. Add comment
COMMENT ON INDEX idx_daily_results_user_date_sport IS 'Ensures users can save one result per sport per day';
COMMENT ON INDEX idx_daily_results_guest_date_sport IS 'Ensures guests can save one result per sport per day';
