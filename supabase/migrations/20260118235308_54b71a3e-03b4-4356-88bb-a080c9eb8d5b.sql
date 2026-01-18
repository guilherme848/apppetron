-- Create storage bucket for content production files
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-production', 'content-production', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket
CREATE POLICY "Allow public read access to content-production"
ON storage.objects FOR SELECT
USING (bucket_id = 'content-production');

CREATE POLICY "Allow insert to content-production"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'content-production');

CREATE POLICY "Allow update to content-production"
ON storage.objects FOR UPDATE
USING (bucket_id = 'content-production');

CREATE POLICY "Allow delete from content-production"
ON storage.objects FOR DELETE
USING (bucket_id = 'content-production');

-- Create table to track batch attachments
CREATE TABLE public.batch_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.content_batches(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to track post attachments  
CREATE TABLE public.post_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.content_posts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.batch_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for attachments
CREATE POLICY "Allow all access to batch_attachments"
ON public.batch_attachments FOR ALL
USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to post_attachments"
ON public.post_attachments FOR ALL
USING (true) WITH CHECK (true);

-- Add archived flag to batches
ALTER TABLE public.content_batches 
ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;