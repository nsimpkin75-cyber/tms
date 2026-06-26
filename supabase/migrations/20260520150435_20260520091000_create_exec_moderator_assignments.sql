/*
  # Create Exec Moderator Assignments

  ## Purpose
  Allows admins to assign specific users (by individual profile) or entire access levels
  to have Executive Moderation access. Previously exec moderation was only accessible
  to users with org-level roles (admin/leadership/senior).

  ## New Tables
  - `exec_moderator_assignments`
    - `id` (uuid, pk)
    - `assignment_type` (text): 'user' | 'access_level'
    - `user_id` (uuid, nullable): the specific user being granted exec access
    - `access_level_id` (uuid, nullable): the access level whose members get exec access
    - `assigned_by` (uuid): who created this assignment
    - `notes` (text, nullable): optional note
    - `is_active` (boolean): can be toggled off without deleting
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Admins can manage assignments
  - Authenticated users can read assignments (needed to check own access)
*/

CREATE TABLE IF NOT EXISTS exec_moderator_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_type text NOT NULL CHECK (assignment_type IN ('user', 'access_level')),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  access_level_id uuid REFERENCES access_level_types(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exec_mod_target_check CHECK (
    (assignment_type = 'user' AND user_id IS NOT NULL AND access_level_id IS NULL) OR
    (assignment_type = 'access_level' AND access_level_id IS NOT NULL AND user_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_exec_moderator_assignments_user_id ON exec_moderator_assignments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exec_moderator_assignments_access_level_id ON exec_moderator_assignments(access_level_id) WHERE access_level_id IS NOT NULL;

ALTER TABLE exec_moderator_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage exec moderator assignments"
  ON exec_moderator_assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert exec moderator assignments"
  ON exec_moderator_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update exec moderator assignments"
  ON exec_moderator_assignments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete exec moderator assignments"
  ON exec_moderator_assignments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
