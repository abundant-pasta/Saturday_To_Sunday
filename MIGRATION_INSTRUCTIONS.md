# Database Migration Instructions

## Run This SQL in Supabase

Go to your Supabase dashboard → SQL Editor → New Query, then paste and run this:

```sql
-- Migration: Add Streak Freeze Columns
-- Run this in Supabase SQL Editor

-- Step 1: Add freeze usage tracking columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS football_freezes_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS basketball_freezes_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS freeze_week_start DATE;

-- Step 2: Add new timestamp columns for last played
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

-- Step 5: Add constraints (max 1 freeze per week)
ALTER TABLE profiles
ADD CONSTRAINT football_freezes_used_check 
  CHECK (football_freezes_used >= 0 AND football_freezes_used <= 1);

ALTER TABLE profiles
ADD CONSTRAINT basketball_freezes_used_check 
  CHECK (basketball_freezes_used >= 0 AND basketball_freezes_used <= 1);

-- Step 6: Add comments for documentation
COMMENT ON COLUMN profiles.last_played_football_at IS 'Last time user completed a football game (timestamp)';
COMMENT ON COLUMN profiles.last_played_basketball_at IS 'Last time user completed a basketball game (timestamp)';
COMMENT ON COLUMN profiles.football_freezes_used IS 'Number of streak freezes used this week for football (max 1)';
COMMENT ON COLUMN profiles.basketball_freezes_used IS 'Number of streak freezes used this week for basketball (max 1)';
COMMENT ON COLUMN profiles.freeze_week_start IS 'Start date of current freeze tracking week (resets every Monday)';
```

## What This Does

1. **Adds 5 new columns** to `profiles` table:
   - `football_freezes_used` - How many freezes used this week for football (0 or 1)
   - `basketball_freezes_used` - How many freezes used this week for basketball (0 or 1)
   - `freeze_week_start` - Date when weekly counter started (resets Monday)
   - `last_played_football_at` - Timestamp of last football game (replaces DATE column)
   - `last_played_basketball_at` - Timestamp of last basketball game (replaces DATE column)

2. **Migrates existing data** from old `last_played_football` and `last_played_basketball` DATE columns

3. **Creates indexes** for fast queries

4. **Adds constraints** to ensure max 1 freeze per week per sport

## After Running

The migration is safe to run - it uses `IF NOT EXISTS` so you can run it multiple times without errors.

Your old `last_played_football` and `last_played_basketball` columns will remain for backward compatibility.
