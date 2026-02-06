-- Drop the existing constraint that requires client_id to be NULL for agency scope
ALTER TABLE public.content_batches
DROP CONSTRAINT IF EXISTS content_batches_scope_client_check;

-- Create the internal Petron account for agency content
INSERT INTO public.accounts (id, name, status, niche)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Petron (Interno)',
  'active',
  'Marketing'
)
ON CONFLICT (id) DO NOTHING;

-- Add new constraint: client content requires client_id, agency content must use the internal Petron account
ALTER TABLE public.content_batches
ADD CONSTRAINT content_batches_scope_client_check 
CHECK (
  (scope = 'client' AND client_id IS NOT NULL AND client_id != '00000000-0000-0000-0000-000000000001') OR 
  (scope = 'agency' AND client_id = '00000000-0000-0000-0000-000000000001')
);

-- Update any existing agency batches to use the Petron account
UPDATE public.content_batches
SET client_id = '00000000-0000-0000-0000-000000000001'
WHERE scope = 'agency' AND client_id IS NULL;