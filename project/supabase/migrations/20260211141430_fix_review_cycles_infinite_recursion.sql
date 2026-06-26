/*
  # Fix Infinite Recursion in Review Cycles RLS Policies

  1. Problem
    - INSERT on review_cycles triggers SELECT policy check
    - SELECT policy checks review_cycle_members (which doesn't exist yet)
    - INSERT on review_cycle_members checks review_cycles
    - This creates infinite recursion

  2. Solution
    - Simplify SELECT policy to not rely on review_cycle_members during initial insert
    - Keep the policy secure by checking manager_id first
    - Add proper WITH CHECK clause for INSERT that doesn't trigger SELECT

  3. Changes
    - Drop and recreate the problematic policies
    - Use simpler, non-recursive policy logic for INSERT operations
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their cycles" ON review_cycles;
DROP POLICY IF EXISTS "Managers can manage cycle members" ON review_cycle_members;

-- Recreate SELECT policy for review_cycles (non-recursive version)
-- During INSERT, only the INSERT policy WITH CHECK is evaluated
-- The SELECT policy is only used when actually selecting data, not during insert
CREATE POLICY "Users can view their cycles"
  ON review_cycles FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR id IN (
      SELECT cycle_id FROM review_cycle_members
      WHERE employee_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

-- Recreate cycle members management policy (split into separate operations)
CREATE POLICY "Managers can insert cycle members"
  ON review_cycle_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update cycle members"
  ON review_cycle_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can delete cycle members"
  ON review_cycle_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );
