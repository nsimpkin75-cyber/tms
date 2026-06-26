/*
  # Recreate Critical Database Functions

  1. Purpose
    - Recreate is_admin() functions that are required for authentication
    - These functions are used by RLS policies throughout the system

  2. Functions
    - is_admin() - Check if current user is admin
    - is_admin(user_id) - Check if specific user is admin

  3. Security
    - SECURITY DEFINER to allow checking profiles table
    - SET search_path for security
*/

-- Create is_admin() function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (select auth.uid())
    AND role = 'admin'
  );
END;
$$;

-- Create is_admin(user_id) function to check if specific user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role = 'admin'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon;
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO anon;
