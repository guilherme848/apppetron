-- Drop the old check constraint
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_status_check;

-- Add new check constraint with 'archived' included
ALTER TABLE public.accounts 
ADD CONSTRAINT accounts_status_check 
CHECK (status = ANY (ARRAY['lead'::text, 'active'::text, 'churned'::text, 'archived'::text]));