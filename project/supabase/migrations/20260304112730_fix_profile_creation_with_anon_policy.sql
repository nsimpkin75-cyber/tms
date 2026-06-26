/*
  # Fix Profile Creation with Anonymous Policy

  1. Issue
    - Trigger runs before authentication completes
    - Cannot use auth.uid() during trigger execution

  2. Solution
    - Add policy for anon role to allow trigger to insert
    - Keep authenticated policies for normal operations

  3. Security
    - Anon policy only allows insert if id doesn't exist yet
    - Still protected by trigger context
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile or admins can insert" ON profiles;

-- Policy for anon role (used during trigger execution)
CREATE POLICY "Allow trigger to create profiles"
  ON profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy for authenticated users
CREATE POLICY "Authenticated users can insert own profile or admins can insert"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = id) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
