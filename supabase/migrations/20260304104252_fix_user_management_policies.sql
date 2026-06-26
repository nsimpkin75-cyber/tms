/*
  # Fix User Management Policies

  1. Problem Statement
    - Users signing up via the login screen cannot create profiles (INSERT policy too restrictive)
    - Delete user functionality fails with database errors

  2. Changes
    - Fix profiles INSERT policy to allow self-signup
    - Fix profiles DELETE policy to allow admin deletion

  3. Security
    - Users can only insert profiles for themselves (auth.uid() = id)
    - Admin can insert profiles for any user
    - Only admins can delete profiles
*/

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile or admins can insert any" ON profiles;

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

-- Ensure the DELETE policy exists for profiles
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