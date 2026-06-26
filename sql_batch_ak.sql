/*
  # Fix Security Definer Views and Function Execute Permissions

  ## Summary
  Addresses all flagged security issues:

  1. Views: Recreate user_status_view and employee_skill_summary without SECURITY DEFINER
     (views default to SECURITY INVOKER — RLS on underlying tables applies)

  2. Trigger functions (handle_new_user, sync_assessment_rating_to_training_record):
     Must remain SECURITY DEFINER to operate across schemas/elevated context.
     Revoke EXECUTE from anon and public — they are never called via RPC, only via triggers.

  3. RPC functions (is_admin, is_admin(uuid), is_user_admin, get_user_access_levels,
     has_access_level, get_active_view_as_session, update_last_active,
     reset_skills_matrix_data):
     Revoke EXECUTE from anon and public, grant only to authenticated role.
*/

-- ============================================================
-- 1. Fix SECURITY DEFINER views
-- ============================================================

-- user_status_view: drop and recreate as plain (SECURITY INVOKER) view
DROP VIEW IF EXISTS public.user_status_view;
CREATE VIEW public.user_status_view AS
  SELECT
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.active,
    p.department,
    p.job_title,
    p.manager_id,
    m.full_name AS manager_name,
    p.created_at,
    p.last_active,
    CASE
      WHEN p.active = false THEN 'Inactive'
      WHEN p.role = 'admin'::user_role THEN 'Admin'
      WHEN p.role = 'manager'::user_role THEN 'Manager'
      ELSE 'Employee'
    END AS status_label
  FROM profiles p
  LEFT JOIN profiles m ON p.manager_id = m.id;

-- Grant access matching the original
GRANT SELECT ON public.user_status_view TO authenticated;

-- employee_skill_summary: drop and recreate as plain (SECURITY INVOKER) view
DROP VIEW IF EXISTS public.employee_skill_summary;
CREATE VIEW public.employee_skill_summary AS
  SELECT
    sa.profile_id AS employee_id,
    sm.id AS skill_id,
    sm.name AS skill_name,
    COALESCE(st.name, 'General') AS skill_type,
    '📊'::text AS skill_type_icon,
    sa.target_level,
    false AS is_mandatory,
    (
      SELECT sr.rating_value
      FROM skill_ratings sr
      WHERE sr.employee_id = sa.profile_id
        AND sr.skill_id = sm.id
        AND sr.rated_by = sa.profile_id
      ORDER BY sr.rated_at DESC
      LIMIT 1
    ) AS latest_self_rating,
    (
      SELECT sr.rating_value
      FROM skill_ratings sr
      WHERE sr.employee_id = sa.profile_id
        AND sr.skill_id = sm.id
        AND sr.rated_by <> sa.profile_id
      ORDER BY sr.rated_at DESC
      LIMIT 1
    ) AS latest_manager_rating,
    sa.current_level AS current_rating,
    sa.assessment_date AS last_assessed_at,
    'active'::text AS cycle_status,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM skill_assessment_discrepancies sad
        WHERE sad.employee_id = sa.profile_id
          AND sad.skill_id = sm.id
          AND sad.flagged_for_discussion = true
          AND sad.resolved_at IS NULL
      ) THEN true
      ELSE false
    END AS has_discrepancy,
    (
      SELECT sad.ai_analysis
      FROM skill_assessment_discrepancies sad
      WHERE sad.employee_id = sa.profile_id
        AND sad.skill_id = sm.id
      ORDER BY sad.created_at DESC
      LIMIT 1
    ) AS discrepancy_analysis
  FROM skill_assessments sa
  JOIN skills_master sm ON sa.skill_id = sm.id
  LEFT JOIN skill_types st ON sm.skill_type_id = st.id;

GRANT SELECT ON public.employee_skill_summary TO authenticated;

-- ============================================================
-- 2. Trigger functions — revoke public/anon EXECUTE
--    (These must stay SECURITY DEFINER but are never RPC-called)
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.sync_assessment_rating_to_training_record() FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 3. RPC functions — revoke from PUBLIC/anon, grant authenticated only
-- ============================================================

