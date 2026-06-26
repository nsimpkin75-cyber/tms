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
