/*
  # Optimize RLS Policies - Part 3 (Standalone Strategies)

  ## Overview
  Continues optimization of RLS policies for standalone strategy tables.

  ## Changes Made
  
  ### Standalone Department Strategies Table
  - Updated "Department managers can create standalone strategies" policy
  - Updated "Leadership and admin can delete standalone strategies" policy
  - Updated "Strategy owners and leadership can update standalone strategies" policy
  - Updated "Users can view standalone strategies in their department" policy
  
  ### Standalone Strategy Actions Table
  - Updated "Assigned users and managers can update standalone actions" policy
  - Updated "Managers and above can create standalone actions" policy
  - Updated "Managers and above can delete standalone actions" policy
  - Updated "Users can view standalone actions in their department" policy
*/

-- ==========================================
-- STANDALONE DEPARTMENT STRATEGIES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Department managers can create standalone strategies" ON standalone_department_strategies;
CREATE POLICY "Department managers can create standalone strategies"
  ON standalone_department_strategies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Leadership and admin can delete standalone strategies" ON standalone_department_strategies;
CREATE POLICY "Leadership and admin can delete standalone strategies"
  ON standalone_department_strategies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Strategy owners and leadership can update standalone strategies" ON standalone_department_strategies;
CREATE POLICY "Strategy owners and leadership can update standalone strategies"
  ON standalone_department_strategies
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  )
  WITH CHECK (
    owner_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view standalone strategies in their department" ON standalone_department_strategies;
CREATE POLICY "Users can view standalone strategies in their department"
  ON standalone_department_strategies
  FOR SELECT
  TO authenticated
  USING (
    department IN (
      SELECT department FROM profiles
      WHERE id = (SELECT auth.uid())
    )
  );

-- ==========================================
-- STANDALONE STRATEGY ACTIONS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Assigned users and managers can update standalone actions" ON standalone_strategy_actions;
CREATE POLICY "Assigned users and managers can update standalone actions"
  ON standalone_strategy_actions
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  )
  WITH CHECK (
    assigned_to = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers and above can create standalone actions" ON standalone_strategy_actions;
CREATE POLICY "Managers and above can create standalone actions"
  ON standalone_strategy_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers and above can delete standalone actions" ON standalone_strategy_actions;
CREATE POLICY "Managers and above can delete standalone actions"
  ON standalone_strategy_actions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view standalone actions in their department" ON standalone_strategy_actions;
CREATE POLICY "Users can view standalone actions in their department"
  ON standalone_strategy_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM standalone_department_strategies sds
      WHERE sds.id = standalone_strategy_actions.standalone_strategy_id
      AND sds.department IN (
        SELECT department FROM profiles WHERE id = (SELECT auth.uid())
      )
    )
  );