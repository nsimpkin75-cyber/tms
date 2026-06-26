/*
  # Fix Review Cycles Circular Dependency - Final Fix
  
  1. Problem
    - SELECT policy on review_cycles checks review_cycle_members
    - SELECT policy on review_cycle_members checks review_cycles
    - This creates infinite recursion during INSERT operations
    
  2. Solution
    - Simplify review_cycles SELECT policy to use direct checks only
    - Create a helper function that safely checks membership
    - Use SECURITY DEFINER function to bypass RLS during policy checks
    
  3. Changes
    - Add is_cycle_member function with SECURITY DEFINER
    - Update review_cycles SELECT policy to use the function
    - This breaks the circular dependency
*/

-- Helper function to check if user is a cycle member (bypasses RLS)
CREATE OR REPLACE FUNCTION is_cycle_member(p_cycle_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_member boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM review_cycle_members
    WHERE cycle_id = p_cycle_id 
    AND employee_id = p_user_id
    AND status = 'active'
  ) INTO v_is_member;
  
  RETURN v_is_member;
END;
$$;

GRANT EXECUTE ON FUNCTION is_cycle_member(uuid, uuid) TO authenticated;

-- Helper function to check if user is leadership/admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_leadership_or_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_leadership boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id 
    AND role IN ('leadership', 'admin')
  ) INTO v_is_leadership;
  
  RETURN v_is_leadership;
END;
$$;

GRANT EXECUTE ON FUNCTION is_leadership_or_admin(uuid) TO authenticated;

-- Update review_cycles SELECT policy to break circular dependency
DROP POLICY IF EXISTS "Users can view their cycles" ON review_cycles;

CREATE POLICY "Users can view their cycles"
  ON review_cycles FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR is_cycle_member(id, auth.uid())
    OR is_leadership_or_admin(auth.uid())
  );

-- Update review_cycle_members SELECT policy to be simpler
DROP POLICY IF EXISTS "Users can view cycle members" ON review_cycle_members;

CREATE POLICY "Users can view cycle members"
  ON review_cycle_members FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = cycle_id AND rc.manager_id = auth.uid()
    )
    OR is_leadership_or_admin(auth.uid())
  );
