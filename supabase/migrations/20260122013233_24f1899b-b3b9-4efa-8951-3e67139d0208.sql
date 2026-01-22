-- Add unique constraint on business_id for upsert to work
ALTER TABLE public.meta_bm_connection 
ADD CONSTRAINT meta_bm_connection_business_id_key UNIQUE (business_id);