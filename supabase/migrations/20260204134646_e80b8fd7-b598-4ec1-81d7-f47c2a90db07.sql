-- Add is_legacy column to services table
ALTER TABLE public.services 
ADD COLUMN is_legacy boolean NOT NULL DEFAULT false;