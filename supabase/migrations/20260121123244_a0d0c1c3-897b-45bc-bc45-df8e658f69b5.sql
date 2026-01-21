-- Create branding bucket for logo and brand assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to branding assets
CREATE POLICY "Branding assets are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'branding');

-- Allow authenticated uploads (for admin purposes)
CREATE POLICY "Allow public upload to branding"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'branding');