/*
  # Fix RLS Auth Performance Issues - Part 14 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: training_module_job_family_links, departments_org (3), job_titles_org (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- training_module_job_family_links table
DROP POLICY IF EXISTS "Admins can manage training links" ON training_module_job_family_links;
CREATE POLICY "Admins can manage training links"
  ON training_module_job_family_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- departments_org table (3 policies)
DROP POLICY IF EXISTS "Admins can delete departments" ON departments_org;
CREATE POLICY "Admins can delete departments"
  ON departments_org
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert departments" ON departments_org;
CREATE POLICY "Admins can insert departments"
  ON departments_org
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update departments" ON departments_org;
CREATE POLICY "Admins can update departments"
  ON departments_org
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- job_titles_org table (3 policies)
DROP POLICY IF EXISTS "Admins can delete job titles" ON job_titles_org;
CREATE POLICY "Admins can delete job titles"
  ON job_titles_org
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert job titles" ON job_titles_org;
CREATE POLICY "Admins can insert job titles"
  ON job_titles_org
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update job titles" ON job_titles_org;
CREATE POLICY "Admins can update job titles"
  ON job_titles_org
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );