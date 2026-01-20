-- Add completed_at and started_at columns to content_posts for tracking lifecycle
ALTER TABLE public.content_posts 
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone DEFAULT NULL;