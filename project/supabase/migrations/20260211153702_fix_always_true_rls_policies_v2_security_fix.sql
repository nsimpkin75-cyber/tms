/*
  # Fix Always-True RLS Policies v2 - Security Fix
  
  1. Purpose
    - Fix RLS policies that have WITH CHECK clauses that are always true
    - This bypasses row-level security and creates security vulnerabilities
  
  2. Changes
    - Update policies to have proper authorization checks
    - Restrict access based on user permissions
*/

-- Job History - Fix "Allow job history inserts" policy
DROP POLICY IF EXISTS "Allow job history inserts" ON job_history;
CREATE POLICY "Allow job history inserts"
  ON job_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow inserting history for authenticated users
    -- Either the user themselves or an admin
    changed_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND admin_type IS NOT NULL
    )
  );

-- Review Cycle Actions - Fix "Authenticated users can insert cycle actions"
DROP POLICY IF EXISTS "Authenticated users can insert cycle actions" ON review_cycle_actions;
CREATE POLICY "Authenticated users can insert cycle actions"
  ON review_cycle_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow managers to insert cycle actions for their cycles
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_actions.cycle_id
      AND rc.manager_id = (select auth.uid())
    )
  );

-- Review Cycle KPIs - Fix "Authenticated users can insert cycle KPIs"
DROP POLICY IF EXISTS "Authenticated users can insert cycle KPIs" ON review_cycle_kpis;
CREATE POLICY "Authenticated users can insert cycle KPIs"
  ON review_cycle_kpis
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow managers to insert KPIs for their cycles
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_kpis.cycle_id
      AND rc.manager_id = (select auth.uid())
    )
  );

-- Review Cycle Members - Fix "Authenticated users can insert cycle members"
DROP POLICY IF EXISTS "Authenticated users can insert cycle members" ON review_cycle_members;
CREATE POLICY "Authenticated users can insert cycle members"
  ON review_cycle_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow managers to add members to their cycles
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_members.cycle_id
      AND rc.manager_id = (select auth.uid())
    )
  );

-- Strategy Notifications - Fix "System can create notifications"
DROP POLICY IF EXISTS "System can create notifications" ON strategy_notifications;
CREATE POLICY "System can create notifications"
  ON strategy_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow admins or the strategy creator to create notifications
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND admin_type IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM strategies s
      WHERE s.id = strategy_notifications.strategy_id
      AND s.creator_id = (select auth.uid())
    )
  );
