
-- 1. Add cliente_interno column
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS cliente_interno boolean DEFAULT false;

-- 2. Mark Petron as internal
UPDATE public.accounts SET cliente_interno = true WHERE id = '00000000-0000-0000-0000-000000000001';

-- 3. Clear all retroactive data_conclusao
UPDATE public.content_posts SET data_conclusao = NULL WHERE data_conclusao IS NOT NULL;
