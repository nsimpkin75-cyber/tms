/*
  # Fix Auth RLS Initialization - Part 1

  1. Changes
    - Fix RLS policies to use (select auth.uid()) instead of auth.uid()
    - This prevents re-evaluation of auth functions for each row
    
  2. Security
    - Maintains same security posture with better performance
*/

-- Fix values table policies
DROP POLICY IF EXISTS "Users can view active values" ON values;
DROP POLICY IF EXISTS "Admins can create values" ON values;
DROP POLICY IF EXISTS "Admins can update values" ON values;
DROP POLICY IF EXISTS "Admins can delete values" ON values;

CREATE POLICY "Users can view active values"
  ON values FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can create values"
  ON values FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);

CREATE POLICY "Admins can update values"
  ON values FOR UPDATE
  TO authenticated
  USING ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);

CREATE POLICY "Admins can delete values"
  ON values FOR DELETE
  TO authenticated
  USING ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);

-- Fix competencies table policies
DROP POLICY IF EXISTS "Users can view competencies" ON competencies;
DROP POLICY IF EXISTS "Admins can create competencies" ON competencies;
DROP POLICY IF EXISTS "Admins can update competencies" ON competencies;
DROP POLICY IF EXISTS "Admins can delete competencies" ON competencies;

CREATE POLICY "Users can view competencies"
  ON competencies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create competencies"
  ON competencies FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);

CREATE POLICY "Admins can update competencies"
  ON competencies FOR UPDATE
  TO authenticated
  USING ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);

CREATE POLICY "Admins can delete competencies"
  ON competencies FOR DELETE
  TO authenticated
  USING ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);