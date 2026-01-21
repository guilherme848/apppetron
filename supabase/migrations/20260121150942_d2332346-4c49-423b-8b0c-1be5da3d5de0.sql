-- =============================================
-- TRAFFIC CREATIVE REQUESTS
-- =============================================

-- Main table for creative requests
CREATE TABLE public.traffic_creative_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  month_ref TEXT NOT NULL,
  title TEXT NOT NULL,
  brief_title TEXT,
  brief_rich TEXT,
  format TEXT NOT NULL DEFAULT 'static',
  objective TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  due_date DATE,
  requested_by_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  requested_by_role_key TEXT NOT NULL DEFAULT 'traffic',
  responsible_role_key TEXT,
  assignee_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  reviewer_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.traffic_creative_requests ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Allow all access to traffic_creative_requests"
  ON public.traffic_creative_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_traffic_creative_requests_updated_at
  BEFORE UPDATE ON public.traffic_creative_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Files/attachments table
CREATE TABLE public.traffic_creative_request_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.traffic_creative_requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.traffic_creative_request_files ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Allow all access to traffic_creative_request_files"
  ON public.traffic_creative_request_files
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for creative request files
INSERT INTO storage.buckets (id, name, public)
VALUES ('creative-requests', 'creative-requests', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for creative-requests bucket
CREATE POLICY "Allow public read access to creative-requests"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'creative-requests');

CREATE POLICY "Allow authenticated uploads to creative-requests"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'creative-requests');

CREATE POLICY "Allow updates to creative-requests"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'creative-requests');

CREATE POLICY "Allow deletes from creative-requests"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'creative-requests');

-- Add permissions for creative requests
INSERT INTO public.permissions (key, label)
VALUES 
  ('view_traffic_creatives', 'Visualizar Solicitações de Criativo'),
  ('edit_traffic_creatives', 'Editar Solicitações de Criativo')
ON CONFLICT (key) DO NOTHING;