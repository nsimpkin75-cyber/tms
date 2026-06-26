/*
  # Fix RLS Auth Performance Issues - Part 17 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: review_goal_progress (2), review_notifications (3), review_kpi_templates (2)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- review_goal_progress table (2 policies)
DROP POLICY IF EXISTS "Users can manage goal progress" ON review_goal_progress;
CREATE POLICY "Users can manage goal progress"
  ON review_goal_progress
  FOR ALL
  TO authenticated
  USING (employee_id = (SELECT auth.uid()))
  WITH CHECK (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view goal progress" ON review_goal_progress;
CREATE POLICY "Users can view goal progress"
  ON review_goal_progress
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- review_notifications table (3 policies)
DROP POLICY IF EXISTS "System can create notifications" ON review_notifications;
CREATE POLICY "System can create notifications"
  ON review_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can update their notifications" ON review_notifications;
CREATE POLICY "Users can update their notifications"
  ON review_notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their notifications" ON review_notifications;
CREATE POLICY "Users can view their notifications"
  ON review_notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

-- review_kpi_templates table (2 policies)
DROP POLICY IF EXISTS "Managers can manage KPI templates" ON review_kpi_templates;
CREATE POLICY "Managers can manage KPI templates"
  ON review_kpi_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can view KPI templates" ON review_kpi_templates;
CREATE POLICY "Managers can view KPI templates"
  ON review_kpi_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('manager', 'leadership', 'admin')
    )
  );