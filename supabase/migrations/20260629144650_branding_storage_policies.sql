
-- Public read on branding bucket objects
CREATE POLICY "branding_public_read" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'branding');

-- Admins can upload to branding bucket
CREATE POLICY "branding_admin_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'branding' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update (upsert) in branding bucket
CREATE POLICY "branding_admin_update" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'branding' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can delete from branding bucket
CREATE POLICY "branding_admin_delete" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'branding' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
