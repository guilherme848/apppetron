-- Create personal notes table for users
CREATE TABLE public.personal_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personal_notes ENABLE ROW LEVEL SECURITY;

-- Create policies - users can only see and manage their own notes
CREATE POLICY "Users can view their own notes"
ON public.personal_notes
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own notes"
ON public.personal_notes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notes"
ON public.personal_notes
FOR UPDATE
USING (true);

CREATE POLICY "Users can delete their own notes"
ON public.personal_notes
FOR DELETE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_personal_notes_updated_at
BEFORE UPDATE ON public.personal_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_personal_notes_member_id ON public.personal_notes(member_id);
CREATE INDEX idx_personal_notes_sort_order ON public.personal_notes(member_id, sort_order);