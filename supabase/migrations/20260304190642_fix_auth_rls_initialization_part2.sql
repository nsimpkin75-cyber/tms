/*
  # Fix Auth RLS Initialization - Part 2

  1. Changes
    - Fix competency_levels table RLS policies
    
  2. Security
    - Maintains same security posture with better performance
*/

-- Fix competency_levels table policies
DROP POLICY IF EXISTS "Users can view competency levels" ON competency_levels;
DROP POLICY IF EXISTS "Admins can create competency levels" ON competency_levels;
DROP POLICY IF EXISTS "Admins can update competency levels" ON competency_levels;
DROP POLICY IF EXISTS "Admins can delete competency levels" ON competency_levels;

CREATE POLICY "Users can view competency levels"
  ON competency_levels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create competency levels"
  ON competency_levels FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);

CREATE POLICY "Admins can update competency levels"
  ON competency_levels FOR UPDATE
  TO authenticated
  USING ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);

CREATE POLICY "Admins can delete competency levels"
  ON competency_levels FOR DELETE
  TO authenticated
  USING ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);