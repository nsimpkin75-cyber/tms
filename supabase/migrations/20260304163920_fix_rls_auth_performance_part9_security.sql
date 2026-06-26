/*
  # Fix RLS Auth Performance Issues - Part 9 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: career_pathways, career_plans (3), career_plan_milestones (2)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- career_pathways table
DROP POLICY IF EXISTS "Admins can manage pathways" ON career_pathways;
CREATE POLICY "Admins can manage pathways"
  ON career_pathways
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- career_plans table (3 policies)
DROP POLICY IF EXISTS "Managers can view team career plans" ON career_plans;
CREATE POLICY "Managers can view team career plans"
  ON career_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = career_plans.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own career plans" ON career_plans;
CREATE POLICY "Users can manage own career plans"
  ON career_plans
  FOR ALL
  TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own career plans" ON career_plans;
CREATE POLICY "Users can view own career plans"
  ON career_plans
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- career_plan_milestones table (2 policies)
DROP POLICY IF EXISTS "Users can manage own milestones" ON career_plan_milestones;
CREATE POLICY "Users can manage own milestones"
  ON career_plan_milestones
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans cp
      WHERE cp.id = career_plan_milestones.plan_id
      AND cp.profile_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM career_plans cp
      WHERE cp.id = career_plan_milestones.plan_id
      AND cp.profile_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own milestones" ON career_plan_milestones;
CREATE POLICY "Users can view own milestones"
  ON career_plan_milestones
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans cp
      WHERE cp.id = career_plan_milestones.plan_id
      AND cp.profile_id = (SELECT auth.uid())
    )
  );