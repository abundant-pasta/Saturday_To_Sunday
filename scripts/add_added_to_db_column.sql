-- Add 'added_to_db' timestamp column to players table
-- This column will track when each player was added to the database

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS added_to_db TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index on added_to_db for efficient queries
CREATE INDEX IF NOT EXISTS idx_players_added_to_db ON players(added_to_db);

-- Comment on column
COMMENT ON COLUMN players.added_to_db IS 'Timestamp when this player was added to the database';
