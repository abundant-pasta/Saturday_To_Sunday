-- Add verified flag to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_image_verified BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering in the audit tool
CREATE INDEX IF NOT EXISTS idx_players_image_verified ON players(is_image_verified);
CREATE INDEX IF NOT EXISTS idx_players_sport ON players(sport);
