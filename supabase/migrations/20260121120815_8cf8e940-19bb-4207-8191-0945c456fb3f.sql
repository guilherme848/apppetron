-- Add new columns for rich content to content_posts
ALTER TABLE public.content_posts 
ADD COLUMN IF NOT EXISTS briefing_title text,
ADD COLUMN IF NOT EXISTS briefing_rich text,
ADD COLUMN IF NOT EXISTS changes_title text,
ADD COLUMN IF NOT EXISTS changes_rich text;

-- Migrate existing briefing data to briefing_rich if not already migrated
UPDATE public.content_posts 
SET briefing_rich = briefing 
WHERE briefing IS NOT NULL 
  AND briefing != '' 
  AND (briefing_rich IS NULL OR briefing_rich = '');

-- Create content_post_files table for attachments
CREATE TABLE IF NOT EXISTS public.content_post_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.content_posts(id) ON DELETE CASCADE,
  context text NOT NULL CHECK (context IN ('briefing', 'changes')),
  file_name text NOT NULL,
  file_type text,
  file_size integer,
  storage_path text NOT NULL,
  public_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on content_post_files
ALTER TABLE public.content_post_files ENABLE ROW LEVEL SECURITY;

-- Create policy for content_post_files
CREATE POLICY "Allow all access to content_post_files" 
ON public.content_post_files 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_content_post_files_post_id ON public.content_post_files(post_id);
CREATE INDEX IF NOT EXISTS idx_content_post_files_context ON public.content_post_files(context);