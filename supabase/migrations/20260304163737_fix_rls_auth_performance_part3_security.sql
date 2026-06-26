/*
  # Fix RLS Auth Performance Issues - Part 3 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: competency_frameworks, competency_categories, job_families, competency_levels

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- competency_frameworks table
DROP POLICY IF EXISTS "Admins can manage frameworks" ON competency_frameworks;
CREATE POLICY "Admins can manage frameworks"
  ON competency_frameworks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- competency_categories table
DROP POLICY IF EXISTS "Admins can manage categories" ON competency_categories;
CREATE POLICY "Admins can manage categories"
  ON competency_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- job_families table
DROP POLICY IF EXISTS "Leadership can manage job families" ON job_families;
CREATE POLICY "Leadership can manage job families"
  ON job_families
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('leadership', 'admin')
    )
  );

-- competency_levels table
DROP POLICY IF EXISTS "Admins can manage levels" ON competency_levels;
CREATE POLICY "Admins can manage levels"
  ON competency_levels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );