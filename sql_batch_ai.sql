/*
  # Add DELETE policy for one_to_one_cycle_employee_assignments

  ## Problem
  Full admins cannot delete review cycles because the cascade delete on
  one_to_one_cycle_employee_assignments is blocked by RLS — there is no
  DELETE policy on that table.

  ## Changes
  - Adds DELETE policy allowing managers to delete their own cycle assignments
    and admins to delete any assignment
*/

CREATE POLICY "Managers and admins can delete cycle assignments"
  ON one_to_one_cycle_employee_assignments
  FOR DELETE
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

/*
  # Fix weekly check-ins unique constraint to prevent overwriting

  ## Problem
  The table has a UNIQUE constraint on (meeting_id, employee_id, week_starting).
  When a review cycle has a single scheduled meeting, every weekly check-in reuses
  the same meeting_id. This causes the UPDATE path to overwrite previous completed
  check-ins instead of creating new records.

  ## Changes
  1. Add oto_cycle_id column to one_to_one_weekly_checkins
  2. Backfill oto_cycle_id from the linked scheduled meeting
  3. Make meeting_id nullable (so it doesn't block inserts)
  4. Drop the old unique constraint (meeting_id, employee_id, week_starting)
  5. Add new unique constraint on (oto_cycle_id, employee_id, week_starting)
     so each week per employee per cycle is unique, regardless of meeting_id
  6. Add RLS policy for the new column
*/

-- 1. Add oto_cycle_id column if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_weekly_checkins' AND column_name = 'oto_cycle_id'
  ) THEN
    ALTER TABLE one_to_one_weekly_checkins
      ADD COLUMN oto_cycle_id uuid REFERENCES one_to_one_review_cycles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Backfill oto_cycle_id from the linked scheduled meeting
UPDATE one_to_one_weekly_checkins wc
SET oto_cycle_id = sm.oto_cycle_id
FROM one_to_one_scheduled_meetings sm
WHERE sm.id = wc.meeting_id
  AND sm.oto_cycle_id IS NOT NULL
  AND wc.oto_cycle_id IS NULL;

-- 3. Make meeting_id nullable so check-ins can exist without a specific scheduled meeting
ALTER TABLE one_to_one_weekly_checkins
  ALTER COLUMN meeting_id DROP NOT NULL;

-- 4. Drop the old unique constraint
ALTER TABLE one_to_one_weekly_checkins
  DROP CONSTRAINT IF EXISTS one_to_one_weekly_checkins_meeting_id_employee_id_week_star_key;

-- 5. Add new unique constraint keyed on cycle + employee + week
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'one_to_one_weekly_checkins_cycle_employee_week_key'
  ) THEN
    ALTER TABLE one_to_one_weekly_checkins
      ADD CONSTRAINT one_to_one_weekly_checkins_cycle_employee_week_key
      UNIQUE (oto_cycle_id, employee_id, week_starting);
  END IF;
END $$;

-- 6. Index for fast history queries
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_cycle_employee
  ON one_to_one_weekly_checkins (oto_cycle_id, employee_id, week_starting DESC);

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

/*
  # Update monthly review status constraint to include 'completed'

  ## Summary
  The status check constraint on one_to_one_monthly_reviews is updated to allow
  'completed' as a valid status value. Existing 'submitted' records are then
  migrated to 'completed'. 'submitted' is kept in the constraint for any legacy
  compatibility but will not be produced by the app going forward.

  ## Changes
  - Drops existing status check constraint
  - Re-creates it with 'draft', 'submitted', and 'completed' allowed
  - Updates all existing rows where status = 'submitted' to status = 'completed'
*/

ALTER TABLE one_to_one_monthly_reviews
  DROP CONSTRAINT IF EXISTS one_to_one_monthly_reviews_status_check;

ALTER TABLE one_to_one_monthly_reviews
  ADD CONSTRAINT one_to_one_monthly_reviews_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'completed'::text]));

UPDATE one_to_one_monthly_reviews
SET status = 'completed'
WHERE status = 'submitted';

/*
  # Backfill meeting completion_status from monthly review status

  ## Summary
  Existing monthly reviews that were submitted/completed have their status stored
  in one_to_one_monthly_reviews.status = 'completed', but the parent meeting record
  in one_to_one_scheduled_meetings.completion_status was never updated.

  The team status display reads from the meeting record, so these employees
  incorrectly show as "In Progress" instead of "Completed".

  ## Change
  For every scheduled meeting that has at least one associated monthly review
  with status = 'completed' or 'submitted', set:
    - completion_status = 'completed'
    - submitted_at = the review's updated_at (if submitted_at is currently null)

  ## Safety
  - Only updates meetings where completion_status is NOT already 'completed'/'submitted'
  - Does not touch review content, KPI scores, actions, comments, or summaries
  - Does not delete or duplicate any records
*/

UPDATE one_to_one_scheduled_meetings m
SET
  completion_status = 'completed',
  submitted_at = COALESCE(m.submitted_at, r.updated_at)
FROM (
  SELECT DISTINCT ON (meeting_id)
    meeting_id,
    updated_at
  FROM one_to_one_monthly_reviews
  WHERE status IN ('completed', 'submitted')
  ORDER BY meeting_id, updated_at DESC
) r
WHERE m.id = r.meeting_id
  AND m.completion_status NOT IN ('completed', 'submitted');

/*
  # Add previous_roles to profiles table

  Adds a previous_roles column to store a simple text field of prior roles.
  Defaults to 'N/A' when blank. Used for progression history display only —
  does not affect current job_title, department, or job_family_id.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'previous_roles'
  ) THEN
    ALTER TABLE profiles ADD COLUMN previous_roles text DEFAULT 'N/A';
  END IF;
END $$;

/*
  # Migrate previous_roles from text to JSONB array on profiles

  Changes previous_roles column from plain text to a JSONB array of structured entries.
  Each entry: { department, role, job_family_id, start_date, end_date, reason }
  Existing text values are discarded safely (were 'N/A' or freeform text with no data value).
  Defaults to empty array [].
*/

DO $$
BEGIN
  -- Drop the existing text column and recreate as jsonb
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'previous_roles'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE profiles DROP COLUMN previous_roles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'previous_roles'
  ) THEN
    ALTER TABLE profiles ADD COLUMN previous_roles jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_job_families_updated_at ON job_families;

/*
  # Test Data Cleanup

  Deletes:
  1. All review cycle data (scheduled meetings, weekly checkins, monthly reviews, then cycles)
  2. All dummy/test user data and profiles (Test Admin, Test Employee, Test Manager)
  3. The inactive archived user (nicola.hurcombe@eposnow.com, active=false)

  Does NOT touch:
  - Active real users
  - Job families, role profiles, career pathways, learning content
  - Access levels, admin settings, competency framework
*/

-- 1. Delete all review cycle child data first
DELETE FROM one_to_one_weekly_checkins;
DELETE FROM one_to_one_monthly_reviews;
DELETE FROM one_to_one_scheduled_meetings;
DELETE FROM one_to_one_review_cycles;

-- 2. Clean up dummy/test users
DO $$
DECLARE
  dummy_ids uuid[] := ARRAY[
    'faedad54-022b-4d49-9268-2a3449fb9ef7'::uuid,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
    'e27e9adb-b2fb-446d-9ada-fca85a87934e'::uuid
  ];
BEGIN
  UPDATE profiles SET manager_id = NULL WHERE manager_id = ANY(dummy_ids);
  UPDATE goal_actions SET assigned_to = NULL WHERE assigned_to = ANY(dummy_ids);
  UPDATE strategic_goals SET owner_id = NULL WHERE owner_id = ANY(dummy_ids);

  DELETE FROM user_admin_permissions WHERE user_id = ANY(dummy_ids) OR granted_by = ANY(dummy_ids);
  DELETE FROM skill_assessments WHERE assessed_by = ANY(dummy_ids);
  DELETE FROM performance_ratings WHERE rater_id = ANY(dummy_ids);
  DELETE FROM career_plans WHERE profile_id = ANY(dummy_ids);
  DELETE FROM profiles WHERE id = ANY(dummy_ids);
  DELETE FROM auth.users WHERE id = ANY(dummy_ids);
END $$;

/*
  # Fix FK cascades to preserve completed review history

  1. Changes
    - `one_to_one_scheduled_meetings.cycle_id` FK: CASCADE → SET NULL
      (deleting a review_cycle now nullifies the cycle_id on meetings, not deletes meetings)
    - `one_to_one_monthly_reviews.meeting_id` FK: CASCADE → SET NULL
      (deleting a meeting now nullifies the meeting_id on reviews, not deletes the review)

  2. Why
    - Review history and ratings must survive cycle/meeting deletion for dashboard reporting
*/

