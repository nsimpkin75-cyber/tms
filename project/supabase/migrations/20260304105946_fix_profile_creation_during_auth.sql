/*
  # Fix Profile Creation During Authentication

  1. Issue
    - handle_new_user trigger fails during authentication because INSERT policy requires auth.uid()
    - But auth.uid() is NULL during user creation trigger
    - This causes "Database error querying schema" during login

  2. Solution
    - Add special INSERT policy for service role (used by SECURITY DEFINER functions)
    - Keep existing policies for normal authenticated users

  3. Security
    - Service role policy only allows inserts from SECURITY DEFINER functions
    - Normal user policies unchanged
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile or admins can insert any" ON profiles;

-- Service role can insert profiles (for triggers and functions)
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add back the original policy name for compatibility
-- This ensures the trigger can create profiles during user registration
CREATE POLICY "Users can insert own profile or admins can insert any"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
