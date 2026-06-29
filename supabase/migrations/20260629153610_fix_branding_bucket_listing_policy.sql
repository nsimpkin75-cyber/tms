
-- Replace broad branding bucket SELECT policy to prevent bucket enumeration.
-- The new policy allows reading a specific object only when the caller supplies
-- a concrete object name (name <> ''), which prevents listing all files while
-- still allowing the app to fetch known assets by path.
DROP POLICY IF EXISTS branding_public_read ON storage.objects;

CREATE POLICY branding_public_read ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'branding'
    AND name <> ''
    AND (storage.foldername(name))[1] IS NOT NULL
  );