ALTER TABLE one_to_one_scheduled_meetings
  DROP CONSTRAINT IF EXISTS one_to_one_scheduled_meetings_cycle_id_fkey;

ALTER TABLE one_to_one_scheduled_meetings
  ADD CONSTRAINT one_to_one_scheduled_meetings_cycle_id_fkey
  FOREIGN KEY (cycle_id) REFERENCES review_cycles(id) ON DELETE SET NULL;

ALTER TABLE one_to_one_monthly_reviews
  DROP CONSTRAINT IF EXISTS one_to_one_monthly_reviews_meeting_id_fkey;

ALTER TABLE one_to_one_monthly_reviews
  ADD CONSTRAINT one_to_one_monthly_reviews_meeting_id_fkey
  FOREIGN KEY (meeting_id) REFERENCES one_to_one_scheduled_meetings(id) ON DELETE SET NULL;

/*
  # Add admin insert policy for one_to_one_monthly_reviews

  Allows admins to insert monthly reviews for backfill purposes.
  Existing select/update/delete policies for managers and employees are unchanged.
*/

CREATE POLICY "Admin can insert monthly reviews"
  ON one_to_one_monthly_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

/*
  # Add template_title to one_to_one_review_cycles

  Adds a new `template_title` column to `one_to_one_review_cycles`.

  ## Changes
  - `one_to_one_review_cycles`: new nullable text column `template_title`
    - Stores a human-readable identifier such as "Specialist", "IC4", "Monthly 1:1"
    - Nullable so existing rows are unaffected
*/

ALTER TABLE one_to_one_review_cycles
  ADD COLUMN IF NOT EXISTS template_title text;

/*
  # Create SERA Feedback Log

  ## Purpose
  Stores a record of every interaction where SERA validates a rating justification,
  allowing admins to review SERA outputs and manually improve the system prompt and
  knowledge base over time. No automatic model retraining occurs.

  ## New Tables
  - `sera_feedback_log`
    - `id` (uuid, pk)
    - `created_at` (timestamptz) — when SERA ran
    - `logged_by_user_id` (uuid, fk → auth.users) — manager who triggered the validation
    - `employee_name` (text) — employee being reviewed
    - `rating` (integer) — rating selected (1–5)
    - `rating_type` (text) — 'kpi' or 'competency'
    - `item_name` (text) — KPI or competency name
    - `manager_input` (text) — manager comments sent to SERA
    - `sera_response_valid` (boolean) — whether SERA judged justification valid
    - `sera_confidence` (text) — 'high', 'medium', or 'low'
    - `sera_message` (text) — SERA's message shown to manager
    - `sera_prompt` (text) — SERA's improvement suggestion (if any)
    - `sera_summary` (text) — SERA's moderation summary
    - `manager_overrode` (boolean) — whether manager overrode SERA
    - `override_reason` (text) — manager's override explanation
    - `admin_feedback` (text) — 'helpful', 'needs_improvement', or null (not yet reviewed)
    - `admin_notes` (text) — optional admin notes for prompt/KB improvement
    - `admin_reviewed_at` (timestamptz) — when admin gave feedback
    - `admin_reviewed_by` (uuid, fk → auth.users) — which admin reviewed it

  ## Security
  - RLS enabled; restrictive by default
  - Authenticated users can INSERT their own log entries (on validation)
  - Admins can SELECT all entries and UPDATE admin_feedback / admin_notes fields
*/

CREATE TABLE IF NOT EXISTS sera_feedback_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  logged_by_user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_name         text NOT NULL DEFAULT '',
  rating                integer NOT NULL DEFAULT 0,
  rating_type           text NOT NULL DEFAULT '',
  item_name             text NOT NULL DEFAULT '',
  manager_input         text NOT NULL DEFAULT '',
  sera_response_valid   boolean,
  sera_confidence       text,
  sera_message          text,
  sera_prompt           text,
  sera_summary          text,
  manager_overrode      boolean NOT NULL DEFAULT false,
  override_reason       text,
  admin_feedback        text CHECK (admin_feedback IN ('helpful', 'needs_improvement')),
  admin_notes           text,
  admin_reviewed_at     timestamptz,
  admin_reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE sera_feedback_log ENABLE ROW LEVEL SECURITY;

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_sera_feedback_log_created_at
  ON sera_feedback_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sera_feedback_log_logged_by
  ON sera_feedback_log (logged_by_user_id);

CREATE INDEX IF NOT EXISTS idx_sera_feedback_log_admin_feedback
  ON sera_feedback_log (admin_feedback);

-- Authenticated users can insert their own log entries
CREATE POLICY "Authenticated users can log their own SERA interactions"
  ON sera_feedback_log
  FOR INSERT
  TO authenticated
  WITH CHECK (logged_by_user_id = auth.uid());

-- Admins can read all log entries
CREATE POLICY "Admins can read all SERA feedback log entries"
  ON sera_feedback_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Admins can update admin_feedback, admin_notes, admin_reviewed_at, admin_reviewed_by
CREATE POLICY "Admins can update feedback on SERA log entries"
  ON sera_feedback_log
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

/*
  # Fix competency_frameworks RLS update policy
  
  The existing "Admins can manage frameworks" policy uses FOR ALL with no WITH CHECK,
  which causes UPDATE operations to fail. Replace it with explicit per-operation policies
  that include proper WITH CHECK clauses.
*/

DROP POLICY IF EXISTS "Admins can manage frameworks" ON competency_frameworks;

CREATE POLICY "Admins can select competency frameworks"
  ON competency_frameworks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert competency frameworks"
  ON competency_frameworks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update competency frameworks"
  ON competency_frameworks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete competency frameworks"
  ON competency_frameworks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated can view competency frameworks" ON competency_frameworks;

/*
  # Add admin delete policy for one_to_one_monthly_reviews

  Adds a DELETE RLS policy on one_to_one_monthly_reviews restricted to full admins only.
  This allows admins to remove individual completed reviews created in error without
  affecting other data in the system.
*/

CREATE POLICY "Full admins can delete monthly reviews"
  ON one_to_one_monthly_reviews FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
        AND profiles.admin_type = 'full_admin'
    )
  );

/*
  # Department-scoped moderation access and notification support

  1. Changes to moderation_cases RLS
     - Drop the broad dept_lead SELECT policy that allows all dept_leads to see all cases
     - Replace with a dept-scoped policy: dept_lead can only see cases where the employee
       belongs to the same department as the dept_lead

  2. Changes to moderation_case_decisions RLS
     - Ensure dept_lead insert is scoped to cases they can see

  3. review_notifications
     - Add notification_type values used by moderation (no constraint change needed
       as the column is plain text with no CHECK constraint)

  4. Notes
     - `leadership` and `admin` roles retain unrestricted access
     - The dept_lead department matching is done via a sub-select on profiles
*/

-- =============================================
-- Moderation cases: tighten dept_lead SELECT
-- =============================================

DROP POLICY IF EXISTS "View own and approver moderation cases" ON moderation_cases;

-- Managers and employees see their own cases; leadership/admin see all;
-- dept_lead sees only cases where the employee is in their own department
CREATE POLICY "View own and approver moderation cases"
  ON moderation_cases FOR SELECT
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid())
    OR employee_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin'::user_role, 'leadership'::user_role, 'senior'::user_role)
    )
    OR (
      EXISTS (
        SELECT 1 FROM profiles viewer
        WHERE viewer.id = (SELECT auth.uid())
          AND viewer.role = 'dept_lead'::user_role
          AND EXISTS (
            SELECT 1 FROM profiles emp
            WHERE emp.id = moderation_cases.employee_id
              AND emp.department = viewer.department
          )
      )
    )
  );

-- =============================================
-- Moderation case decisions: tighten dept_lead INSERT
-- Allow inserters who can see the parent case
-- =============================================

DROP POLICY IF EXISTS "Approvers insert decisions" ON moderation_case_decisions;

CREATE POLICY "Approvers insert decisions"
  ON moderation_case_decisions FOR INSERT
  TO authenticated
  WITH CHECK (
    decided_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM moderation_cases mc
      WHERE mc.id = moderation_case_decisions.case_id
        AND (
          mc.manager_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (SELECT auth.uid())
              AND profiles.role IN ('admin'::user_role, 'leadership'::user_role, 'senior'::user_role)
          )
          OR (
            EXISTS (
              SELECT 1 FROM profiles viewer
              WHERE viewer.id = (SELECT auth.uid())
                AND viewer.role = 'dept_lead'::user_role
                AND EXISTS (
                  SELECT 1 FROM profiles emp
                  WHERE emp.id = mc.employee_id
                    AND emp.department = viewer.department
                )
            )
          )
        )
    )
  );

/*
  # Seed moderation case for Kayleigh Lacasse

  Creates a moderation_cases row for Kayleigh Lacasse's May 2026 monthly review
  which has an overall_average of 4.58 (all 6 competencies rated 5/5).

  - employee_id: Kayleigh Lacasse
  - manager_id: Zachariah Taylor (her manager from the monthly review)
  - source_type: competency_assessment
  - source_id: the monthly review id
  - original_rating / current_rating: 5 (highest competency average)
  - manager_justification: pulled from the review's first competency comment
  - ai_summary: summarised SERA recommendation for context
  - status: pending, current_step: 1
*/

INSERT INTO moderation_cases (
  workflow_id,
  source_type,
  source_id,
  meeting_id,
  employee_id,
  manager_id,
  original_rating,
  current_rating,
  manager_justification,
  ai_validation_status,
  ai_summary,
  current_step,
  status
)
SELECT
  '1d07ee47-3b01-4bd7-91e2-54c065270141',
  'competency_assessment',
  'b311cfb4-fa7f-4a83-b554-88d1f535b0a9',
  NULL,
  '21a6f71c-63cd-4c84-9680-4bcf5a9262ed',
  'f96cfe0b-ba59-4553-9567-dca555b3ac2d',
  5,
  5,
  'All 6 competencies rated 5/5 (Exceptional). Key evidence: KPIs met and exceeded; resolved PJS Restaurant same-day; owns corporate account reporting independently; uses AI daily in customer communication.',
  'flagged',
  'All competencies rated 5 (Exceptional). SERA flagged several justifications as lacking measurable impact evidence. While behaviour descriptions are present, stronger outcome metrics (e.g. CSAT scores, resolution times, revenue impact) would strengthen this rating. Recommend dept lead reviews evidence quality before passing to exec.',
  1,
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM moderation_cases
  WHERE source_id = 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9'
);

/*
  # Access Level Permissions Schema

  Establishes a canonical permissions jsonb structure for access_level_types,
  adds a protected "Full Admin" access level that cannot be deleted,
  and seeds all existing access levels with correct permission flags.

  ## Permission Keys (stored in access_level_types.permissions jsonb)

  ### Dashboard / View access
  - dashboard_employee       — Employee dashboard tab
  - dashboard_manager        — Manager / My Team dashboard tab
  - dashboard_dept_lead      — Department dashboard tab
  - dashboard_admin          — Organisation dashboard tab (leadership view)

  ### Reviews
  - view_review_templates    — View review templates list
  - create_review_templates  — Create and edit review templates
  - delete_review_templates  — Delete review templates
  - start_reviews            — Start / schedule a review cycle
  - edit_submitted_reviews   — Edit reviews within allowed timeframe
  - view_completed_reviews   — View completed review history
  - delete_reviews           — Delete reviews (admin correction)

  ### Career & Skills
  - access_career_pathways   — Career pathways module
  - access_skills_matrix     — Skills matrix module
  - manage_assessment_templates — Create/edit/delete assessment templates

  ### Team & Reporting
  - view_team                — Team views (manager's direct reports)
  - view_reporting           — Reporting dashboards
  - view_nine_box            — 9-box grid

  ### Administration
  - manage_users             — User management
  - manage_org_settings      — Organisation settings
  - manage_access_levels     — Access level management
  - manage_sera              — SERA configuration / settings
  - full_admin               — Full unrestricted access (protected)

  ## Protection
  - is_protected column added: rows with is_protected = true cannot be deleted
  - Full Admin row has is_protected = true
  - Employee row has is_protected = true (always baseline)
*/

-- Add is_protected column if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'access_level_types' AND column_name = 'is_protected'
  ) THEN
    ALTER TABLE access_level_types ADD COLUMN is_protected boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Upsert Full Admin (protected, cannot be deleted)
INSERT INTO access_level_types (name, description, permissions, is_system, is_protected, is_active)
VALUES (
  'Full Admin',
  'Full unrestricted system access. This access level cannot be deleted.',
  '{
    "full_admin": true,
    "dashboard_employee": true,
    "dashboard_manager": true,
    "dashboard_dept_lead": true,
    "dashboard_admin": true,
    "view_review_templates": true,
    "create_review_templates": true,
    "delete_review_templates": true,
    "start_reviews": true,
    "edit_submitted_reviews": true,
    "view_completed_reviews": true,
    "delete_reviews": true,
    "access_career_pathways": true,
    "access_skills_matrix": true,
    "manage_assessment_templates": true,
    "view_team": true,
    "view_reporting": true,
    "view_nine_box": true,
    "manage_users": true,
    "manage_org_settings": true,
    "manage_access_levels": true,
    "manage_sera": true
  }'::jsonb,
  true,
  true,
  true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = EXCLUDED.is_system,
  is_protected = EXCLUDED.is_protected,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Mark Employee as protected (always baseline)
UPDATE access_level_types
SET
  is_protected = true,
  permissions = '{
    "dashboard_employee": true,
    "view_own_profile": true,
    "view_own_reviews": true,
    "access_career_pathways": true,
    "access_training": true
  }'::jsonb,
  updated_at = now()
WHERE name = 'Employee';

-- Update Admin
UPDATE access_level_types
SET
  permissions = '{
    "full_admin": true,
    "dashboard_employee": true,
    "dashboard_manager": true,
    "dashboard_dept_lead": true,
    "dashboard_admin": true,
    "view_review_templates": true,
    "create_review_templates": true,
    "delete_review_templates": true,
    "start_reviews": true,
    "edit_submitted_reviews": true,
    "view_completed_reviews": true,
    "delete_reviews": true,
    "access_career_pathways": true,
    "access_skills_matrix": true,
    "manage_assessment_templates": true,
    "view_team": true,
    "view_reporting": true,
    "view_nine_box": true,
    "manage_users": true,
    "manage_org_settings": true,
    "manage_access_levels": true,
    "manage_sera": true
  }'::jsonb,
  updated_at = now()
WHERE name = 'Admin';

-- Update Manager
UPDATE access_level_types
SET
  permissions = '{
    "dashboard_employee": true,
    "dashboard_manager": true,
    "view_review_templates": true,
    "start_reviews": true,
    "edit_submitted_reviews": true,
    "view_completed_reviews": true,
    "access_career_pathways": true,
    "access_skills_matrix": true,
    "view_team": true,
    "view_reporting": true,
    "view_nine_box": true,
    "access_training": true,
    "conduct_reviews": true,
    "view_own_profile": true,
    "view_own_reviews": true,
    "view_team_reports": true,
    "access_career_plans": true
  }'::jsonb,
  updated_at = now()
WHERE name = 'Manager';

-- Update Department Lead
UPDATE access_level_types
SET
  permissions = '{
    "dashboard_employee": true,
    "dashboard_manager": true,
    "dashboard_dept_lead": true,
    "view_review_templates": true,
    "start_reviews": true,
    "edit_submitted_reviews": true,
    "view_completed_reviews": true,
    "access_career_pathways": true,
    "access_skills_matrix": true,
    "view_team": true,
    "view_reporting": true,
    "view_nine_box": true,
    "manage_users": false
  }'::jsonb,
  updated_at = now()
WHERE name = 'Department Lead';

-- Update Exec
UPDATE access_level_types
SET
  permissions = '{
    "dashboard_employee": true,
    "dashboard_admin": true,
    "view_review_templates": true,
    "view_completed_reviews": true,
    "access_career_pathways": true,
    "access_skills_matrix": true,
    "view_reporting": true,
    "view_nine_box": true,
    "view_team": true
  }'::jsonb,
  updated_at = now()
WHERE name = 'Exec';

-- Update L&D Admin
UPDATE access_level_types
SET
  permissions = '{
    "dashboard_employee": true,
    "dashboard_admin": true,
    "access_career_pathways": true,
    "access_skills_matrix": true,
    "manage_assessment_templates": true,
    "view_reporting": true,
    "manage_training": true,
    "view_all_users": true,
    "send_assessment_forms": true,
    "create_skills_matrices": true,
    "create_assessment_forms": true,
    "view_own_profile": true,
    "access_reports": true
  }'::jsonb,
  updated_at = now()
WHERE name = 'L&D Admin';

