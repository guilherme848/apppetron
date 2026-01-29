-- Fix RLS policy on cs_transcripts that references wrong column name
-- Drop existing policies that might have the wrong column reference
DROP POLICY IF EXISTS "Users can insert transcripts" ON public.cs_transcripts;
DROP POLICY IF EXISTS "Users can view transcripts" ON public.cs_transcripts;
DROP POLICY IF EXISTS "Users can update transcripts" ON public.cs_transcripts;

-- Recreate policies with correct column name (auth_user_id instead of auth_uid)
CREATE POLICY "Users can insert transcripts"
  ON public.cs_transcripts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view transcripts"
  ON public.cs_transcripts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transcripts"
  ON public.cs_transcripts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.auth_user_id = auth.uid()
    )
  );