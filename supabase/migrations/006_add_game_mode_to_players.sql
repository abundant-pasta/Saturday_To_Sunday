-- Add game_eligibility column to players table
ALTER TABLE "players" 
ADD COLUMN IF NOT EXISTS "game_mode" text NOT NULL DEFAULT 'daily' 
CHECK (game_mode IN ('daily', 'survival', 'both'));

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS "idx_players_game_mode" ON "players" ("game_mode");
