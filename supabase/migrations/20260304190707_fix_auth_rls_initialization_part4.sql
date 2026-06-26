/*
  # Fix Auth RLS Initialization - Part 4

  1. Changes
    - Fix one_to_one_scheduled_meetings policies
    
  2. Security
    - Maintains same security posture with better performance
*/

-- Fix one_to_one_scheduled_meetings policies
DROP POLICY IF EXISTS "Users can view their own scheduled meetings" ON one_to_one_scheduled_meetings;
DROP POLICY IF EXISTS "Managers can create scheduled meetings" ON one_to_one_scheduled_meetings;
DROP POLICY IF EXISTS "Managers can update scheduled meetings" ON one_to_one_scheduled_meetings;
DROP POLICY IF EXISTS "Managers can delete scheduled meetings" ON one_to_one_scheduled_meetings;

CREATE POLICY "Users can view their own scheduled meetings"
  ON one_to_one_scheduled_meetings FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
  );

CREATE POLICY "Managers can create scheduled meetings"
  ON one_to_one_scheduled_meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
  );

CREATE POLICY "Managers can update scheduled meetings"
  ON one_to_one_scheduled_meetings FOR UPDATE
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
  );

CREATE POLICY "Managers can delete scheduled meetings"
  ON one_to_one_scheduled_meetings FOR DELETE
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
  );