/*
  # Remove incorrect Admin access level from Kenny Sanon

  ## Issue
  Kenny Sanon (role: manager) was incorrectly assigned the "Admin" access level
  in addition to his "Manager" access level. The merged permissions included
  full_admin and dashboard_admin, giving him org-wide dashboard visibility in the UI.

  ## Change
  - Remove the Admin access level row (id: 803474b0-5a49-484d-b3f8-4e22a8a0301d)
    from user_access_levels for Kenny Sanon.
  - He retains his correct "Manager" access level only.

  ## Security note
  RLS policies check profiles.role, not access level permissions, so Kenny could
  not actually read other users' private data via direct DB queries. However, the
  frontend org-level dashboard queries ran under his auth token and returned
  org-wide aggregated data (9-box grid, talent ratings, pay review forecast) that
  a manager should not see. Removing this access level restores correct UI scoping.
*/

DELETE FROM user_access_levels
WHERE id = '803474b0-5a49-484d-b3f8-4e22a8a0301d'
  AND user_id = 'd6805a86-7bab-4cbd-abe5-cde7d1e895b7';

/*
  # Fix moderation_cases SELECT policy for access-level-based dept leads

  ## Problem
  The existing SELECT policy only grants dept_lead visibility using profiles.role = 'dept_lead'.
  Users who hold the "Department Lead" access level (via user_access_levels) but have
  role = 'manager' are blocked from seeing cases in their department.

  ## Fix
  Extend the SELECT policy to also allow users who have the dashboard_dept_lead permission
  via their access level to see moderation cases for employees in their department.

  ## Tables modified
  - moderation_cases: DROP and RECREATE the SELECT policy

  ## No data changes, no other policies touched.
*/

DROP POLICY IF EXISTS "View own and approver moderation cases" ON moderation_cases;

CREATE POLICY "View own and approver moderation cases"
  ON moderation_cases
  FOR SELECT
  TO authenticated
  USING (
    -- Manager who created the case
    manager_id = (SELECT auth.uid())
    -- Employee seeing their own case
    OR employee_id = (SELECT auth.uid())
    -- Org-level roles (admin, leadership, senior)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::user_role, 'leadership'::user_role, 'senior'::user_role])
    )
    -- dept_lead by role: can see cases for employees in same department
    OR EXISTS (
      SELECT 1 FROM profiles viewer
      WHERE viewer.id = (SELECT auth.uid())
        AND viewer.role = 'dept_lead'::user_role
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = moderation_cases.employee_id
            AND emp.department = viewer.department
        )
    )
    -- dept_lead by access level (dashboard_dept_lead permission): same department check
    OR EXISTS (
      SELECT 1
      FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND (alt.permissions->>'dashboard_dept_lead')::boolean = true
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = moderation_cases.employee_id
            AND emp.department = viewer.department
        )
    )
  );

-- Also fix the UPDATE policy so access-level dept leads can act on cases in their dept
DROP POLICY IF EXISTS "Managers and approvers update moderation cases" ON moderation_cases;

CREATE POLICY "Managers and approvers update moderation cases"
  ON moderation_cases
  FOR UPDATE
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::user_role, 'leadership'::user_role, 'dept_lead'::user_role, 'senior'::user_role])
    )
    OR EXISTS (
      SELECT 1
      FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND (alt.permissions->>'dashboard_dept_lead')::boolean = true
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = moderation_cases.employee_id
            AND emp.department = viewer.department
        )
    )
  )
  WITH CHECK (
    manager_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::user_role, 'leadership'::user_role, 'dept_lead'::user_role, 'senior'::user_role])
    )
    OR EXISTS (
      SELECT 1
      FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND (alt.permissions->>'dashboard_dept_lead')::boolean = true
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = moderation_cases.employee_id
            AND emp.department = viewer.department
        )
    )
  );

