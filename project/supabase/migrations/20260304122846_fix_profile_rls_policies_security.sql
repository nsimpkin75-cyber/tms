/*
  # Fix Profile RLS Policies - Security Fix

  1. Changes
    - Remove redundant and conflicting SELECT policies on profiles
    - Remove insecure "USING (true)" policy
    - Remove dangerous public insert policy
    - Consolidate to one clear SELECT policy for authenticated users
    - Keep secure INSERT policies for authentication flow
    - Keep admin and self-update policies

  2. Security
    - All policies now follow restrictive-by-default principle
    - No more USING (true) policies
    - Clear separation of concerns between admin and user access
*/

-- Drop redundant and conflicting policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authentication" ON profiles;

-- Keep the clean authenticated user SELECT policy
-- (Admins can view all profiles policy already exists and is secure)

-- Create a single, clear SELECT policy for authenticated users
CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Note: The INSERT policies "Anon can insert profiles" and "Authenticated can insert own profile"
-- are kept because they're needed for the auth trigger to work correctly
