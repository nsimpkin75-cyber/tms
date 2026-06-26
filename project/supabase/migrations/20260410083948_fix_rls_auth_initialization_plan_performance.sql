/*
  # Fix Auth RLS initialization plan performance

  Replaces bare auth.<function>() calls with (select auth.<function>()) in RLS policies
  to prevent per-row re-evaluation. Affects:
  - moderation_workflow_configs (3 write policies)
  - moderation_workflow_steps (3 write policies)
  - moderation_cases (3 policies)
  - moderation_case_decisions (2 policies)
  - one_to_one_cycle_employee_assignments (3 policies)
*/

-- ============================================================
-- moderation_workflow_configs
-- ============================================================
DROP POLICY IF EXISTS "Admins delete workflow configs" ON public.moderation_workflow_configs;
DROP POLICY IF EXISTS "Admins insert workflow configs" ON public.moderation_workflow_configs;
DROP POLICY IF EXISTS "Admins update workflow configs" ON public.moderation_workflow_configs;

CREATE POLICY "Admins delete workflow configs"
  ON public.moderation_workflow_configs FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ));

CREATE POLICY "Admins insert workflow configs"
  ON public.moderation_workflow_configs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ));

CREATE POLICY "Admins update workflow configs"
  ON public.moderation_workflow_configs FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ));

-- ============================================================
-- moderation_workflow_steps
-- ============================================================
DROP POLICY IF EXISTS "Admins manage workflow steps delete" ON public.moderation_workflow_steps;
DROP POLICY IF EXISTS "Admins manage workflow steps insert" ON public.moderation_workflow_steps;
DROP POLICY IF EXISTS "Admins manage workflow steps update" ON public.moderation_workflow_steps;

CREATE POLICY "Admins manage workflow steps delete"
  ON public.moderation_workflow_steps FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ));

CREATE POLICY "Admins manage workflow steps insert"
  ON public.moderation_workflow_steps FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ));

CREATE POLICY "Admins manage workflow steps update"
  ON public.moderation_workflow_steps FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ));

-- ============================================================
-- moderation_cases
-- ============================================================
DROP POLICY IF EXISTS "Managers and approvers update moderation cases" ON public.moderation_cases;
DROP POLICY IF EXISTS "Managers create moderation cases" ON public.moderation_cases;
DROP POLICY IF EXISTS "View own and approver moderation cases" ON public.moderation_cases;

CREATE POLICY "Managers and approvers update moderation cases"
  ON public.moderation_cases FOR UPDATE TO authenticated
  USING (
    manager_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role, 'dept_lead'::user_role, 'senior'::user_role]))
  )
  WITH CHECK (
    manager_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role, 'dept_lead'::user_role, 'senior'::user_role]))
  );

CREATE POLICY "Managers create moderation cases"
  ON public.moderation_cases FOR INSERT TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

CREATE POLICY "View own and approver moderation cases"
  ON public.moderation_cases FOR SELECT TO authenticated
  USING (
    manager_id = (SELECT auth.uid())
    OR employee_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role, 'dept_lead'::user_role, 'senior'::user_role]))
  );

-- ============================================================
-- moderation_case_decisions
-- ============================================================
DROP POLICY IF EXISTS "Approvers insert decisions" ON public.moderation_case_decisions;
DROP POLICY IF EXISTS "View relevant moderation decisions" ON public.moderation_case_decisions;

CREATE POLICY "Approvers insert decisions"
  ON public.moderation_case_decisions FOR INSERT TO authenticated
  WITH CHECK (decided_by = (SELECT auth.uid()));

CREATE POLICY "View relevant moderation decisions"
  ON public.moderation_case_decisions FOR SELECT TO authenticated
  USING (
    decided_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM moderation_cases mc
      WHERE mc.id = moderation_case_decisions.case_id
        AND (mc.manager_id = (SELECT auth.uid()) OR mc.employee_id = (SELECT auth.uid()))
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role, 'dept_lead'::user_role, 'senior'::user_role]))
  );

-- ============================================================
-- one_to_one_cycle_employee_assignments
-- ============================================================
DROP POLICY IF EXISTS "Managers can insert cycle assignments" ON public.one_to_one_cycle_employee_assignments;
DROP POLICY IF EXISTS "Managers can manage their cycle assignments" ON public.one_to_one_cycle_employee_assignments;
DROP POLICY IF EXISTS "Managers can update cycle assignments" ON public.one_to_one_cycle_employee_assignments;

CREATE POLICY "Managers can manage their cycle assignments"
  ON public.one_to_one_cycle_employee_assignments FOR SELECT TO authenticated
  USING (
    manager_id = (SELECT auth.uid())
    OR employee_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role]))
  );

CREATE POLICY "Managers can insert cycle assignments"
  ON public.one_to_one_cycle_employee_assignments FOR INSERT TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

CREATE POLICY "Managers can update cycle assignments"
  ON public.one_to_one_cycle_employee_assignments FOR UPDATE TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));
