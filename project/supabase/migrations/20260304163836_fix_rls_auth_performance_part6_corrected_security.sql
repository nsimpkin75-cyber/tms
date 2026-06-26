/*
  # Fix RLS Auth Performance Issues - Part 6 Corrected (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: review_instances (4), review_responses (2), profiles (4)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- review_instances table (4 policies)
DROP POLICY IF EXISTS "Managers can create review instances" ON review_instances;
CREATE POLICY "Managers can create review instances"
  ON review_instances
  FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update review instances" ON review_instances;
CREATE POLICY "Managers can update review instances"
  ON review_instances
  FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team review instances" ON review_instances;
CREATE POLICY "Managers can view team review instances"
  ON review_instances
  FOR SELECT
  TO authenticated
  USING (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own review instances" ON review_instances;
CREATE POLICY "Users can view own review instances"
  ON review_instances
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- review_responses table (2 policies)
DROP POLICY IF EXISTS "Managers can manage review responses" ON review_responses;
CREATE POLICY "Managers can manage review responses"
  ON review_responses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_instances ri
      WHERE ri.id = review_responses.instance_id
      AND ri.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own review responses" ON review_responses;
CREATE POLICY "Users can view own review responses"
  ON review_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_instances ri
      WHERE ri.id = review_responses.instance_id
      AND ri.employee_id = (SELECT auth.uid())
    )
  );

-- profiles table (4 policies)
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated can insert own profile" ON profiles;
CREATE POLICY "Authenticated can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));