/*
  # Cleanup Duplicate INSERT Policies

  1. Problem
    - Multiple INSERT policies exist on profiles table
    - Need to keep only the correct one

  2. Changes
    - Remove old "Users can create own profile" policy
    - Keep "Users can insert own profile or admins can insert any"

  3. Security
    - Maintains secure INSERT policy allowing self-signup and admin creation
*/

-- Remove the old duplicate policy
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;

-- Verify the correct policy exists (this is idempotent)
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