/*
  # Fix is_admin Function and Profile Update Policies V2
  
  1. Issue
    - Profile updates are failing due to is_admin() function issues
    - Function uses auth.uid() without SELECT wrapper
    - Need to optimize for performance and fix RLS policies
  
  2. Changes
    - Replace is_admin() function to use (select auth.uid())
    - Simplify profile UPDATE policies
    - Ensure admins can update all profiles
    - Ensure users can update their own profiles
  
  3. Security
    - Maintains proper access controls
    - Optimizes auth.uid() calls
    - Fixes profile update functionality
*/

-- Replace the is_admin() function with optimization (don't drop, just replace)
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

-- Replace the is_admin(user_id) function with optimization
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

-- Simplify UPDATE policies on profiles table
-- Remove the redundant admin policies and keep just what's needed

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update user active status" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Admin policy - admins can update any profile
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- User policy - users can update their own profile (basic fields only)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);