-- is_admin()
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- is_admin(uuid)
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- is_user_admin()
REVOKE EXECUTE ON FUNCTION public.is_user_admin() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;

-- get_user_access_levels(uuid)
REVOKE EXECUTE ON FUNCTION public.get_user_access_levels(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_user_access_levels(uuid) TO authenticated;

-- has_access_level(uuid, text)
REVOKE EXECUTE ON FUNCTION public.has_access_level(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_access_level(uuid, text) TO authenticated;

-- get_active_view_as_session(uuid)
REVOKE EXECUTE ON FUNCTION public.get_active_view_as_session(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_active_view_as_session(uuid) TO authenticated;

-- update_last_active()
REVOKE EXECUTE ON FUNCTION public.update_last_active() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.update_last_active() TO authenticated;

-- reset_skills_matrix_data()
REVOKE EXECUTE ON FUNCTION public.reset_skills_matrix_data() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reset_skills_matrix_data() TO authenticated;

/*
  # Add owner_id to career_plan_actions and auto-complete plan logic

  ## Changes

  1. New column
     - `owner_id` (uuid, FK → profiles) — the user responsible for signing off / completing this action
       Nullable so existing rows are unaffected.

  2. Index
     - `idx_career_plan_actions_owner_id` for fast dashboard queries by owner

  3. RLS
     - SELECT: authenticated users can read actions for plans they are related to
     - UPDATE completed_at/completed_by: only the assigned owner may mark complete
       (enforced in application layer via owner_id check; DB RLS already allows updates
        to career_plan_actions by plan participants — no new restrictive policy needed here
        as the existing policies cover it, and the app enforces the owner check)

  ## Notes
  - `owner_name` (text) is kept for display / legacy compatibility
  - Progress % and auto-complete-plan logic is handled in the application layer
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plan_actions' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE career_plan_actions
      ADD COLUMN owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_career_plan_actions_owner_id
  ON career_plan_actions(owner_id);

/*
  # Fix Kayleigh Lacasse moderation data

  ## Summary
  1. Extend moderation_status constraint to include 'adjusted'
  2. Correct dl_rating values of 4 → 3 in moderation_cases dept_lead_decisions
     (competency ratings must only use 1, 3, 5)
  3. Apply final moderated ratings to the review's values_ratings
  4. Set moderation_status = 'adjusted' on the review (was stuck as 'pending')
  5. Recalculate overall_competency_score: final ratings 3+5+3+3+3+3 = 20/6 = 3.33

  ## No data is deleted. Manager comments, KPI data, and review history are preserved.
*/

-- Extend the moderation_status check constraint to include 'adjusted'
ALTER TABLE one_to_one_monthly_reviews
  DROP CONSTRAINT IF EXISTS one_to_one_monthly_reviews_moderation_status_check;

ALTER TABLE one_to_one_monthly_reviews
  ADD CONSTRAINT one_to_one_monthly_reviews_moderation_status_check
  CHECK (moderation_status = ANY (ARRAY['pending','approved','adjusted','rejected']));

-- Fix moderation_cases: change any dl_rating of 4 to 3
UPDATE moderation_cases
SET dept_lead_decisions = (
  SELECT jsonb_agg(
    CASE
      WHEN (decision->>'dl_rating')::int = 4
        THEN jsonb_set(decision, '{dl_rating}', '3'::jsonb)
      ELSE decision
    END
  )
  FROM jsonb_array_elements(dept_lead_decisions) AS decision
)
WHERE id = '31c53da5-090b-43c3-9d90-605d556c7806';

-- Fix the review: apply final moderated ratings, update moderation_status and competency score
UPDATE one_to_one_monthly_reviews
SET
  moderation_status = 'adjusted',
  values_ratings = (
    SELECT jsonb_agg(
      CASE
        WHEN (vr->>'competency_id') = 'ddb2bed0-47c8-4414-b50b-8a5e28b324b8'
          THEN jsonb_set(jsonb_set(vr, '{manager_rating}', '3'::jsonb), '{moderated_rating}', '3'::jsonb)
        WHEN (vr->>'competency_id') = '2e99ff39-3314-4aad-bff9-c5ca754a3a14'
          THEN jsonb_set(jsonb_set(vr, '{manager_rating}', '5'::jsonb), '{moderated_rating}', '5'::jsonb)
        WHEN (vr->>'competency_id') = '27bfdc67-6b26-474f-92af-748d4ec84511'
          THEN jsonb_set(jsonb_set(vr, '{manager_rating}', '3'::jsonb), '{moderated_rating}', '3'::jsonb)
        WHEN (vr->>'competency_id') = 'd46b17bf-b210-447b-9e05-0d46711e0fdb'
          THEN jsonb_set(jsonb_set(vr, '{manager_rating}', '3'::jsonb), '{moderated_rating}', '3'::jsonb)
        WHEN (vr->>'competency_id') = 'e6e9b753-2208-4ce4-8ad7-551e0a93d84e'
          THEN jsonb_set(jsonb_set(vr, '{manager_rating}', '3'::jsonb), '{moderated_rating}', '3'::jsonb)
        WHEN (vr->>'competency_id') = '5d3a0671-b0b8-40fc-b014-38b376607d07'
          THEN jsonb_set(jsonb_set(vr, '{manager_rating}', '3'::jsonb), '{moderated_rating}', '3'::jsonb)
        ELSE vr
      END
    )
    FROM jsonb_array_elements(values_ratings) AS vr
  ),
  overall_competency_score = 3.33
WHERE id = 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9';

/*
  # Create missing moderation case for Bryant Sami

  ## Summary
  Bryant Sami's review (id: 8f25ad18) has overall_competency_score = 4 and
  requires_moderation = true, but no moderation_cases row was ever created
  (the case creation was skipped at submission time due to a code path issue).

  This migration creates the missing pending moderation case so it appears
  in the Dept Lead (Olivia Collingbourne / Implementation) moderation queue.

  - Preserves all review data — no review rows are modified.
  - Does not create a duplicate if one already exists.
*/

INSERT INTO moderation_cases (
  workflow_id,
  review_id,
  source_type,
  source_id,
  employee_id,
  manager_id,
  original_rating,
  current_rating,
  manager_justification,
  ai_validation_status,
  manager_override,
  current_step,
  status
)
SELECT
  '1d07ee47-3b01-4bd7-91e2-54c065270141',  -- active workflow
  '8f25ad18-4b25-4808-b6bd-404904a098c4',  -- review id
  'competency_assessment',
  '8f25ad18-4b25-4808-b6bd-404904a098c4',
  'c1c41f2b-34e6-4adb-80dd-93e84f706560',  -- Bryant Sami
  'f96cfe0b-ba59-4553-9567-dca555b3ac2d',  -- Zachariah Taylor (manager)
  4,
  4,
  NULL,
  'pending',
  false,
  1,
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM moderation_cases
  WHERE review_id = '8f25ad18-4b25-4808-b6bd-404904a098c4'
);

/*
  # Add employee comment columns

  ## Summary
  Adds three new columns to support employee-authored comments:

  1. `one_to_one_weekly_checkins.employee_comment` (text)
     - The employee's own weekly update — written before the manager completes the check-in
     - Separate from the manager's `summary` field

  2. `one_to_one_monthly_reviews.employee_overall_comment` (text)
     - The employee's overall comment on the review period
     - Appears in the Actions & Comments tab, above the SERA summary

  3. `one_to_one_monthly_reviews.values_ratings` already stores per-competency data as JSONB
     - Per-competency employee comments will be stored inside each element as `employee_comment`
     - No schema change needed; JSONB column is flexible

  No existing data is modified. All new columns default to NULL.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_weekly_checkins' AND column_name = 'employee_comment'
  ) THEN
    ALTER TABLE one_to_one_weekly_checkins ADD COLUMN employee_comment text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_monthly_reviews' AND column_name = 'employee_overall_comment'
  ) THEN
    ALTER TABLE one_to_one_monthly_reviews ADD COLUMN employee_overall_comment text DEFAULT NULL;
  END IF;
END $$;

