-- Migration: Refactor Streak Freeze to Proactive Purchase
-- Changes freeze tracking from "used" to "available"
-- Run this in Supabase SQL Editor

-- Step 1: Rename columns from _used to _available
ALTER TABLE profiles
RENAME COLUMN football_freezes_used TO football_freezes_available;

ALTER TABLE profiles
RENAME COLUMN basketball_freezes_used TO basketball_freezes_available;

-- Step 2: Drop old constraints
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS football_freezes_used_check;

ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS basketball_freezes_used_check;

-- Step 3: Add new constraints (still 0 or 1, but now represents available count)
ALTER TABLE profiles
ADD CONSTRAINT football_freezes_available_check 
  CHECK (football_freezes_available >= 0 AND football_freezes_available <= 1);

ALTER TABLE profiles
ADD CONSTRAINT basketball_freezes_available_check 
  CHECK (basketball_freezes_available >= 0 AND basketball_freezes_available <= 1);

-- Step 4: Reset all freeze counts to 0 (fresh start with new system)
UPDATE profiles
SET 
  football_freezes_available = 0,
  basketball_freezes_available = 0,
  freeze_week_start = NULL;

-- Step 5: Update column comments
COMMENT ON COLUMN profiles.football_freezes_available IS 'Number of streak freezes available for football (max 1, earned by watching ads)';
COMMENT ON COLUMN profiles.basketball_freezes_available IS 'Number of streak freezes available for basketball (max 1, earned by watching ads)';

-- Verification: Check the schema
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name LIKE '%freeze%';
