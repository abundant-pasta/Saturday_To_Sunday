ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS favorite_teams TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS favorite_schools TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS favorite_conferences TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_sport TEXT;

ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_preferred_sport_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_preferred_sport_check
CHECK (preferred_sport IS NULL OR preferred_sport IN ('football', 'basketball'));

COMMENT ON COLUMN profiles.favorite_teams IS 'Up to 3 favorite pro teams for personalized challenge copy';
COMMENT ON COLUMN profiles.favorite_schools IS 'Up to 3 favorite schools for alumni challenge personalization';
COMMENT ON COLUMN profiles.favorite_conferences IS 'Up to 3 favorite conferences for themed challenge personalization';
COMMENT ON COLUMN profiles.preferred_sport IS 'Preferred daily sport for challenge prompts and push copy';
