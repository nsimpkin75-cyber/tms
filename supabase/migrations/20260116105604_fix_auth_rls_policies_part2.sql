/*
  # Fix Auth RLS Policies - Part 2
  
  1. Performance Optimization
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - Prevents re-evaluation of auth.uid() for each row
  
  2. Tables Updated (Part 2)
    - review_rating_approvals
    - review_goal_progress
    - review_notifications
    - review_kpi_templates
    - review_kpis
*/

-- Review Rating Approvals
DROP POLICY IF EXISTS "Approvers can view rating approvals" ON review_rating_approvals;
CREATE POLICY "Approvers can view rating approvals"
  ON review_rating_approvals FOR SELECT
  TO authenticated
  USING (
    approver_id = (select auth.uid())
    OR manager_id = (select auth.uid())
    OR employee_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "System can create rating approvals" ON review_rating_approvals;
CREATE POLICY "System can create rating approvals"
  ON review_rating_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Approvers can update rating approvals" ON review_rating_approvals;
CREATE POLICY "Approvers can update rating approvals"
  ON review_rating_approvals FOR UPDATE
  TO authenticated
  USING (
    approver_id = (select auth.uid())
  );

-- Review Goal Progress
DROP POLICY IF EXISTS "Users can view their goal progress" ON review_goal_progress;
CREATE POLICY "Users can view their goal progress"
  ON review_goal_progress FOR SELECT
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p1
      INNER JOIN profiles p2 ON p2.manager_id = p1.id
      WHERE p1.id = (select auth.uid())
      AND p2.id = employee_id
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Employees and managers can manage goal progress" ON review_goal_progress;
CREATE POLICY "Employees and managers can manage goal progress"
  ON review_goal_progress FOR ALL
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p1
      INNER JOIN profiles p2 ON p2.manager_id = p1.id
      WHERE p1.id = (select auth.uid())
      AND p2.id = employee_id
    )
  );

-- Review Notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON review_notifications;
CREATE POLICY "Users can view their notifications"
  ON review_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their notifications" ON review_notifications;
CREATE POLICY "Users can update their notifications"
  ON review_notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = (select auth.uid()));

-- Review KPI Templates
DROP POLICY IF EXISTS "Managers can create KPI templates" ON review_kpi_templates;
CREATE POLICY "Managers can create KPI templates"
  ON review_kpi_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can view their templates" ON review_kpi_templates;
CREATE POLICY "Managers can view their templates"
  ON review_kpi_templates FOR SELECT
  TO authenticated
  USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can update their templates" ON review_kpi_templates;
CREATE POLICY "Managers can update their templates"
  ON review_kpi_templates FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- Review KPIs
DROP POLICY IF EXISTS "Managers can assign KPIs" ON review_kpis;
CREATE POLICY "Managers can assign KPIs"
  ON review_kpis FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid())
      AND (p.role IN ('manager', 'leadership', 'admin')
      OR p.id IN (
        SELECT manager_id FROM profiles WHERE id = employee_id
      ))
    )
  );

DROP POLICY IF EXISTS "Users can view their KPIs" ON review_kpis;
CREATE POLICY "Users can view their KPIs"
  ON review_kpis FOR SELECT
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (role IN ('leadership', 'admin')
      OR id = (SELECT manager_id FROM profiles WHERE id = employee_id))
    )
  );

DROP POLICY IF EXISTS "Managers can update KPIs" ON review_kpis;
CREATE POLICY "Managers can update KPIs"
  ON review_kpis FOR UPDATE
  TO authenticated
  USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND id = (SELECT manager_id FROM profiles WHERE id = employee_id)
    )
  );
