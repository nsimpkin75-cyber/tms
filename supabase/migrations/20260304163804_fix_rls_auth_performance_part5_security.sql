/*
  # Fix RLS Auth Performance Issues - Part 5 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: review_cycles, cycle_kpis, cycle_actions, user_admin_permissions (2), view_as_sessions (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- review_cycles table
DROP POLICY IF EXISTS "Admins can manage cycles" ON review_cycles;
CREATE POLICY "Admins can manage cycles"
  ON review_cycles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- cycle_kpis table
DROP POLICY IF EXISTS "Admins can manage cycle KPIs" ON cycle_kpis;
CREATE POLICY "Admins can manage cycle KPIs"
  ON cycle_kpis
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- cycle_actions table
DROP POLICY IF EXISTS "Admins can manage cycle actions" ON cycle_actions;
CREATE POLICY "Admins can manage cycle actions"
  ON cycle_actions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- user_admin_permissions table (2 policies)
DROP POLICY IF EXISTS "Admins can manage permissions" ON user_admin_permissions;
CREATE POLICY "Admins can manage permissions"
  ON user_admin_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all permissions" ON user_admin_permissions;
CREATE POLICY "Admins can view all permissions"
  ON user_admin_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- view_as_sessions table (3 policies)
DROP POLICY IF EXISTS "Admins can create sessions" ON view_as_sessions;
CREATE POLICY "Admins can create sessions"
  ON view_as_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update own sessions" ON view_as_sessions;
CREATE POLICY "Admins can update own sessions"
  ON view_as_sessions
  FOR UPDATE
  TO authenticated
  USING (admin_id = (SELECT auth.uid()))
  WITH CHECK (admin_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view own sessions" ON view_as_sessions;
CREATE POLICY "Admins can view own sessions"
  ON view_as_sessions
  FOR SELECT
  TO authenticated
  USING (admin_id = (SELECT auth.uid()));