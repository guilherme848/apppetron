ALTER TABLE cs_onboarding_questions DROP CONSTRAINT IF EXISTS cs_onboarding_questions_field_type_check;
ALTER TABLE cs_onboarding_questions ADD CONSTRAINT cs_onboarding_questions_field_type_check 
  CHECK (field_type = ANY (ARRAY['short_text','long_text','number','money','date','single_select','multi_select','boolean','phone','time','email','compound']));

ALTER TABLE cs_onboarding_questions ADD COLUMN IF NOT EXISTS allow_other boolean DEFAULT false;
ALTER TABLE cs_onboarding_questions ADD COLUMN IF NOT EXISTS sub_fields jsonb;