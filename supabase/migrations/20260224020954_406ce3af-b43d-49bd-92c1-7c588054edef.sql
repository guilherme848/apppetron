
-- Add is_drawer column to content_posts for "gaveta" posts
ALTER TABLE public.content_posts ADD COLUMN is_drawer BOOLEAN NOT NULL DEFAULT false;

-- Index for efficient filtering of drawer posts
CREATE INDEX idx_content_posts_is_drawer ON public.content_posts (is_drawer) WHERE is_drawer = true;
