-- Add archived column to content_posts
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Mark all orphan posts (no batch_id) as archived
UPDATE content_posts SET archived = true WHERE batch_id IS NULL;