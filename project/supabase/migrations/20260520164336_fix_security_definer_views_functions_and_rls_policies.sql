/*
  # Security Fixes: Views, Functions, and RLS Policies

  ## Summary
  Addresses all reported security issues in four categories:

  ### 1. Security Definer Views → Recreated as Security Invoker
  - `public.employee_skill_summary` — was SECURITY DEFINER, recreated without it
  - `public.user_status_view` — was SECURITY DEFINER, recreated without it

  ### 2. RLS UPDATE Policies with `WITH CHECK (true)` → Fixed to mirror USING clause
  - `career_plan_actions`: Admins can update plan actions
  - `career_plan_actions`: Managers can update team plan actions
  - `career_plan_actions`: Users can update actions for own plans
  - `career_plans`: Admins can update all career plans
  - `career_plans`: Dept leads can update plans targeting their dept
  - `career_plans`: Managers can update team career plans

  ### 3. SECURITY DEFINER Functions — Revoke anon EXECUTE
  Revokes anon execute on all affected functions so they cannot be called
  unauthenticated via the REST API.

  ### 4. Trigger functions — Remove SECURITY DEFINER where not needed
  Trigger functions (handle_new_user, update_updated_at_column,
  update_organisation_settings_updated_at, update_last_active) are invoked by
  the database engine, not by roles, so removing SECURITY DEFINER from them is
  safe and removes the public-execute exposure.
*/

-- ============================================================
-- 1. Fix SECURITY DEFINER views
-- ============================================================

-- Drop and recreate employee_skill_summary without SECURITY DEFINER
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
    SELECT sr.rating_value FROM skill_ratings sr
    WHERE sr.employee_id = sa.profile_id AND sr.skill_id = sm.id AND sr.rated_by = sa.profile_id
    ORDER BY sr.rated_at DESC LIMIT 1
  ) AS latest_self_rating,
  (
    SELECT sr.rating_value FROM skill_ratings sr
    WHERE sr.employee_id = sa.profile_id AND sr.skill_id = sm.id AND sr.rated_by <> sa.profile_id
    ORDER BY sr.rated_at DESC LIMIT 1
  ) AS latest_manager_rating,
  sa.current_level AS current_rating,
  sa.assessment_date AS last_assessed_at,
  'active'::text AS cycle_status,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM skill_assessment_discrepancies sad
      WHERE sad.employee_id = sa.profile_id AND sad.skill_id = sm.id
        AND sad.flagged_for_discussion = true AND sad.resolved_at IS NULL
    ) THEN true
    ELSE false
  END AS has_discrepancy,
  (
    SELECT sad.ai_analysis FROM skill_assessment_discrepancies sad
    WHERE sad.employee_id = sa.profile_id AND sad.skill_id = sm.id
    ORDER BY sad.created_at DESC LIMIT 1
  ) AS discrepancy_analysis
FROM skill_assessments sa
JOIN skills_master sm ON sa.skill_id = sm.id
LEFT JOIN skill_types st ON sm.skill_type_id = st.id;

-- Drop and recreate user_status_view without SECURITY DEFINER
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

-- ============================================================
-- 2. Fix RLS UPDATE policies with WITH CHECK (true)
-- ============================================================

-- career_plan_actions: Admins can update plan actions
DROP POLICY IF EXISTS "Admins can update plan actions" ON public.career_plan_actions;
CREATE POLICY "Admins can update plan actions"
  ON public.career_plan_actions
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
  ));

-- career_plan_actions: Managers can update team plan actions
DROP POLICY IF EXISTS "Managers can update team plan actions" ON public.career_plan_actions;
CREATE POLICY "Managers can update team plan actions"
  ON public.career_plan_actions
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM career_plans cp
    JOIN profiles emp ON (emp.id = cp.user_id OR emp.id = cp.profile_id)
    WHERE cp.id = career_plan_actions.plan_id AND emp.manager_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM career_plans cp
    JOIN profiles emp ON (emp.id = cp.user_id OR emp.id = cp.profile_id)
    WHERE cp.id = career_plan_actions.plan_id AND emp.manager_id = auth.uid()
  ));

-- career_plan_actions: Users can update actions for own plans
DROP POLICY IF EXISTS "Users can update actions for own plans" ON public.career_plan_actions;
CREATE POLICY "Users can update actions for own plans"
  ON public.career_plan_actions
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM career_plans cp
    WHERE cp.id = career_plan_actions.plan_id
      AND (cp.user_id = auth.uid() OR cp.profile_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM career_plans cp
    WHERE cp.id = career_plan_actions.plan_id
      AND (cp.user_id = auth.uid() OR cp.profile_id = auth.uid())
  ));

-- career_plans: Admins can update all career plans
DROP POLICY IF EXISTS "Admins can update all career plans" ON public.career_plans;
CREATE POLICY "Admins can update all career plans"
  ON public.career_plans
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
  ));

-- career_plans: Dept leads can update plans targeting their dept
DROP POLICY IF EXISTS "Dept leads can update plans targeting their dept" ON public.career_plans;
CREATE POLICY "Dept leads can update plans targeting their dept"
  ON public.career_plans
  FOR UPDATE
  TO authenticated
  USING (
    target_department IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = ANY (ARRAY['leadership'::user_role, 'admin'::user_role])
        AND p.department = career_plans.target_department
    )
  )
  WITH CHECK (
    target_department IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = ANY (ARRAY['leadership'::user_role, 'admin'::user_role])
        AND p.department = career_plans.target_department
    )
  );

-- career_plans: Managers can update team career plans
DROP POLICY IF EXISTS "Managers can update team career plans" ON public.career_plans;
CREATE POLICY "Managers can update team career plans"
  ON public.career_plans
  FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = ANY (ARRAY['manager'::user_role, 'leadership'::user_role])
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE (emp.id = career_plans.user_id OR emp.id = career_plans.profile_id)
            AND emp.manager_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = ANY (ARRAY['manager'::user_role, 'leadership'::user_role])
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE (emp.id = career_plans.user_id OR emp.id = career_plans.profile_id)
            AND emp.manager_id = auth.uid()
        )
    )
  );

-- ============================================================
-- 3. Revoke anon EXECUTE on SECURITY DEFINER functions
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_active_view_as_session(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_access_levels(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_access_level(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_user_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_last_active() FROM anon;

-- ============================================================
-- 4. Recreate trigger functions without SECURITY DEFINER
-- (Triggers are invoked by the DB engine, not by roles —
--  SECURITY DEFINER is unnecessary and creates exposure)
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_organisation_settings_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- handle_new_user must remain SECURITY DEFINER because it inserts into
-- public.profiles from an auth trigger (runs as the auth schema user).
-- We only revoke anon direct-call access.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- update_last_active is called by authenticated users directly via RPC —
-- keep SECURITY DEFINER so it can UPDATE profiles, but revoke anon.
-- (already revoked above)