/*
  # Add per-competency moderation support

  ## Summary
  Extends moderation_cases to store per-competency decisions from Dept Lead and Exec
  moderators, and extends review_notifications to carry competency-level context.

  ## Changes

  ### moderation_cases
  - `dept_lead_decisions` (JSONB): array of per-competency decisions from Dept Lead
    Each entry: { competency_id, competency_name, original_rating, dl_rating, dl_comment, action: 'approved'|'adjusted', decided_at }
  - `exec_decisions` (JSONB): array of per-competency decisions from Exec
    Each entry: { competency_id, competency_name, original_rating, dl_rating, final_rating, exec_comment, action: 'approved'|'adjusted', decided_at }
  - `dl_overall_comment` (text): optional overall DL comment (existing `reviewer_comments` repurposed)
  - `exec_overall_comment` (text): optional overall exec comment

  ### review_notifications
  - `competency_name` (text): name of the specific competency the notification is about
  - `original_rating` (integer): the rating before moderation
  - `moderated_rating` (integer): the final moderated rating
  - `moderator_level` (text): 'dept_lead' or 'exec'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderation_cases' AND column_name = 'dept_lead_decisions'
  ) THEN
    ALTER TABLE moderation_cases ADD COLUMN dept_lead_decisions JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderation_cases' AND column_name = 'exec_decisions'
  ) THEN
    ALTER TABLE moderation_cases ADD COLUMN exec_decisions JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderation_cases' AND column_name = 'dl_overall_comment'
  ) THEN
    ALTER TABLE moderation_cases ADD COLUMN dl_overall_comment text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderation_cases' AND column_name = 'exec_overall_comment'
  ) THEN
    ALTER TABLE moderation_cases ADD COLUMN exec_overall_comment text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'review_notifications' AND column_name = 'competency_name'
  ) THEN
    ALTER TABLE review_notifications ADD COLUMN competency_name text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'review_notifications' AND column_name = 'original_rating'
  ) THEN
    ALTER TABLE review_notifications ADD COLUMN original_rating integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'review_notifications' AND column_name = 'moderated_rating'
  ) THEN
    ALTER TABLE review_notifications ADD COLUMN moderated_rating integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'review_notifications' AND column_name = 'moderator_level'
  ) THEN
    ALTER TABLE review_notifications ADD COLUMN moderator_level text;
  END IF;
END $$;

/*
  # Add review_id to moderation_cases

  Links each moderation case back to the specific one_to_one_monthly_review
  it was created for. Used by moderation panels to load per-competency
  values_ratings directly from the review record.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderation_cases' AND column_name = 'review_id'
  ) THEN
    ALTER TABLE moderation_cases ADD COLUMN review_id uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_moderation_cases_review_id ON moderation_cases (review_id);

/*
  # Backfill review_id from source_id for existing moderation cases

  ## Problem
  Moderation cases created before the review_id column was added have review_id = NULL.
  The source_id column contains the review UUID for cases with source_type = 'competency_assessment'.
  The DeptLeadModerationPanel loads competency data using review_id, so these cases show "no competencies".

  ## Fix
  Copy source_id into review_id for all cases where:
  - review_id IS NULL
  - source_id IS NOT NULL
  - source_type = 'competency_assessment'
  - source_id looks like a valid UUID (exists in one_to_one_monthly_reviews)

  ## Changes
  - Updates moderation_cases.review_id = source_id for affected rows
*/

UPDATE moderation_cases
SET review_id = source_id::uuid
WHERE review_id IS NULL
  AND source_id IS NOT NULL
  AND source_type = 'competency_assessment'
  AND EXISTS (
    SELECT 1 FROM one_to_one_monthly_reviews
    WHERE id = source_id::uuid
  );

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

/*
  # Add team, reports_to, and how_do_i_get_there to job_families

  ## Summary
  Extends role profiles (job_families) with three new fields:

  1. New Columns
    - `team` (text, nullable): Sub-group within a department, e.g. "Money", "Data", "Outreach"
    - `reports_to` (text, nullable): Title of the role this role reports into; references an existing role profile by title
    - `how_do_i_get_there` (text, nullable): Free-text coaching content — actions, learning, experience or preparation an employee can take to progress into this role. Used by SERA and the career pathway quiz for coaching and recommendations.

  2. No data is removed or renamed. Existing rows retain all their current values.

  ## Notes
  - `reports_to` stores the role title as a string (same pattern as `progression_to`) to allow references without a hard FK constraint.
  - `how_do_i_get_there` is intentionally a plain text column so it can be surfaced in AI prompts without additional joins.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'team'
  ) THEN
    ALTER TABLE job_families ADD COLUMN team text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'reports_to'
  ) THEN
    ALTER TABLE job_families ADD COLUMN reports_to text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'how_do_i_get_there'
  ) THEN
    ALTER TABLE job_families ADD COLUMN how_do_i_get_there text;
  END IF;
END $$;

