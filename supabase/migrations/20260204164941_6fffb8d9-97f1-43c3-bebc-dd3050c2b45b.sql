-- Create priority enum for content jobs
CREATE TYPE public.content_job_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create configurable stages table
CREATE TABLE public.petron_content_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  color TEXT DEFAULT 'blue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create content jobs table (tracks client progress through stages)
CREATE TABLE public.petron_content_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.petron_content_stages(id) ON DELETE RESTRICT,
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  month_ref TEXT NOT NULL, -- e.g., '2025-02'
  due_date DATE,
  priority content_job_priority DEFAULT 'medium',
  notes TEXT,
  status_label TEXT, -- e.g., 'Aguardando cliente'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, month_ref)
);

-- Create stage history table for tracking movements
CREATE TABLE public.petron_content_job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.petron_content_jobs(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES public.petron_content_stages(id),
  to_stage_id UUID NOT NULL REFERENCES public.petron_content_stages(id),
  changed_by_member_id UUID REFERENCES public.team_members(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.petron_content_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petron_content_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petron_content_job_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stages (all authenticated can read, admins can modify)
CREATE POLICY "Anyone can view content stages"
ON public.petron_content_stages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage content stages"
ON public.petron_content_stages FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for jobs (all authenticated can read, team can modify)
CREATE POLICY "Anyone can view content jobs"
ON public.petron_content_jobs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team members can manage content jobs"
ON public.petron_content_jobs FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.auth_user_id = auth.uid()
  )
);

-- RLS Policies for history (all authenticated can read, team can insert)
CREATE POLICY "Anyone can view job history"
ON public.petron_content_job_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team members can insert job history"
ON public.petron_content_job_history FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.auth_user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_petron_content_stages_updated_at
  BEFORE UPDATE ON public.petron_content_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_petron_content_jobs_updated_at
  BEFORE UPDATE ON public.petron_content_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to move job between stages with history tracking
CREATE OR REPLACE FUNCTION public.move_content_job_to_stage(
  p_job_id UUID,
  p_new_stage_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.petron_content_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.petron_content_jobs;
  v_old_stage_id UUID;
  v_member_id UUID;
BEGIN
  -- Get current stage
  SELECT stage_id INTO v_old_stage_id
  FROM public.petron_content_jobs
  WHERE id = p_job_id;
  
  -- Get current member id
  SELECT id INTO v_member_id
  FROM public.team_members
  WHERE auth_user_id = auth.uid();
  
  -- Update job
  UPDATE public.petron_content_jobs
  SET stage_id = p_new_stage_id,
      updated_at = now()
  WHERE id = p_job_id
  RETURNING * INTO v_job;
  
  -- Record history
  INSERT INTO public.petron_content_job_history (
    job_id, from_stage_id, to_stage_id, changed_by_member_id, notes
  ) VALUES (
    p_job_id, v_old_stage_id, p_new_stage_id, v_member_id, p_notes
  );
  
  RETURN v_job;
END;
$$;

-- Seed initial stages
INSERT INTO public.petron_content_stages (name, position, color) VALUES
  ('Briefing Pendente', 1, 'slate'),
  ('Planejamento', 2, 'blue'),
  ('Produção', 3, 'amber'),
  ('Revisão Interna', 4, 'purple'),
  ('Aguardando Aprovação', 5, 'orange'),
  ('Ajustes', 6, 'rose'),
  ('Agendado/Publicado', 7, 'green');