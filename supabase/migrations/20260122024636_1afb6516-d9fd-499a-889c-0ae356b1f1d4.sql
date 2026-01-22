-- Adicionar novos campos de perfil na tabela team_members
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS admission_date DATE,
ADD COLUMN IF NOT EXISTS profile_photo_path TEXT,
ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP WITH TIME ZONE;

-- Migrar dados existentes: copiar 'name' para 'full_name' onde full_name é null
UPDATE public.team_members SET full_name = name WHERE full_name IS NULL;

-- Criar bucket para fotos de perfil
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para profile-photos
-- Permitir leitura pública
CREATE POLICY "Public read access for profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Permitir upload/update/delete para qualquer pessoa (já que não temos auth tradicional)
CREATE POLICY "Allow all uploads to profile photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "Allow all updates to profile photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-photos');

CREATE POLICY "Allow all deletes from profile photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-photos');

-- Adicionar permissão para editar data de admissão
INSERT INTO public.permissions (key, label)
VALUES ('edit_admission_date', 'Editar data de admissão')
ON CONFLICT (key) DO NOTHING;