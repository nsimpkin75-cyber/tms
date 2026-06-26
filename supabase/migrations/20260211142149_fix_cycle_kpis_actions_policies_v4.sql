/*
  # Fix Review Cycle KPIs and Actions Policies - Version 4

  1. Problem
    - INSERT policies on review_cycle_kpis and review_cycle_actions check review_cycles
    - This creates circular dependencies during cycle creation
    - Policies use "ALL" which includes INSERT with qual checks

  2. Solution
    - Separate INSERT policies from other operations
    - Make INSERT policies simple (WITH CHECK only)
    - Keep SELECT/UPDATE/DELETE policies strict

  3. Changes
    - Split ALL policies into separate policies for each operation
    - Simplify INSERT to avoid joins
*/

-- Fix review_cycle_kpis policies
DROP POLICY IF EXISTS "Managers can manage cycle KPIs" ON review_cycle_kpis;
DROP POLICY IF EXISTS "Users can view cycle KPIs" ON review_cycle_kpis;

CREATE POLICY "Users can view cycle KPIs"
  ON review_cycle_kpis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM review_cycle_members
      WHERE cycle_id = review_cycle_kpis.cycle_id AND employee_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Authenticated users can insert cycle KPIs"
  ON review_cycle_kpis FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Managers can update cycle KPIs"
  ON review_cycle_kpis FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can delete cycle KPIs"
  ON review_cycle_kpis FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

-- Fix review_cycle_actions policies
DROP POLICY IF EXISTS "Managers can manage cycle actions" ON review_cycle_actions;
DROP POLICY IF EXISTS "Users can view cycle actions" ON review_cycle_actions;

CREATE POLICY "Users can view cycle actions"
  ON review_cycle_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM review_cycle_members
      WHERE cycle_id = review_cycle_actions.cycle_id AND employee_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Authenticated users can insert cycle actions"
  ON review_cycle_actions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Managers can update cycle actions"
  ON review_cycle_actions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can delete cycle actions"
  ON review_cycle_actions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );
