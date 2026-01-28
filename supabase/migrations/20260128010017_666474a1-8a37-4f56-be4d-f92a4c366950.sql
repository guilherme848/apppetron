-- Add deleted_at column for soft delete
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for filtering non-deleted accounts
CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at ON public.accounts(deleted_at) WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.accounts.deleted_at IS 'Timestamp when account was soft deleted (archived). NULL means active record.';