/*
  # Optimize RLS Policies - Part 2 (Goal Milestones and Strategy Tables)

  ## Overview
  Continues optimization of RLS policies by wrapping auth function calls with SELECT statements.

  ## Changes Made
  
  ### Goal Milestones Table
  - Updated "Authorized users can create goal milestones" policy
  - Updated "Authorized users can delete goal milestones" policy
  - Updated "Authorized users can update goal milestones" policy
  - Updated "Users can view relevant goal milestones" policy
  
  ### Business Strategies Table
  - Updated "Admin can delete business strategies" policy
  - Updated "Leadership and admin can create business strategies" policy
  - Updated "Leadership and admin can update business strategies" policy
  
  ### Department Strategies Table
  - Updated "Department heads and leadership can create department strategies" policy
  - Updated "Department owners and leadership can update department strategies" policy
  - Updated "Leadership and admin can delete department strategies" policy
  - Updated "Users can view department strategies in their department" policy
  
  ### Strategy Actions Table
  - Updated "Assigned users and managers can update actions" policy
  - Updated "Managers and above can create actions" policy
  - Updated "Managers and above can delete actions" policy
  - Updated "Users can view actions in their department" policy
*/

-- ==========================================
-- GOAL MILESTONES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Authorized users can create goal milestones" ON goal_milestones;
CREATE POLICY "Authorized users can create goal milestones"
  ON goal_milestones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    assigned_to_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Authorized users can delete goal milestones" ON goal_milestones;
CREATE POLICY "Authorized users can delete goal milestones"
  ON goal_milestones
  FOR DELETE
  TO authenticated
  USING (
    assigned_to_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Authorized users can update goal milestones" ON goal_milestones;
CREATE POLICY "Authorized users can update goal milestones"
  ON goal_milestones
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  )
  WITH CHECK (
    assigned_to_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view relevant goal milestones" ON goal_milestones;
CREATE POLICY "Users can view relevant goal milestones"
  ON goal_milestones
  FOR SELECT
  TO authenticated
  USING (
    assigned_to_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

-- ==========================================
-- BUSINESS STRATEGIES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admin can delete business strategies" ON business_strategies;
CREATE POLICY "Admin can delete business strategies"
  ON business_strategies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Leadership and admin can create business strategies" ON business_strategies;
CREATE POLICY "Leadership and admin can create business strategies"
  ON business_strategies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Leadership and admin can update business strategies" ON business_strategies;
CREATE POLICY "Leadership and admin can update business strategies"
  ON business_strategies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

-- ==========================================
-- DEPARTMENT STRATEGIES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Department heads and leadership can create department strategie" ON department_strategies;
CREATE POLICY "Department heads and leadership can create department strategie"
  ON department_strategies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Department owners and leadership can update department strategi" ON department_strategies;
CREATE POLICY "Department owners and leadership can update department strategi"
  ON department_strategies
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

DROP POLICY IF EXISTS "Leadership and admin can delete department strategies" ON department_strategies;
CREATE POLICY "Leadership and admin can delete department strategies"
  ON department_strategies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view department strategies in their department" ON department_strategies;
CREATE POLICY "Users can view department strategies in their department"
  ON department_strategies
  FOR SELECT
  TO authenticated
  USING (
    department IN (
      SELECT department FROM profiles
      WHERE id = (SELECT auth.uid())
    )
  );

-- ==========================================
-- STRATEGY ACTIONS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Assigned users and managers can update actions" ON strategy_actions;
CREATE POLICY "Assigned users and managers can update actions"
  ON strategy_actions
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

DROP POLICY IF EXISTS "Managers and above can create actions" ON strategy_actions;
CREATE POLICY "Managers and above can create actions"
  ON strategy_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers and above can delete actions" ON strategy_actions;
CREATE POLICY "Managers and above can delete actions"
  ON strategy_actions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view actions in their department" ON strategy_actions;
CREATE POLICY "Users can view actions in their department"
  ON strategy_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM department_strategies ds
      WHERE ds.id = strategy_actions.department_strategy_id
      AND ds.department IN (
        SELECT department FROM profiles WHERE id = (SELECT auth.uid())
      )
    )
  );