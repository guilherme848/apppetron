
-- Remove the unique constraint on client_id + month_ref to allow multiple batches per client per month
ALTER TABLE public.content_batches DROP CONSTRAINT IF EXISTS content_batches_client_id_month_ref_key;
