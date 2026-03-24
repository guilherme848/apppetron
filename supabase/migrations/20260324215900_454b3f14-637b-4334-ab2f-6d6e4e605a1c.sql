
-- Add data_conclusao to content_posts (immutable completion date)
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS data_conclusao timestamptz DEFAULT NULL;

-- Create trigger to set data_conclusao once when status becomes 'done'
CREATE OR REPLACE FUNCTION public.set_data_conclusao()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.data_conclusao IS NULL)
     AND (NEW.status = 'done')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.data_conclusao := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_data_conclusao
BEFORE UPDATE ON content_posts
FOR EACH ROW
EXECUTE FUNCTION set_data_conclusao();

-- Backfill existing completed posts
UPDATE content_posts
SET data_conclusao = COALESCE(completed_at, updated_at)
WHERE status = 'done' AND data_conclusao IS NULL;

-- Create daily production goals table
CREATE TABLE metas_producao_diaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo text NOT NULL,
  meta_diaria integer NOT NULL DEFAULT 0,
  ativo boolean DEFAULT true,
  atualizado_por uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_cargo UNIQUE (cargo)
);

-- Enable RLS
ALTER TABLE metas_producao_diaria ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Everyone can read metas"
ON metas_producao_diaria FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage metas"
ON metas_producao_diaria FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Insert default goals
INSERT INTO metas_producao_diaria (cargo, meta_diaria) VALUES
  ('designer', 3),
  ('videomaker', 2),
  ('social', 3);
