/*
  # Fix RLS Auth Performance Issues - Part 11 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: training_courses, training_modules, module_content_items, training_completions (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- training_courses table
DROP POLICY IF EXISTS "Admins can manage courses" ON training_courses;
CREATE POLICY "Admins can manage courses"
  ON training_courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- training_modules table
DROP POLICY IF EXISTS "Admins can manage modules" ON training_modules;
CREATE POLICY "Admins can manage modules"
  ON training_modules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- module_content_items table
DROP POLICY IF EXISTS "Admins can manage content items" ON module_content_items;
CREATE POLICY "Admins can manage content items"
  ON module_content_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- training_completions table (3 policies)
DROP POLICY IF EXISTS "Managers can view team completions" ON training_completions;
CREATE POLICY "Managers can view team completions"
  ON training_completions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = training_completions.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own completions" ON training_completions;
CREATE POLICY "Users can manage own completions"
  ON training_completions
  FOR ALL
  TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own completions" ON training_completions;
CREATE POLICY "Users can view own completions"
  ON training_completions
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));