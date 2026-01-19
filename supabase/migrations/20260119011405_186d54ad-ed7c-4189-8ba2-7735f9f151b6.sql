-- Create team_members table for internal users (no auth)
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  role_id uuid REFERENCES public.job_roles(id) ON DELETE SET NULL,
  email text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS (permissive for now as requested - no auth)
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to team_members"
ON public.team_members
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add assignee_id to content_posts
ALTER TABLE public.content_posts
ADD COLUMN assignee_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL;

-- Comment for clarity
COMMENT ON TABLE public.team_members IS 'Internal team members for task assignment (no authentication)';
COMMENT ON COLUMN public.content_posts.assignee_id IS 'Team member assigned to this post';