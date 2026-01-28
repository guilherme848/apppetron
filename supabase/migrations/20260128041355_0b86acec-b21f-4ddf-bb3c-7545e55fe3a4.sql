-- Table to store user dashboard layouts
CREATE TABLE public.user_dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  page_key TEXT NOT NULL DEFAULT 'executive_dashboard',
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, page_key)
);

-- Enable RLS
ALTER TABLE public.user_dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Users can view their own layouts
CREATE POLICY "Users can view their own layouts"
ON public.user_dashboard_layouts
FOR SELECT
USING (auth.uid() IN (
  SELECT auth_user_id FROM team_members WHERE id = user_id
) OR auth.uid() = user_id);

-- Users can insert their own layouts
CREATE POLICY "Users can insert their own layouts"
ON public.user_dashboard_layouts
FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT auth_user_id FROM team_members WHERE id = user_id
) OR auth.uid() = user_id);

-- Users can update their own layouts
CREATE POLICY "Users can update their own layouts"
ON public.user_dashboard_layouts
FOR UPDATE
USING (auth.uid() IN (
  SELECT auth_user_id FROM team_members WHERE id = user_id
) OR auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_user_dashboard_layouts_updated_at
  BEFORE UPDATE ON public.user_dashboard_layouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();