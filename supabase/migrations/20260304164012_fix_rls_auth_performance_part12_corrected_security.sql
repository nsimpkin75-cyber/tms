/*
  # Fix RLS Auth Performance Issues - Part 12 Corrected (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: performance_ratings (4), rating_approval_workflow (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- performance_ratings table (4 policies)
DROP POLICY IF EXISTS "Managers can create ratings" ON performance_ratings;
CREATE POLICY "Managers can create ratings"
  ON performance_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    rater_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = performance_ratings.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can update ratings" ON performance_ratings;
CREATE POLICY "Managers can update ratings"
  ON performance_ratings
  FOR UPDATE
  TO authenticated
  USING (rater_id = (SELECT auth.uid()))
  WITH CHECK (rater_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team ratings" ON performance_ratings;
CREATE POLICY "Managers can view team ratings"
  ON performance_ratings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = performance_ratings.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own ratings" ON performance_ratings;
CREATE POLICY "Users can view own ratings"
  ON performance_ratings
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- rating_approval_workflow table (3 policies)
DROP POLICY IF EXISTS "Approvers can update workflow" ON rating_approval_workflow;
CREATE POLICY "Approvers can update workflow"
  ON rating_approval_workflow
  FOR UPDATE
  TO authenticated
  USING (approver_id = (SELECT auth.uid()))
  WITH CHECK (approver_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Approvers can view workflow" ON rating_approval_workflow;
CREATE POLICY "Approvers can view workflow"
  ON rating_approval_workflow
  FOR SELECT
  TO authenticated
  USING (approver_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "System can create workflow" ON rating_approval_workflow;
CREATE POLICY "System can create workflow"
  ON rating_approval_workflow
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('manager', 'leadership', 'admin')
    )
  );