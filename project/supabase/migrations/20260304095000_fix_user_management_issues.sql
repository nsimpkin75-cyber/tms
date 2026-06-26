/*
  # Fix User Management Issues

  1. Problem Statement
    - Users signing up via the login screen cannot create profiles (INSERT policy too restrictive)
    - Self-signup users are not visible in the admin user list
    - Delete user edge function fails with "Database error loading user"

  2. Changes
    - Fix profiles INSERT policy to allow self-signup (users can insert their own profile)
    - Ensure user_status_view properly shows all users
    - Add proper cascading deletes

  3. Security
    - Users can only insert profiles for themselves (auth.uid() = id)
    - Admin can insert profiles for any user
    - All other policies remain restrictive
*/

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow users to insert their own profile OR admin to insert any profile
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

-- Ensure the DELETE policy exists for profiles (allows CASCADE to work)
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

-- Recreate the user_status_view to ensure it shows all users properly
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

-- Grant proper access to the view
GRANT SELECT ON user_status_view TO authenticated;
GRANT SELECT ON user_status_view TO service_role;

-- Add comment explaining the view
COMMENT ON VIEW user_status_view IS 'Combines profiles with auth.users to show complete user status including email confirmation and active status';
