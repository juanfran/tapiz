-- Add Yjs CRDT support columns to boards table
ALTER TABLE boards ADD COLUMN IF NOT EXISTS board_yjs BYTEA;
ALTER TABLE boards ADD COLUMN IF NOT EXISTS use_yjs BOOLEAN NOT NULL DEFAULT false;

-- Index for quick lookup of Yjs-enabled boards
CREATE INDEX IF NOT EXISTS idx_boards_use_yjs ON boards (use_yjs) WHERE use_yjs = true;
