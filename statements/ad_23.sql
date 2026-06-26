DROP POLICY IF EXISTS "Users can create own profile" ON profiles;

DROP POLICY IF EXISTS "Users can insert own profile or admins can insert any" ON profiles;

CREATE POLICY "Users can insert own profile or admins can insert any"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );