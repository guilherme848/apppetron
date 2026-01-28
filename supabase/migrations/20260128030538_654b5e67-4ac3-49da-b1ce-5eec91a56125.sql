-- Create user_notes table
CREATE TABLE public.user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_user_notes_member_id ON public.user_notes(member_id);
CREATE INDEX idx_user_notes_status ON public.user_notes(status);
CREATE INDEX idx_user_notes_due_date ON public.user_notes(due_date);

-- Enable RLS
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their own notes
CREATE POLICY "Users can view their own notes"
ON public.user_notes
FOR SELECT
USING (member_id = public.get_current_member_id());

CREATE POLICY "Users can create their own notes"
ON public.user_notes
FOR INSERT
WITH CHECK (member_id = public.get_current_member_id());

CREATE POLICY "Users can update their own notes"
ON public.user_notes
FOR UPDATE
USING (member_id = public.get_current_member_id());

CREATE POLICY "Users can delete their own notes"
ON public.user_notes
FOR DELETE
USING (member_id = public.get_current_member_id());

-- Create user_note_events table for audit
CREATE TABLE public.user_note_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.user_notes(id) ON DELETE CASCADE,
  actor_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_user_note_events_note_id ON public.user_note_events(note_id);

-- Enable RLS
ALTER TABLE public.user_note_events ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see events for their own notes
CREATE POLICY "Users can view events for their own notes"
ON public.user_note_events
FOR SELECT
USING (
  note_id IN (SELECT id FROM public.user_notes WHERE member_id = public.get_current_member_id())
);

CREATE POLICY "Users can create events for their own notes"
ON public.user_note_events
FOR INSERT
WITH CHECK (
  note_id IN (SELECT id FROM public.user_notes WHERE member_id = public.get_current_member_id())
);

-- Trigger to update updated_at
CREATE TRIGGER update_user_notes_updated_at
BEFORE UPDATE ON public.user_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();