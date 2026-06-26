/*
  # Fix RLS Auth Performance Issues - Part 7 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: one_to_one_meetings (4), one_to_one_notes (3), one_to_one_action_items (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- one_to_one_meetings table (4 policies)
DROP POLICY IF EXISTS "Managers can create meetings" ON one_to_one_meetings;
CREATE POLICY "Managers can create meetings"
  ON one_to_one_meetings
  FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update meetings" ON one_to_one_meetings;
CREATE POLICY "Managers can update meetings"
  ON one_to_one_meetings
  FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team meetings" ON one_to_one_meetings;
CREATE POLICY "Managers can view team meetings"
  ON one_to_one_meetings
  FOR SELECT
  TO authenticated
  USING (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own meetings" ON one_to_one_meetings;
CREATE POLICY "Users can view own meetings"
  ON one_to_one_meetings
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- one_to_one_notes table (3 policies)
DROP POLICY IF EXISTS "Creators can update notes" ON one_to_one_notes;
CREATE POLICY "Creators can update notes"
  ON one_to_one_notes
  FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Participants can create notes" ON one_to_one_notes;
CREATE POLICY "Participants can create notes"
  ON one_to_one_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_meetings m
      WHERE m.id = one_to_one_notes.meeting_id
      AND (m.manager_id = (SELECT auth.uid()) OR m.employee_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can view meeting notes" ON one_to_one_notes;
CREATE POLICY "Users can view meeting notes"
  ON one_to_one_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_meetings m
      WHERE m.id = one_to_one_notes.meeting_id
      AND (m.manager_id = (SELECT auth.uid()) OR m.employee_id = (SELECT auth.uid()))
    )
  );

-- one_to_one_action_items table (3 policies)
DROP POLICY IF EXISTS "Owners can update actions" ON one_to_one_action_items;
CREATE POLICY "Owners can update actions"
  ON one_to_one_action_items
  FOR UPDATE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Participants can create actions" ON one_to_one_action_items;
CREATE POLICY "Participants can create actions"
  ON one_to_one_action_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_meetings m
      WHERE m.id = one_to_one_action_items.meeting_id
      AND (m.manager_id = (SELECT auth.uid()) OR m.employee_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can view meeting actions" ON one_to_one_action_items;
CREATE POLICY "Users can view meeting actions"
  ON one_to_one_action_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_meetings m
      WHERE m.id = one_to_one_action_items.meeting_id
      AND (m.manager_id = (SELECT auth.uid()) OR m.employee_id = (SELECT auth.uid()))
    )
  );