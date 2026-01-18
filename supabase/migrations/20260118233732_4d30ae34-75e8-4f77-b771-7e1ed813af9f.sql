-- Add planning_due_date and delivery_date to content_batches
ALTER TABLE public.content_batches 
ADD COLUMN IF NOT EXISTS planning_due_date date,
ADD COLUMN IF NOT EXISTS delivery_date date;

-- Add briefing and caption to content_posts
ALTER TABLE public.content_posts 
ADD COLUMN IF NOT EXISTS briefing text,
ADD COLUMN IF NOT EXISTS caption text;

-- Migrate existing due_date from posts to batch planning_due_date (optional migration)
-- This updates batches that don't have planning_due_date with the minimum due_date from their posts
UPDATE public.content_batches b
SET planning_due_date = (
  SELECT MIN(p.due_date) 
  FROM public.content_posts p 
  WHERE p.batch_id = b.id AND p.due_date IS NOT NULL
)
WHERE b.planning_due_date IS NULL;