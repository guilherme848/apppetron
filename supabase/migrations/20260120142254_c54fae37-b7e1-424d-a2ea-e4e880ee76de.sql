-- Adicionar colunas de responsáveis por cargo na tabela accounts
ALTER TABLE public.accounts
ADD COLUMN designer_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
ADD COLUMN videomaker_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
ADD COLUMN social_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
ADD COLUMN traffic_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
ADD COLUMN support_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
ADD COLUMN cs_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL;

-- Adicionar coluna de cargo responsável no post (text com valores fixos)
ALTER TABLE public.content_posts
ADD COLUMN responsible_role_key TEXT DEFAULT 'social';