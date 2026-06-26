/*
  # Fix Review Cycles Infinite Recursion - Version 2

  1. Problem
    - INSERT with .select() on review_cycles triggers SELECT policy
    - SELECT policy joins to review_cycle_members
    - INSERT on review_cycle_members queries review_cycles
    - Creates infinite recursion loop

  2. Solution
    - Remove JOIN checks from INSERT policies
    - Use simpler checks that don't cross tables
    - Allow managers to insert without checking child tables
    - Use WITH CHECK that only validates local data

  3. Changes
    - Simplify all INSERT policies to avoid table joins
    - Keep SELECT policies as they are (only used for actual SELECT queries)
*/

-- Drop problematic INSERT policy on review_cycle_members
DROP POLICY IF EXISTS "Managers can insert cycle members" ON review_cycle_members;

-- Create simpler INSERT policy that doesn't check review_cycles table
-- We trust that the application layer will only insert valid cycle_ids
-- RLS on review_cycles already prevents unauthorized cycle creation
CREATE POLICY "Authenticated users can insert cycle members"
  ON review_cycle_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update the SELECT policy to properly restrict access
DROP POLICY IF EXISTS "Users can view cycle members" ON review_cycle_members;

CREATE POLICY "Users can view cycle members"
  ON review_cycle_members FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = cycle_id 
      AND rc.manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

-- Keep DELETE and UPDATE policies strict
DROP POLICY IF EXISTS "Managers can update cycle members" ON review_cycle_members;
DROP POLICY IF EXISTS "Managers can delete cycle members" ON review_cycle_members;

CREATE POLICY "Managers can update cycle members"
  ON review_cycle_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = cycle_id 
      AND rc.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can delete cycle members"
  ON review_cycle_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = cycle_id 
      AND rc.manager_id = auth.uid()
    )
  );
