/*
  # Fix RLS Auth Performance Issues - Part 15 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: review_six_month_performance (3), review_kpis (2), review_weekly_checkins (2)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- review_six_month_performance table (3 policies)
DROP POLICY IF EXISTS "Managers can insert 6-month reviews" ON review_six_month_performance;
CREATE POLICY "Managers can insert 6-month reviews"
  ON review_six_month_performance
  FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update 6-month reviews" ON review_six_month_performance;
CREATE POLICY "Managers can update 6-month reviews"
  ON review_six_month_performance
  FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their 6-month reviews" ON review_six_month_performance;
CREATE POLICY "Users can view their 6-month reviews"
  ON review_six_month_performance
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- review_kpis table (2 policies)
DROP POLICY IF EXISTS "Managers can manage KPIs" ON review_kpis;
CREATE POLICY "Managers can manage KPIs"
  ON review_kpis
  FOR ALL
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their KPIs" ON review_kpis;
CREATE POLICY "Users can view their KPIs"
  ON review_kpis
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- review_weekly_checkins table (2 policies)
DROP POLICY IF EXISTS "Users can manage their weekly checkins" ON review_weekly_checkins;
CREATE POLICY "Users can manage their weekly checkins"
  ON review_weekly_checkins
  FOR ALL
  TO authenticated
  USING (employee_id = (SELECT auth.uid()))
  WITH CHECK (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their weekly checkins" ON review_weekly_checkins;
CREATE POLICY "Users can view their weekly checkins"
  ON review_weekly_checkins
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));