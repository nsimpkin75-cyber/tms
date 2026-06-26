/*
  # Fix Admin User Management Permissions

  This migration fixes the permissions issues with user deactivation and deletion:

  1. Updates RLS policies for profiles table to properly check admin permissions
  2. Ensures admins with any admin_type can manage users
  3. Simplifies the admin check to avoid nested EXISTS queries that may fail

  ## Changes

  - Drop existing admin UPDATE and DELETE policies
  - Create new streamlined policies that properly check admin role
  - Add helper function to check if user is admin
*/

-- Create a helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'admin'
  );
$$;

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Create new admin policies using the helper function
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (is_user_admin())
  WITH CHECK (is_user_admin());

CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (is_user_admin());
