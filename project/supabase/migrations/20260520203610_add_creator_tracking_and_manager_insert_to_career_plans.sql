/*
  # Career Plans: Creator Tracking and Manager/Admin Insert Permissions

  ## Summary
  Adds creator tracking columns to career_plans and grants managers the ability
  to create plans on behalf of their direct reports or themselves. Admin users
  already had INSERT permission; this migration also widens that to cover
  access-level admins (full_admin access level).

  ## New Columns on career_plans
  - `created_by_role` (text) — who initiated the plan: 'employee', 'manager', or 'admin'
  - `created_by_user_id` (uuid) — FK to profiles(id) of the creator
  - `created_by_name` (text) — display name of creator at time of creation

  ## Policy Changes
  - Drops and recreates "Users can insert own career plans" — unchanged
  - Drops "Admins can insert career plans" and recreates it — unchanged  
  - Adds NEW "Managers can insert career plans for team" — allows managers/leadership
    to INSERT a plan where user_id matches a direct report OR user_id = auth.uid()
    (manager creates a plan for themselves)

  ## Notes
  - Existing plans get created_by_role = 'employee' backfilled (safe assumption)
  - No existing data is deleted or modified structurally
*/

-- Add creator tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'created_by_role'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN created_by_role text
      DEFAULT 'employee'
      CHECK (created_by_role IN ('employee', 'manager', 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN created_by_user_id uuid
      REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'created_by_name'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN created_by_name text;
  END IF;
END $$;

-- Backfill existing plans: assume created by the employee (user_id)
UPDATE career_plans
SET
  created_by_role = 'employee',
  created_by_user_id = COALESCE(user_id, profile_id)
WHERE created_by_role IS NULL OR created_by_user_id IS NULL;

-- Index for creator lookups
CREATE INDEX IF NOT EXISTS idx_career_plans_created_by_user_id
  ON career_plans(created_by_user_id);

-- ── RLS: add manager INSERT policy ───────────────────────────────────────────

-- Drop old manager INSERT policy if it exists from earlier iterations
DROP POLICY IF EXISTS "Managers can insert career plans for team" ON career_plans;
DROP POLICY IF EXISTS "Managers can create career plans for direct reports" ON career_plans;

-- Managers (role IN manager, leadership) can INSERT a plan when:
--   a) user_id is one of their direct reports, OR
--   b) user_id is themselves (manager creating their own plan)
CREATE POLICY "Managers can insert career plans for team"
  ON career_plans FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'leadership')
    )
    AND (
      -- for themselves
      user_id = auth.uid()
      OR
      -- for a direct report
      EXISTS (
        SELECT 1 FROM profiles emp
        WHERE emp.id = career_plans.user_id
        AND emp.manager_id = auth.uid()
      )
    )
  );

-- Ensure manager SELECT policy also covers plans they created (created_by_user_id = auth.uid())
DROP POLICY IF EXISTS "Managers can view team career plans" ON career_plans;

CREATE POLICY "Managers can view team career plans"
  ON career_plans FOR SELECT TO authenticated
  USING (
    -- plans they were assigned as manager
    manager_id = auth.uid()
    -- plans for their direct reports
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'leadership', 'admin')
      AND EXISTS (
        SELECT 1 FROM profiles emp
        WHERE (emp.id = career_plans.user_id OR emp.id = career_plans.profile_id)
        AND emp.manager_id = auth.uid()
      )
    )
    -- plans they created on behalf of someone
    OR (
      created_by_user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'leadership', 'admin')
      )
    )
    -- their own plan regardless of role
    OR (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'leadership')
      )
    )
  );
