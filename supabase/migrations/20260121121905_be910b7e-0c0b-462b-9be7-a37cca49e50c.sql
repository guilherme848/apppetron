-- Create content_change_requests table
CREATE TABLE IF NOT EXISTS public.content_change_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.content_posts(id) ON DELETE CASCADE,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  requested_by_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  comment_rich text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'canceled')),
  resolved_at timestamp with time zone,
  resolved_by_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  resolution_note_rich text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_change_requests ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all access to content_change_requests" 
ON public.content_change_requests 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_change_requests_post_id ON public.content_change_requests(post_id);
CREATE INDEX IF NOT EXISTS idx_content_change_requests_status ON public.content_change_requests(status);

-- Create trigger for updated_at
CREATE TRIGGER update_content_change_requests_updated_at
BEFORE UPDATE ON public.content_change_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();