-- Create enum for content scope
CREATE TYPE public.content_scope AS ENUM ('client', 'agency');

-- Add scope column to content_batches with default 'client'
ALTER TABLE public.content_batches
ADD COLUMN scope public.content_scope NOT NULL DEFAULT 'client';

-- Add constraint: if scope='client' then client_id must NOT be null
-- if scope='agency' then client_id must be NULL
ALTER TABLE public.content_batches
ADD CONSTRAINT content_batches_scope_client_check 
CHECK (
  (scope = 'client' AND client_id IS NOT NULL) OR 
  (scope = 'agency' AND client_id IS NULL)
);

-- Create indexes for performance
CREATE INDEX idx_content_batches_scope_status ON public.content_batches(scope, status);
CREATE INDEX idx_content_batches_archived_scope ON public.content_batches(archived, scope);

-- Update RLS policies to properly isolate agency content
-- First drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all access to content_batches" ON public.content_batches;

-- Policy for viewing content batches
-- Agency staff can see all client and agency content
-- This assumes all authenticated users are agency staff (internal ERP)
CREATE POLICY "Agency staff can view all content batches"
ON public.content_batches
FOR SELECT
TO authenticated
USING (true);

-- Policy for inserting content batches
CREATE POLICY "Agency staff can create content batches"
ON public.content_batches
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for updating content batches
CREATE POLICY "Agency staff can update content batches"
ON public.content_batches
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy for deleting content batches
CREATE POLICY "Agency staff can delete content batches"
ON public.content_batches
FOR DELETE
TO authenticated
USING (true);

-- Add comment for documentation
COMMENT ON COLUMN public.content_batches.scope IS 'Content scope: client for customer content, agency for internal marketing';
