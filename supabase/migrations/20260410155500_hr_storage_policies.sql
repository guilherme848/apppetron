-- ═══════════════════════════════════════════════════════════════
-- Policies do Storage para bucket hr-resumes
-- Permite upload anônimo apenas no prefixo public-uploads/
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_all_hr_resumes" ON storage.objects;
CREATE POLICY "auth_all_hr_resumes"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'hr-resumes')
WITH CHECK (bucket_id = 'hr-resumes');

DROP POLICY IF EXISTS "anon_insert_hr_resumes_public" ON storage.objects;
CREATE POLICY "anon_insert_hr_resumes_public"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'hr-resumes'
  AND (storage.foldername(name))[1] = 'public-uploads'
);

DROP POLICY IF EXISTS "anon_select_hr_resumes_public" ON storage.objects;
CREATE POLICY "anon_select_hr_resumes_public"
ON storage.objects FOR SELECT
TO anon
USING (
  bucket_id = 'hr-resumes'
  AND (storage.foldername(name))[1] = 'public-uploads'
);
