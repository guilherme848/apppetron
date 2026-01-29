-- =============================================
-- CS ONBOARDING: TRANSCRIPTS + TYPED QUESTIONS + ANSWERS
-- =============================================

-- 1) Create cs_transcripts table for storing transcriptions
CREATE TABLE public.cs_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  onboarding_id UUID REFERENCES public.cs_onboardings(id) ON DELETE SET NULL,
  transcript_type TEXT NOT NULL CHECK (transcript_type IN ('sales_call', 'onboarding_meeting')),
  transcript_text TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'paste' CHECK (source IN ('paste', 'upload', 'integration')),
  created_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cs_transcripts ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Allow all access to cs_transcripts"
ON public.cs_transcripts FOR ALL
USING (true)
WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_cs_transcripts_client_type ON public.cs_transcripts(client_id, transcript_type);

-- 2) Add typed fields to cs_onboarding_questions
ALTER TABLE public.cs_onboarding_questions
  ADD COLUMN IF NOT EXISTS field_type TEXT NOT NULL DEFAULT 'long_text',
  ADD COLUMN IF NOT EXISTS options_json JSONB,
  ADD COLUMN IF NOT EXISTS placeholder TEXT,
  ADD COLUMN IF NOT EXISTS help_text TEXT,
  ADD COLUMN IF NOT EXISTS is_decision_field BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS answer_key TEXT,
  ADD COLUMN IF NOT EXISTS validation_json JSONB,
  ADD COLUMN IF NOT EXISTS ai_extract_hint TEXT;

-- Add constraint for field_type
ALTER TABLE public.cs_onboarding_questions
  ADD CONSTRAINT cs_onboarding_questions_field_type_check 
  CHECK (field_type IN ('short_text', 'long_text', 'number', 'money', 'date', 'single_select', 'multi_select', 'boolean', 'phone', 'time', 'email'));

-- Create unique index for answer_key (allowing nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cs_onboarding_questions_answer_key 
ON public.cs_onboarding_questions(answer_key) 
WHERE answer_key IS NOT NULL;

-- 3) Add typed answer fields to cs_onboarding_answers
ALTER TABLE public.cs_onboarding_answers
  ADD COLUMN IF NOT EXISTS answer_value_json JSONB,
  ADD COLUMN IF NOT EXISTS answered_by_ai BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS needs_validation BOOLEAN NOT NULL DEFAULT false;

-- 4) Link briefings to transcripts (optional - for traceability)
ALTER TABLE public.cs_onboarding_briefings
  ADD COLUMN IF NOT EXISTS transcript_id UUID REFERENCES public.cs_transcripts(id) ON DELETE SET NULL;