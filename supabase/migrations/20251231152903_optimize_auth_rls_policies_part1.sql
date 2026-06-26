/*
  # Optimize RLS Policies - Part 1 (Profiles, System Settings, Departments, Job Titles)

  ## Overview
  This migration optimizes Row Level Security (RLS) policies by wrapping auth function calls
  with SELECT statements. This prevents the auth functions from being re-evaluated for each
  row, dramatically improving query performance at scale.

  ## Changes Made
  
  ### Profiles Table
  - Updated "Admins can update user active status" policy
  
  ### System Settings Table
  - Updated "Admins can insert settings" policy
  - Updated "Admins can update settings" policy
  
  ### Departments Table
  - Updated "Admins can create departments" policy
  - Updated "Admins can delete departments" policy
  - Updated "Admins can update departments" policy
  
  ### Job Titles Table
  - Updated "Admins can create job titles" policy
  - Updated "Admins can delete job titles" policy
  - Updated "Admins can update job titles" policy

  ## Performance Impact
  This optimization prevents auth functions from being called once per row, instead calling
  them once per query. This can result in 10-100x performance improvements on large tables.
*/

-- ==========================================
-- PROFILES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can update user active status" ON profiles;
CREATE POLICY "Admins can update user active status"
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

-- ==========================================
-- SYSTEM SETTINGS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can insert settings" ON system_settings;
CREATE POLICY "Admins can insert settings"
  ON system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update settings" ON system_settings;
CREATE POLICY "Admins can update settings"
  ON system_settings
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

-- ==========================================
-- DEPARTMENTS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can create departments" ON departments;
CREATE POLICY "Admins can create departments"
  ON departments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete departments" ON departments;
CREATE POLICY "Admins can delete departments"
  ON departments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update departments" ON departments;
CREATE POLICY "Admins can update departments"
  ON departments
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

-- ==========================================
-- JOB TITLES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can create job titles" ON job_titles;
CREATE POLICY "Admins can create job titles"
  ON job_titles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete job titles" ON job_titles;
CREATE POLICY "Admins can delete job titles"
  ON job_titles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update job titles" ON job_titles;
CREATE POLICY "Admins can update job titles"
  ON job_titles
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