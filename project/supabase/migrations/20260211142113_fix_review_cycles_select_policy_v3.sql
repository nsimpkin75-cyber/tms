/*
  # Fix Review Cycles SELECT Policy - Version 3

  1. Problem
    - INSERT with .select() triggers SELECT policy on review_cycles
    - SELECT policy queries review_cycle_members
    - review_cycle_members doesn't exist yet during the INSERT
    - Creates recursion or access denied errors

  2. Solution
    - Make SELECT policy on review_cycles prioritize manager_id check
    - Only check review_cycle_members as a secondary condition
    - This allows managers to see cycles they created immediately

  3. Changes
    - Update SELECT policy to be more efficient
    - Avoid unnecessary joins when manager_id matches
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their cycles" ON review_cycles;

-- Create optimized SELECT policy that checks manager first
-- This avoids querying review_cycle_members when it's the manager
CREATE POLICY "Users can view their cycles"
  ON review_cycles FOR SELECT
  TO authenticated
  USING (
    -- Managers can always see their cycles (no join needed)
    manager_id = auth.uid()
    OR 
    -- Leadership/admin can see all cycles
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
    OR
    -- Employees can see cycles they're part of
    EXISTS (
      SELECT 1 FROM review_cycle_members
      WHERE cycle_id = review_cycles.id AND employee_id = auth.uid()
    )
  );
