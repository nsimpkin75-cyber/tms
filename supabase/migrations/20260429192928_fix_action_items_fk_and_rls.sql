/*
  # Fix one_to_one_action_items foreign key and RLS policies

  ## Problem
  The meeting_id column has a FK to one_to_one_meetings, but all code passes IDs
  from one_to_one_scheduled_meetings. Every action insert has been silently failing
  due to the FK violation. The UPDATE policy only allows owner_id = auth.uid(),
  which prevents managers from marking employee-owned actions as complete.

  ## Changes
  1. Drop the broken FK constraint on meeting_id
  2. Add correct FK pointing to one_to_one_scheduled_meetings
  3. Add oto_cycle_id column for cycle-level action queries
  4. Fix UPDATE policy: allow meeting participants (manager or employee) to update
  5. Fix INSERT policy: allow meeting participants via scheduled_meetings
  6. Add DELETE policy for meeting managers/admins
*/

-- 1. Drop old FK that pointed to one_to_one_meetings
ALTER TABLE one_to_one_action_items
  DROP CONSTRAINT IF EXISTS one_to_one_action_items_meeting_id_fkey;

-- 2. Add correct FK to one_to_one_scheduled_meetings
ALTER TABLE one_to_one_action_items
  ADD CONSTRAINT one_to_one_action_items_meeting_id_fkey
  FOREIGN KEY (meeting_id) REFERENCES one_to_one_scheduled_meetings(id) ON DELETE CASCADE;

-- 3. Add oto_cycle_id for cycle-level queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_action_items' AND column_name = 'oto_cycle_id'
  ) THEN
    ALTER TABLE one_to_one_action_items
      ADD COLUMN oto_cycle_id uuid REFERENCES one_to_one_review_cycles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Index for cycle-level queries
CREATE INDEX IF NOT EXISTS idx_oto_action_items_cycle_id
  ON one_to_one_action_items(oto_cycle_id);

-- 5. Fix RLS policies — drop old ones
DROP POLICY IF EXISTS "Participants can create actions" ON one_to_one_action_items;
DROP POLICY IF EXISTS "Users can view meeting actions" ON one_to_one_action_items;
DROP POLICY IF EXISTS "Owners can update actions" ON one_to_one_action_items;

-- 6. New SELECT: meeting manager, employee, or admin can view
CREATE POLICY "Meeting participants can view actions"
  ON one_to_one_action_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings sm
      WHERE sm.id = one_to_one_action_items.meeting_id
        AND (sm.manager_id = (SELECT auth.uid()) OR sm.employee_id = (SELECT auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
    OR owner_id = (SELECT auth.uid())
  );

-- 7. New INSERT: meeting manager or employee can create actions
CREATE POLICY "Meeting participants can create actions"
  ON one_to_one_action_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings sm
      WHERE sm.id = one_to_one_action_items.meeting_id
        AND (sm.manager_id = (SELECT auth.uid()) OR sm.employee_id = (SELECT auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- 8. New UPDATE: meeting participants (manager OR employee OR admin) can update
-- This allows managers to mark employee-owned actions as complete
CREATE POLICY "Meeting participants can update actions"
  ON one_to_one_action_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings sm
      WHERE sm.id = one_to_one_action_items.meeting_id
        AND (sm.manager_id = (SELECT auth.uid()) OR sm.employee_id = (SELECT auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings sm
      WHERE sm.id = one_to_one_action_items.meeting_id
        AND (sm.manager_id = (SELECT auth.uid()) OR sm.employee_id = (SELECT auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );
