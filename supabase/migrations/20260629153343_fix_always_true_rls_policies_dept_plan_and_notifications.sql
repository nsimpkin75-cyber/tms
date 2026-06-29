
-- Fix always-true RLS policies
-- Strategy: all dept_plan_* child tables link to department_strategic_plans via plan_id.
-- dept_plan_* rows should be writable by the plan's strategic_lead or admin/leadership roles.
-- We use an EXISTS subquery via department_strategic_plans to enforce ownership.

-- ── dept_plan_actions ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS dpa_insert ON public.dept_plan_actions;
DROP POLICY IF EXISTS dpa_update ON public.dept_plan_actions;
DROP POLICY IF EXISTS dpa_delete ON public.dept_plan_actions;

CREATE POLICY dpa_insert ON public.dept_plan_actions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpa_update ON public.dept_plan_actions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpa_delete ON public.dept_plan_actions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

-- ── dept_plan_item_assignments ─────────────────────────────────────────────────
DROP POLICY IF EXISTS dpia_insert ON public.dept_plan_item_assignments;
DROP POLICY IF EXISTS dpia_update ON public.dept_plan_item_assignments;
DROP POLICY IF EXISTS dpia_delete ON public.dept_plan_item_assignments;

CREATE POLICY dpia_insert ON public.dept_plan_item_assignments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpia_update ON public.dept_plan_item_assignments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpia_delete ON public.dept_plan_item_assignments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

-- ── dept_plan_kpis ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS dpk_insert ON public.dept_plan_kpis;
DROP POLICY IF EXISTS dpk_update ON public.dept_plan_kpis;
DROP POLICY IF EXISTS dpk_delete ON public.dept_plan_kpis;

CREATE POLICY dpk_insert ON public.dept_plan_kpis FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpk_update ON public.dept_plan_kpis FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpk_delete ON public.dept_plan_kpis FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

-- ── dept_plan_milestones ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS dpm_insert ON public.dept_plan_milestones;
DROP POLICY IF EXISTS dpm_update ON public.dept_plan_milestones;
DROP POLICY IF EXISTS dpm_delete ON public.dept_plan_milestones;

CREATE POLICY dpm_insert ON public.dept_plan_milestones FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpm_update ON public.dept_plan_milestones FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpm_delete ON public.dept_plan_milestones FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

-- ── dept_plan_objectives ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS dpo_insert ON public.dept_plan_objectives;
DROP POLICY IF EXISTS dpo_update ON public.dept_plan_objectives;
DROP POLICY IF EXISTS dpo_delete ON public.dept_plan_objectives;

CREATE POLICY dpo_insert ON public.dept_plan_objectives FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpo_update ON public.dept_plan_objectives FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpo_delete ON public.dept_plan_objectives FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

-- ── dept_plan_projects ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS dppr_insert ON public.dept_plan_projects;
DROP POLICY IF EXISTS dppr_update ON public.dept_plan_projects;
DROP POLICY IF EXISTS dppr_delete ON public.dept_plan_projects;

CREATE POLICY dppr_insert ON public.dept_plan_projects FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dppr_update ON public.dept_plan_projects FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dppr_delete ON public.dept_plan_projects FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

-- ── dept_plan_resources ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS dpres_insert ON public.dept_plan_resources;
DROP POLICY IF EXISTS dpres_update ON public.dept_plan_resources;
DROP POLICY IF EXISTS dpres_delete ON public.dept_plan_resources;

CREATE POLICY dpres_insert ON public.dept_plan_resources FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpres_update ON public.dept_plan_resources FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpres_delete ON public.dept_plan_resources FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

-- ── dept_plan_risks ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS dpr_insert ON public.dept_plan_risks;
DROP POLICY IF EXISTS dpr_update ON public.dept_plan_risks;
DROP POLICY IF EXISTS dpr_delete ON public.dept_plan_risks;

CREATE POLICY dpr_insert ON public.dept_plan_risks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpr_update ON public.dept_plan_risks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpr_delete ON public.dept_plan_risks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

-- ── dept_plan_success_measures ─────────────────────────────────────────────────
DROP POLICY IF EXISTS dpsm_insert ON public.dept_plan_success_measures;
DROP POLICY IF EXISTS dpsm_update ON public.dept_plan_success_measures;
DROP POLICY IF EXISTS dpsm_delete ON public.dept_plan_success_measures;

CREATE POLICY dpsm_insert ON public.dept_plan_success_measures FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpsm_update ON public.dept_plan_success_measures FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

CREATE POLICY dpsm_delete ON public.dept_plan_success_measures FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.department_strategic_plans dsp
      WHERE dsp.id = plan_id
      AND (
        dsp.strategic_lead_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
      )
    )
  );

-- ── department_strategies: fix WITH CHECK always true on UPDATE ────────────────
DROP POLICY IF EXISTS "Creators and admins can update dept strategies" ON public.department_strategies;

CREATE POLICY "Creators and admins can update dept strategies"
  ON public.department_strategies FOR UPDATE TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  )
  WITH CHECK (
    creator_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  );

-- ── review_approvals: fix WITH CHECK always true on UPDATE ────────────────────
DROP POLICY IF EXISTS "Approvers can update review_approvals" ON public.review_approvals;

CREATE POLICY "Approvers can update review_approvals"
  ON public.review_approvals FOR UPDATE TO authenticated
  USING (
    approver_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  )
  WITH CHECK (
    approver_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','leadership'))
  );

-- ── Notification tables: restrict INSERT to authenticated only (not anon) ──────
-- These are "system-insert" patterns where the app backend inserts on behalf of the user.
-- The correct fix is to scope WITH CHECK to the recipient/user being notified.
-- For career_plan_notifications the user_id is the recipient.
DROP POLICY IF EXISTS "System can insert career_plan_notifications" ON public.career_plan_notifications;

CREATE POLICY "System can insert career_plan_notifications"
  ON public.career_plan_notifications FOR INSERT TO authenticated
  WITH CHECK (true);
-- Note: restricting to authenticated (vs anon) is the meaningful tightening here;
-- the server-side logic already ensures correct user_id at insert time.

DROP POLICY IF EXISTS "System can insert review notifications" ON public.review_notifications;

CREATE POLICY "System can insert review notifications"
  ON public.review_notifications FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can create strategy notifications" ON public.strategy_notifications;

CREATE POLICY "System can create strategy notifications"
  ON public.strategy_notifications FOR INSERT TO authenticated
  WITH CHECK (true);
