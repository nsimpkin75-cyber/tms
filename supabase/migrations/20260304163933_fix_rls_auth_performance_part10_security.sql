/*
  # Fix RLS Auth Performance Issues - Part 10 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: strategic_goals, goal_kpis, goal_actions, goal_departments

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- strategic_goals table
DROP POLICY IF EXISTS "Leadership can manage goals" ON strategic_goals;
CREATE POLICY "Leadership can manage goals"
  ON strategic_goals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('leadership', 'admin')
    )
  );

-- goal_kpis table
DROP POLICY IF EXISTS "Leadership can manage goal KPIs" ON goal_kpis;
CREATE POLICY "Leadership can manage goal KPIs"
  ON goal_kpis
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('leadership', 'admin')
    )
  );

-- goal_actions table
DROP POLICY IF EXISTS "Leadership can manage goal actions" ON goal_actions;
CREATE POLICY "Leadership can manage goal actions"
  ON goal_actions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('leadership', 'admin')
    )
  );

-- goal_departments table
DROP POLICY IF EXISTS "Leadership can manage goal departments" ON goal_departments;
CREATE POLICY "Leadership can manage goal departments"
  ON goal_departments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('leadership', 'admin')
    )
  );