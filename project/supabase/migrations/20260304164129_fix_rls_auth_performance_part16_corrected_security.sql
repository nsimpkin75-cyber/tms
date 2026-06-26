/*
  # Fix RLS Auth Performance Issues - Part 16 Corrected (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: review_monthly_sessions (2), review_competency_ratings (2), review_rating_approvals (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- review_monthly_sessions table (2 policies)
DROP POLICY IF EXISTS "Managers can manage monthly reviews" ON review_monthly_sessions;
CREATE POLICY "Managers can manage monthly reviews"
  ON review_monthly_sessions
  FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their monthly reviews" ON review_monthly_sessions;
CREATE POLICY "Users can view their monthly reviews"
  ON review_monthly_sessions
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- review_competency_ratings table (2 policies)
DROP POLICY IF EXISTS "Managers can manage competency ratings" ON review_competency_ratings;
CREATE POLICY "Managers can manage competency ratings"
  ON review_competency_ratings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_instances ri
      WHERE ri.id = review_competency_ratings.review_id
      AND ri.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_instances ri
      WHERE ri.id = review_competency_ratings.review_id
      AND ri.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view competency ratings" ON review_competency_ratings;
CREATE POLICY "Users can view competency ratings"
  ON review_competency_ratings
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- review_rating_approvals table (3 policies)
DROP POLICY IF EXISTS "Approvers can update rating approvals" ON review_rating_approvals;
CREATE POLICY "Approvers can update rating approvals"
  ON review_rating_approvals
  FOR UPDATE
  TO authenticated
  USING (approver_id = (SELECT auth.uid()))
  WITH CHECK (approver_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can create rating approvals" ON review_rating_approvals;
CREATE POLICY "Managers can create rating approvals"
  ON review_rating_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view rating approvals" ON review_rating_approvals;
CREATE POLICY "Users can view rating approvals"
  ON review_rating_approvals
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()) OR manager_id = (SELECT auth.uid()) OR approver_id = (SELECT auth.uid()));