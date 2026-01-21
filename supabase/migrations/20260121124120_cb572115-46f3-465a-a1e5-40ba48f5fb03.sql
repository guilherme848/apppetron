-- Add sort_order column to content_posts for drag-and-drop ordering
ALTER TABLE public.content_posts 
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_content_posts_sort_order ON public.content_posts(batch_id, sort_order);

-- Initialize sort_order for existing posts based on created_at
WITH ranked AS (
  SELECT id, batch_id, ROW_NUMBER() OVER (PARTITION BY batch_id ORDER BY created_at) - 1 as new_order
  FROM public.content_posts
)
UPDATE public.content_posts 
SET sort_order = ranked.new_order
FROM ranked
WHERE public.content_posts.id = ranked.id;