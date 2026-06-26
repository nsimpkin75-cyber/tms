/*
  # Fix Auth RLS Policies - Part 1
  
  1. Performance Optimization
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - Prevents re-evaluation of auth.uid() for each row
    - Improves query performance at scale
  
  2. Tables Updated (Part 1)
    - review_competency_ratings
    - review_weekly_checkins
    - review_monthly_sessions
    - review_six_month_performance
*/

-- Review Competency Ratings
DROP POLICY IF EXISTS "Users can view their competency ratings" ON review_competency_ratings;
CREATE POLICY "Users can view their competency ratings"
  ON review_competency_ratings FOR SELECT
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM review_monthly_sessions
      WHERE id = review_id
      AND manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can manage competency ratings" ON review_competency_ratings;
CREATE POLICY "Managers can manage competency ratings"
  ON review_competency_ratings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_monthly_sessions
      WHERE id = review_id
      AND manager_id = (select auth.uid())
    )
  );

-- Review Weekly Checkins
DROP POLICY IF EXISTS "Employees and managers can create weekly check-ins" ON review_weekly_checkins;
CREATE POLICY "Employees and managers can create weekly check-ins"
  ON review_weekly_checkins FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (select auth.uid())
    OR manager_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Employees and managers can view weekly check-ins" ON review_weekly_checkins;
CREATE POLICY "Employees and managers can view weekly check-ins"
  ON review_weekly_checkins FOR SELECT
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR manager_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Employees and managers can update weekly check-ins" ON review_weekly_checkins;
CREATE POLICY "Employees and managers can update weekly check-ins"
  ON review_weekly_checkins FOR UPDATE
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR manager_id = (select auth.uid())
  );

-- Review Monthly Sessions
DROP POLICY IF EXISTS "Managers can create monthly reviews" ON review_monthly_sessions;
CREATE POLICY "Managers can create monthly reviews"
  ON review_monthly_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees and managers can view monthly reviews" ON review_monthly_sessions;
CREATE POLICY "Employees and managers can view monthly reviews"
  ON review_monthly_sessions FOR SELECT
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR manager_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can update monthly reviews" ON review_monthly_sessions;
CREATE POLICY "Managers can update monthly reviews"
  ON review_monthly_sessions FOR UPDATE
  TO authenticated
  USING (
    manager_id = (select auth.uid())
    OR employee_id = (select auth.uid())
  );

-- Review Six Month Performance
DROP POLICY IF EXISTS "Managers can create 6-month reviews" ON review_six_month_performance;
CREATE POLICY "Managers can create 6-month reviews"
  ON review_six_month_performance FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can view their 6-month reviews" ON review_six_month_performance;
CREATE POLICY "Users can view their 6-month reviews"
  ON review_six_month_performance FOR SELECT
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR manager_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can update 6-month reviews" ON review_six_month_performance;
CREATE POLICY "Managers can update 6-month reviews"
  ON review_six_month_performance FOR UPDATE
  TO authenticated
  USING (
    manager_id = (select auth.uid())
  );
