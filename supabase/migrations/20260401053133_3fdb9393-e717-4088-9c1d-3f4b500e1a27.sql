
-- Add prefill_field to questions table
ALTER TABLE cs_onboarding_questions ADD COLUMN IF NOT EXISTS prefill_field text;

-- Add resposta_json to answers table for structured data
ALTER TABLE onboarding_reuniao_respostas ADD COLUMN IF NOT EXISTS resposta_json jsonb;
