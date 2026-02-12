-- Migration: Add Streak Freeze Columns
-- Description: Add columns to track streak freeze usage and convert last_played columns to timestamps
-- Author: Antigravity AI
-- Date: 2026-02-12

-- Step 1: Add freeze usage tracking columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS football_freezes_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS basketball_freezes_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS freeze_week_start DATE;

-- Step 2: Add new timestamp columns for last played (we'll migrate data, then drop old date columns)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_played_football_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_played_basketball_at TIMESTAMP WITH TIME ZONE;

-- Step 3: Migrate existing date data to timestamp columns
-- Convert DATE to TIMESTAMP at midnight UTC
UPDATE profiles
SET last_played_football_at = last_played_football::timestamp
WHERE last_played_football IS NOT NULL;

UPDATE profiles
SET last_played_basketball_at = last_played_basketball::timestamp
WHERE last_played_basketball IS NOT NULL;

-- Step 4: Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_played_football_at 
  ON profiles(last_played_football_at);

CREATE INDEX IF NOT EXISTS idx_profiles_last_played_basketball_at 
  ON profiles(last_played_basketball_at);

CREATE INDEX IF NOT EXISTS idx_profiles_freeze_week_start
  ON profiles(freeze_week_start);

-- Step 5: Add constraints
ALTER TABLE profiles
ADD CONSTRAINT football_freezes_used_check CHECK (football_freezes_used >= 0 AND football_freezes_used <= 1);

ALTER TABLE profiles
ADD CONSTRAINT basketball_freezes_used_check CHECK (basketball_freezes_used >= 0 AND basketball_freezes_used <= 1);

-- Step 6: Add comments for documentation
COMMENT ON COLUMN profiles.last_played_football_at IS 'Last time user completed a football game (timestamp)';
COMMENT ON COLUMN profiles.last_played_basketball_at IS 'Last time user completed a basketball game (timestamp)';
COMMENT ON COLUMN profiles.football_freezes_used IS 'Number of streak freezes used this week for football (max 1)';
COMMENT ON COLUMN profiles.basketball_freezes_used IS 'Number of streak freezes used this week for basketball (max 1)';
COMMENT ON COLUMN profiles.freeze_week_start IS 'Start date of current freeze tracking week (resets every Monday)';

-- Note: We're keeping the old last_played_football and last_played_basketball DATE columns for backward compatibility
-- They can be dropped in a future migration after confirming everything works
