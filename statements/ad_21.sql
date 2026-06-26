DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

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

DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP VIEW IF EXISTS user_status_view CASCADE;

CREATE OR REPLACE VIEW user_status_view AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.admin_type,
  p.job_title,
  p.department,
  p.tenure,
  p.manager_id,
  p.job_family_id,
  p.has_strategic_roadmap_access,
  p.active,
  p.created_at,
  au.confirmed_at,
  CASE
    WHEN au.confirmed_at IS NULL THEN 'pending'::text
    WHEN p.active = false THEN 'inactive'::text
    ELSE 'active'::text
  END as status
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id;

GRANT SELECT ON user_status_view TO authenticated;
GRANT SELECT ON user_status_view TO service_role;

COMMENT ON VIEW user_status_view IS 'Combines profiles with auth.users to show complete user status including email confirmation and active status';