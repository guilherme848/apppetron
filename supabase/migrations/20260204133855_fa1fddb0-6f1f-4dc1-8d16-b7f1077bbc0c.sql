-- Add content and traffic flags to services table
ALTER TABLE public.services 
ADD COLUMN has_content boolean NOT NULL DEFAULT true,
ADD COLUMN has_traffic boolean NOT NULL DEFAULT true;

-- Update existing services: if no traffic_routine_id, assume content-only (legacy)
UPDATE public.services 
SET has_traffic = false 
WHERE traffic_routine_id IS NULL;