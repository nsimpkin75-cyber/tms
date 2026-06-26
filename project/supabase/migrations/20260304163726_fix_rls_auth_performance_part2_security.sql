/*
  # Fix RLS Auth Performance Issues - Part 2 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: action_items (3), training_sessions, training_attendees (2)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- action_items table (3 policies)
DROP POLICY IF EXISTS "Managers can view team action items" ON action_items;
CREATE POLICY "Managers can view team action items"
  ON action_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.manager_id = (SELECT auth.uid())
      AND p.id = action_items.owner_id
    )
  );

DROP POLICY IF EXISTS "Users can manage own action items" ON action_items;
CREATE POLICY "Users can manage own action items"
  ON action_items
  FOR ALL
  TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own action items" ON action_items;
CREATE POLICY "Users can view own action items"
  ON action_items
  FOR SELECT
  TO authenticated
  USING (owner_id = (SELECT auth.uid()));

-- training_sessions table
DROP POLICY IF EXISTS "L&D can manage training sessions" ON training_sessions;
CREATE POLICY "L&D can manage training sessions"
  ON training_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('admin', 'leadership')
    )
  );

-- training_attendees table (2 policies)
DROP POLICY IF EXISTS "Users can book own training" ON training_attendees;
CREATE POLICY "Users can book own training"
  ON training_attendees
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can cancel own training" ON training_attendees;
CREATE POLICY "Users can cancel own training"
  ON training_attendees
  FOR UPDATE
  TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));