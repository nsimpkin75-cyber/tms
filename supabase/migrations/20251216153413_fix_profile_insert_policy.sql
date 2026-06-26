/*
  # Fix Profile Insert Policy

  1. Changes
    - Add INSERT policy to allow users to create their own profile
    - This fixes the "Database error finding user" issue during signup

  2. Security
    - Users can only insert a profile for their own user ID
    - Must be authenticated to insert
*/

-- Create INSERT policy for profiles
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
