-- Add auth_user_id column to team_members to link with Supabase auth
ALTER TABLE public.team_members 
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_members_auth_user_id ON public.team_members(auth_user_id);

-- Insert "Administrador" role if not exists
INSERT INTO public.job_roles (name) 
VALUES ('Administrador')
ON CONFLICT DO NOTHING;

-- Add admin_all permission if not exists
INSERT INTO public.permissions (key, label) 
VALUES ('admin_all', 'Acesso administrativo total')
ON CONFLICT DO NOTHING;

-- Add manage_users permission if not exists  
INSERT INTO public.permissions (key, label) 
VALUES ('manage_users', 'Gerenciar usuários')
ON CONFLICT DO NOTHING;

-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_auth_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    JOIN public.job_roles jr ON tm.role_id = jr.id
    WHERE tm.auth_user_id = _auth_user_id
      AND (jr.name = 'Administrador' OR jr.name ILIKE '%admin%')
  )
$$;

-- Create function to get current member from auth
CREATE OR REPLACE FUNCTION public.get_current_member_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.team_members WHERE auth_user_id = auth.uid()
$$;

-- Update RLS policies for team_members to allow authenticated users to read
DROP POLICY IF EXISTS "Allow all access to team_members" ON public.team_members;

CREATE POLICY "Authenticated users can view team_members" 
ON public.team_members 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can insert team_members" 
ON public.team_members 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update team_members" 
ON public.team_members 
FOR UPDATE 
TO authenticated
USING (public.is_admin(auth.uid()) OR auth_user_id = auth.uid());

CREATE POLICY "Admins can delete team_members" 
ON public.team_members 
FOR DELETE 
TO authenticated
USING (public.is_admin(auth.uid()));

-- Update RLS for job_roles
DROP POLICY IF EXISTS "Allow all access to job_roles" ON public.job_roles;

CREATE POLICY "Authenticated users can view job_roles" 
ON public.job_roles 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage job_roles" 
ON public.job_roles 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Update RLS for permissions
DROP POLICY IF EXISTS "Allow all access to permissions" ON public.permissions;

CREATE POLICY "Authenticated users can view permissions" 
ON public.permissions 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage permissions" 
ON public.permissions 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Update RLS for member_permissions
DROP POLICY IF EXISTS "Allow all access to member_permissions" ON public.member_permissions;

CREATE POLICY "Authenticated users can view member_permissions" 
ON public.member_permissions 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage member_permissions" 
ON public.member_permissions 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));