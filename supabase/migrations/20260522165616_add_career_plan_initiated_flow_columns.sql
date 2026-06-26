/*
  # Career Plan Initiated Flow — New Columns and Status Values

  Extends `career_plans` to support plans initiated by Managers, Dept Leads,
  and Admins on behalf of employees, with a multi-stage handoff workflow.

  ## New Columns
  - `started_from` — who originated the plan: 'employee_self' | 'manager' | 'dept_lead' | 'admin'
  - `current_owner_stage` — whose turn it is to act: 'employee' | 'manager' | 'completed'
  - `initiator_notes` — free-text notes from the manager/admin who started the plan
  - `way_forward_objectives` — JSONB array of objective strings set by manager in Stage 3
  - `way_forward_notes` — manager's closing notes when confirming the plan
  - `way_forward_confirmed_at` — timestamp when manager confirmed Way Forward
  - `way_forward_confirmed_by` — uuid of the confirming manager

  ## New Status Values
  - `pending_employee_input` — plan started by manager/admin, waiting for employee to complete quiz steps 2-4
  - `pending_manager_wayforward` — employee completed their steps, waiting for manager to add Way Forward
  - `in_progress` — manager confirmed Way Forward, plan is now active
  - `completed` — plan fully completed
*/

-- Add new columns to career_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'started_from'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN started_from text DEFAULT 'employee_self';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'current_owner_stage'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN current_owner_stage text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'initiator_notes'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN initiator_notes text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'way_forward_objectives'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN way_forward_objectives jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'way_forward_notes'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN way_forward_notes text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'way_forward_confirmed_at'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN way_forward_confirmed_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'way_forward_confirmed_by'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN way_forward_confirmed_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Drop old status check constraint if it exists, then recreate with new values
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'career_plans'::regclass
    AND contype = 'c'
    AND conname ILIKE '%status%';
  
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE career_plans DROP CONSTRAINT ' || quote_ident(v_constraint_name);
  END IF;
END $$;

ALTER TABLE career_plans
  ADD CONSTRAINT career_plans_status_check CHECK (
    status IN (
      'draft',
      'confirmed',
      'sent_to_manager',
      'manager_approved',
      'admin_approved',
      'rejected',
      'pending_employee_input',
      'pending_manager_wayforward',
      'in_progress',
      'completed'
    )
  );

-- Drop existing policies before recreating
DO $$
BEGIN
  DROP POLICY IF EXISTS "Managers can create career plans for their reports" ON career_plans;
  DROP POLICY IF EXISTS "Managers and dept leads can view career plans for their reports" ON career_plans;
  DROP POLICY IF EXISTS "Career plan update by owner or manager or admin" ON career_plans;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- RLS: managers can insert career plans on behalf of their reports
CREATE POLICY "Managers can create career plans for their reports"
  ON career_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = profile_id)
    OR
    (
      auth.uid() = created_by_user_id
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.role IN ('manager', 'admin')
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      JOIN profiles emp ON emp.id = career_plans.profile_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND ((alt.permissions ->> 'dashboard_dept_lead')::boolean = true)
        AND emp.department = viewer.department
    )
  );

-- RLS: managers and dept leads can view plans for their reports
CREATE POLICY "Managers and dept leads can view career plans for their reports"
  ON career_plans FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = profile_id)
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles emp
      WHERE emp.id = career_plans.profile_id
        AND emp.manager_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      JOIN profiles emp ON emp.id = career_plans.profile_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND ((alt.permissions ->> 'dashboard_dept_lead')::boolean = true)
        AND emp.department = viewer.department
    )
  );

-- RLS: allow update by employee or manager or admin
CREATE POLICY "Career plan update by owner or manager or admin"
  ON career_plans FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = profile_id)
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role IN ('manager', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      JOIN profiles emp ON emp.id = career_plans.profile_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND ((alt.permissions ->> 'dashboard_dept_lead')::boolean = true)
        AND emp.department = viewer.department
    )
  )
  WITH CHECK (
    (auth.uid() = profile_id)
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role IN ('manager', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      JOIN profiles emp ON emp.id = career_plans.profile_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND ((alt.permissions ->> 'dashboard_dept_lead')::boolean = true)
        AND emp.department = viewer.department
    )
  );

-- Notifications table
CREATE TABLE IF NOT EXISTS career_plan_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_plan_id uuid NOT NULL REFERENCES career_plans(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id),
  sender_id uuid REFERENCES auth.users(id),
  notification_type text NOT NULL,
  message text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE career_plan_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own career plan notifications" ON career_plan_notifications;
DROP POLICY IF EXISTS "Authenticated users can insert career plan notifications" ON career_plan_notifications;
DROP POLICY IF EXISTS "Users can mark their own notifications as read" ON career_plan_notifications;

CREATE POLICY "Users can view their own career plan notifications"
  ON career_plan_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

CREATE POLICY "Authenticated users can insert career plan notifications"
  ON career_plan_notifications FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (SELECT auth.uid()));

CREATE POLICY "Users can mark their own notifications as read"
  ON career_plan_notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_career_plan_notifs_recipient ON career_plan_notifications(recipient_id, read_at);
CREATE INDEX IF NOT EXISTS idx_career_plan_notifs_plan ON career_plan_notifications(career_plan_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_started_from ON career_plans(started_from);
CREATE INDEX IF NOT EXISTS idx_career_plans_profile_status ON career_plans(profile_id, status);
