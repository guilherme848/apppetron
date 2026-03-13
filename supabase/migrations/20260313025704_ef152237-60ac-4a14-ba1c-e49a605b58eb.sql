
-- Status history table for creative requests
CREATE TABLE public.traffic_creative_request_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.traffic_creative_requests(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by_member_id UUID REFERENCES public.team_members(id),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Creative items (multiple creatives per request)
CREATE TABLE public.traffic_creative_request_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.traffic_creative_requests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'static',
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Creative item files
CREATE TABLE public.traffic_creative_request_item_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.traffic_creative_request_items(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add rejected status support - add rejection_feedback column to main table
ALTER TABLE public.traffic_creative_requests ADD COLUMN IF NOT EXISTS rejection_feedback TEXT;

-- Enable RLS
ALTER TABLE public.traffic_creative_request_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_creative_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_creative_request_item_files ENABLE ROW LEVEL SECURITY;

-- RLS policies - authenticated users can CRUD
CREATE POLICY "Authenticated users can manage status history" ON public.traffic_creative_request_status_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage creative items" ON public.traffic_creative_request_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage item files" ON public.traffic_creative_request_item_files FOR ALL TO authenticated USING (true) WITH CHECK (true);
