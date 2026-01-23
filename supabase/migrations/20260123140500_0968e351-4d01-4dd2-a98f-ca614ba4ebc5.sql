-- =============================================
-- Route Permissions System Tables
-- =============================================

-- Table: route_permissions
-- Stores all permissions derived from route registry
CREATE TABLE IF NOT EXISTS public.route_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,           -- e.g., 'view:content.tasks'
  route_id TEXT NOT NULL,             -- e.g., 'content.tasks'
  action TEXT NOT NULL,               -- 'view', 'edit', or 'manage'
  label TEXT NOT NULL,                -- Human-readable label
  category TEXT NOT NULL,             -- Category for grouping
  module TEXT NOT NULL,               -- Module name
  path TEXT NOT NULL,                 -- Route path
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_route_permissions_route_id ON public.route_permissions(route_id);
CREATE INDEX IF NOT EXISTS idx_route_permissions_module ON public.route_permissions(module);

-- Enable RLS
ALTER TABLE public.route_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for route_permissions
CREATE POLICY "Authenticated users can view route_permissions"
  ON public.route_permissions
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage route_permissions"
  ON public.route_permissions
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Table: role_permissions
-- Stores permissions granted to each role
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_key TEXT NOT NULL,             -- Role name (lowercase): 'admin', 'designer', etc.
  permission_key TEXT NOT NULL,       -- FK to route_permissions.key
  allowed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_key, permission_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_key ON public.role_permissions(role_key);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_key ON public.role_permissions(permission_key);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for role_permissions
CREATE POLICY "Authenticated users can view role_permissions"
  ON public.role_permissions
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage role_permissions"
  ON public.role_permissions
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Table: user_permission_overrides
-- Stores per-user permission overrides (optional)
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,              -- FK to team_members.id
  permission_key TEXT NOT NULL,       -- FK to route_permissions.key
  allowed BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_permission_overrides_user_id ON public.user_permission_overrides(user_id);

-- Enable RLS
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_permission_overrides
CREATE POLICY "Authenticated users can view user_permission_overrides"
  ON public.user_permission_overrides
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage user_permission_overrides"
  ON public.user_permission_overrides
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply trigger to role_permissions
DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON public.role_permissions;
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to user_permission_overrides
DROP TRIGGER IF EXISTS update_user_permission_overrides_updated_at ON public.user_permission_overrides;
CREATE TRIGGER update_user_permission_overrides_updated_at
  BEFORE UPDATE ON public.user_permission_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();