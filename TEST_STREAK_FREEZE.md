# Test Streak Freeze Modal

## Step 1: Run This SQL in Supabase

Go to Supabase Dashboard → SQL Editor and run this:

```sql
-- Set your last_played_football_at to 25 hours ago
-- This will trigger the streak freeze modal when you visit /daily

UPDATE profiles
SET last_played_football_at = NOW() - INTERVAL '25 hours'
WHERE id = 'c1dd16ee-dbb7-4209-ac93-831a3d041bf4';

-- Verify it worked:
SELECT 
  last_played_football_at,
  football_freezes_used,
  streak_football
FROM profiles
WHERE id = 'c1dd16ee-dbb7-4209-ac93-831a3d041bf4';
```

## Step 2: Visit the Daily Game

Navigate to: http://localhost:3000/daily

**Expected Result:**
- 🎯 A modal should appear saying "Your Football Streak is impressive!"
- It will show your 40-day streak
- Two buttons: "Watch Ad & Save Streak" and "Skip"

## Step 3: Test the Flow

**Option A: Watch Ad (Test Mode)**
1. Click "Watch Ad & Save Streak"
2. In test mode, GPT will load but may not show a real ad
3. To simulate reward granted, open browser console and run:
   ```javascript
   googletag.pubads().dispatchEvent(new CustomEvent('rewardedSlotGranted'))
   ```
4. The modal should close
5. Your streak should remain at 40

**Option B: Skip**
1. Click "Skip (Streak will reset to 0)"
2. Modal closes
3. Play the game normally
4. After finishing, your streak will reset to 0

## To Reset for Another Test

```sql
-- Reset your timestamp to now
UPDATE profiles
SET 
  last_played_football_at = NOW(),
  football_freezes_used = 0
WHERE id = 'c1dd16ee-dbb7-4209-ac93-831a3d041bf4';
```

## Test Basketball Mode

```sql
-- Set basketball to 25 hours ago
UPDATE profiles
SET last_played_basketball_at = NOW() - INTERVAL '25 hours'
WHERE id = 'c1dd16ee-dbb7-4209-ac93-831a3d041bf4';
```

Then visit: http://localhost:3000/daily/basketball
