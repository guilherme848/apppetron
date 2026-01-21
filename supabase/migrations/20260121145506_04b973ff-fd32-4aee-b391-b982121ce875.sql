-- =============================================
-- CONTENT EXTRA REQUESTS - SOLICITAÇÕES EXTRAS
-- =============================================

-- Main table for extra requests
CREATE TABLE public.content_extra_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  month_ref TEXT NOT NULL, -- "YYYY-MM" from created_at
  title TEXT NOT NULL,
  request_rich TEXT, -- Rich text description
  status TEXT NOT NULL DEFAULT 'open', -- open | in_progress | done | canceled
  priority TEXT NOT NULL DEFAULT 'medium', -- low | medium | high | urgent
  requested_by_member_id UUID REFERENCES public.team_members(id),
  requested_by_role_key TEXT NOT NULL, -- support | social
  responsible_role_key TEXT, -- designer | videomaker | social | support | cs | traffic
  assignee_id UUID REFERENCES public.team_members(id),
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Attachments for extra requests
CREATE TABLE public.content_extra_request_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.content_extra_requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_extra_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_extra_request_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for internal use)
CREATE POLICY "Allow all access to content_extra_requests" 
ON public.content_extra_requests FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to content_extra_request_files" 
ON public.content_extra_request_files FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_content_extra_requests_updated_at
BEFORE UPDATE ON public.content_extra_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add new permissions
INSERT INTO public.permissions (key, label) VALUES 
('view_content_extras', 'Ver Solicitações Extras'),
('edit_content_extras', 'Editar Solicitações Extras')
ON CONFLICT (key) DO NOTHING;