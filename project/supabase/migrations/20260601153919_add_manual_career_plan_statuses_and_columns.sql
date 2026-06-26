/*
  # Manual Career Plan — Status Values and New Columns

  ## Summary
  Adds support for manually-created career plans by managers and admins that skip the
  employee quiz flow and go straight to the Way Forward / GROW action planning stage.

  ## Changes

  ### 1. career_plans status constraint
  Adds two new valid status values:
  - `active` — plan has been confirmed (manager clicked "Confirm Plan"); counts in dashboards and reviews
  - `pending_manager_confirmation` — admin created plan and sent it to the manager for confirmation

  ### 2. New columns on career_plans
  - `plan_title` (text) — optional free-text title for the plan (distinct from goal_role_title)
  - `plan_description` (text) — optional description / context for the plan
  - `is_manual` (boolean, default false) — flags plans created via the manual flow (skips quiz)

  ### 3. career_plan_actions owner_name column
  - `owner_name` (text) — free-text field for action owner (in addition to added_by uuid)

  ## Notes
  - Does not affect existing quiz-based plans
  - `active` is intentionally separate from `in_progress` so quiz plans are unaffected
  - RLS policies are unchanged; existing policies already cover all career_plan rows
*/

-- 1. Drop and recreate the status check constraint to add new values
ALTER TABLE career_plans
  DROP CONSTRAINT IF EXISTS career_plans_status_check;

ALTER TABLE career_plans
  ADD CONSTRAINT career_plans_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text,
    'confirmed'::text,
    'sent_to_manager'::text,
    'manager_approved'::text,
    'admin_approved'::text,
    'rejected'::text,
    'pending_employee_input'::text,
    'pending_manager_wayforward'::text,
    'in_progress'::text,
    'completed'::text,
    'active'::text,
    'pending_manager_confirmation'::text
  ]));

-- 2. Add plan_title column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'plan_title'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN plan_title text;
  END IF;
END $$;

-- 3. Add plan_description column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'plan_description'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN plan_description text;
  END IF;
END $$;

-- 4. Add is_manual flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'is_manual'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN is_manual boolean DEFAULT false;
  END IF;
END $$;

-- 5. Add owner_name to career_plan_actions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plan_actions' AND column_name = 'owner_name'
  ) THEN
    ALTER TABLE career_plan_actions ADD COLUMN owner_name text;
  END IF;
END $$;
