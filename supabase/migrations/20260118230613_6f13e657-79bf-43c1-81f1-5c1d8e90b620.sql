-- Create content_batches table (Card = Cliente + Mês)
CREATE TABLE public.content_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  month_ref TEXT NOT NULL, -- formato "YYYY-MM"
  status TEXT NOT NULL DEFAULT 'planning',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, month_ref)
);

-- Create content_posts table (Posts dentro do card)
CREATE TABLE public.content_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.content_batches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  channel TEXT,
  format TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_batches
CREATE POLICY "Allow all access to content_batches" 
ON public.content_batches 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- RLS policies for content_posts
CREATE POLICY "Allow all access to content_posts" 
ON public.content_posts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Indexes
CREATE INDEX idx_content_batches_client_id ON public.content_batches(client_id);
CREATE INDEX idx_content_batches_status ON public.content_batches(status);
CREATE INDEX idx_content_batches_month_ref ON public.content_batches(month_ref);
CREATE INDEX idx_content_posts_batch_id ON public.content_posts(batch_id);

-- Triggers for updated_at
CREATE TRIGGER update_content_batches_updated_at
BEFORE UPDATE ON public.content_batches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_posts_updated_at
BEFORE UPDATE ON public.content_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();