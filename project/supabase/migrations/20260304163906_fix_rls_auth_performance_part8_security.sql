/*
  # Fix RLS Auth Performance Issues - Part 8 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: skills_matrix, skill_assessments (4), skill_development_plans (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- skills_matrix table
DROP POLICY IF EXISTS "Admins can manage skills matrix" ON skills_matrix;
CREATE POLICY "Admins can manage skills matrix"
  ON skills_matrix
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- skill_assessments table (4 policies)
DROP POLICY IF EXISTS "Managers can create assessments" ON skill_assessments;
CREATE POLICY "Managers can create assessments"
  ON skill_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    assessed_by = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = skill_assessments.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can update assessments" ON skill_assessments;
CREATE POLICY "Managers can update assessments"
  ON skill_assessments
  FOR UPDATE
  TO authenticated
  USING (assessed_by = (SELECT auth.uid()))
  WITH CHECK (assessed_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team assessments" ON skill_assessments;
CREATE POLICY "Managers can view team assessments"
  ON skill_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = skill_assessments.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own assessments" ON skill_assessments;
CREATE POLICY "Users can view own assessments"
  ON skill_assessments
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- skill_development_plans table (3 policies)
DROP POLICY IF EXISTS "Managers can view team development plans" ON skill_development_plans;
CREATE POLICY "Managers can view team development plans"
  ON skill_development_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = skill_development_plans.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own development plans" ON skill_development_plans;
CREATE POLICY "Users can manage own development plans"
  ON skill_development_plans
  FOR ALL
  TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own development plans" ON skill_development_plans;
CREATE POLICY "Users can view own development plans"
  ON skill_development_plans
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));