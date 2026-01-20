-- Criar tabela de permissões
CREATE TABLE public.permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Allow all access to permissions" 
ON public.permissions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Criar tabela de permissões por membro
CREATE TABLE public.member_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, permission_key)
);

-- Habilitar RLS
ALTER TABLE public.member_permissions ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Allow all access to member_permissions" 
ON public.member_permissions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Seed de permissões padrão
INSERT INTO public.permissions (key, label) VALUES
  ('view_dashboard', 'Visualizar Dashboard'),
  ('view_crm', 'Visualizar CRM'),
  ('edit_crm', 'Editar CRM'),
  ('view_content', 'Visualizar Conteúdo'),
  ('edit_content', 'Editar Conteúdo'),
  ('view_tasks', 'Visualizar Tarefas'),
  ('edit_tasks', 'Editar Tarefas'),
  ('manage_settings', 'Gerenciar Configurações'),
  ('view_client_credentials', 'Ver Credenciais de Clientes');