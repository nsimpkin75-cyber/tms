DROP POLICY IF EXISTS "Managers can manage summaries" ON review_summaries;
DROP POLICY IF EXISTS "Users can view summaries for their meetings" ON review_summaries;

CREATE POLICY "Managers can manage summaries" ON review_summaries
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM review_meetings rm
    WHERE rm.id = review_summaries.review_instance_id
    AND rm.manager_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can view summaries for their meetings" ON review_summaries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM review_meetings rm
    WHERE rm.id = review_summaries.review_instance_id
    AND (rm.manager_id = (SELECT auth.uid()) OR rm.employee_id = (SELECT auth.uid()))
  )
);

DROP POLICY IF EXISTS "Authenticated users can view active job titles" ON job_titles;

CREATE POLICY "Authenticated users can view active job titles" ON job_titles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Creators can update strategies" ON executive_strategies;
DROP POLICY IF EXISTS "Exec can create strategies" ON executive_strategies;
DROP POLICY IF EXISTS "Users can view active strategies" ON executive_strategies;

CREATE POLICY "Creators can update strategies" ON executive_strategies
FOR UPDATE
TO authenticated
USING (creator_id = (SELECT auth.uid()));

CREATE POLICY "Exec can create strategies" ON executive_strategies
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role IN ('leadership', 'admin')
  )
);

CREATE POLICY "Users can view active strategies" ON executive_strategies
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Exec can manage focus areas" ON strategy_focus_areas_v2;
DROP POLICY IF EXISTS "Users can view focus areas" ON strategy_focus_areas_v2;

CREATE POLICY "Exec can manage focus areas" ON strategy_focus_areas_v2
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role IN ('leadership', 'admin')
  )
);

CREATE POLICY "Users can view focus areas" ON strategy_focus_areas_v2
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Exec can manage lead assignments" ON strategy_lead_assignments;
DROP POLICY IF EXISTS "Users can view lead assignments" ON strategy_lead_assignments;

CREATE POLICY "Exec can manage lead assignments" ON strategy_lead_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role IN ('leadership', 'admin')
  )
);

CREATE POLICY "Users can view lead assignments" ON strategy_lead_assignments
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Creators can manage dept KPIs" ON department_strategy_kpis;
DROP POLICY IF EXISTS "Users can view dept KPIs" ON department_strategy_kpis;

CREATE POLICY "Creators can manage dept KPIs" ON department_strategy_kpis
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM department_strategies ds
    WHERE ds.id = department_strategy_kpis.department_strategy_id
    AND ds.creator_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can view dept KPIs" ON department_strategy_kpis
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Approvers can manage approvals" ON department_strategy_approvals;
DROP POLICY IF EXISTS "Users can view approvals" ON department_strategy_approvals;

CREATE POLICY "Approvers can manage approvals" ON department_strategy_approvals
FOR ALL
TO authenticated
USING (approver_id = (SELECT auth.uid()));

CREATE POLICY "Users can view approvals" ON department_strategy_approvals
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Creators can manage template KPIs" ON review_template_kpis;

CREATE POLICY "Creators can manage template KPIs" ON review_template_kpis
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM review_templates rt
    WHERE rt.id = review_template_kpis.template_id
    AND rt.creator_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Managers can create review instances" ON review_instances;
DROP POLICY IF EXISTS "Managers can update review instances" ON review_instances;
DROP POLICY IF EXISTS "Users can view review instances" ON review_instances;

CREATE POLICY "Managers can create review instances" ON review_instances
FOR INSERT
TO authenticated
WITH CHECK (manager_id = (SELECT auth.uid()));

CREATE POLICY "Managers can update review instances" ON review_instances
FOR UPDATE
TO authenticated
USING (manager_id = (SELECT auth.uid()));

CREATE POLICY "Users can view review instances" ON review_instances
FOR SELECT
TO authenticated
USING (
  employee_id = (SELECT auth.uid()) OR 
  manager_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Leadership can view all review cycles" ON one_to_one_review_cycles;
DROP POLICY IF EXISTS "Managers can manage their review cycles" ON one_to_one_review_cycles;

CREATE POLICY "Leadership can view all review cycles" ON one_to_one_review_cycles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role IN ('leadership', 'admin')
  )
);

CREATE POLICY "Managers can manage their review cycles" ON one_to_one_review_cycles
FOR ALL
TO authenticated
USING (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Leadership can view all cycle KPIs" ON one_to_one_cycle_kpis;
DROP POLICY IF EXISTS "Managers can manage cycle KPIs" ON one_to_one_cycle_kpis;

CREATE POLICY "Leadership can view all cycle KPIs" ON one_to_one_cycle_kpis
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role IN ('leadership', 'admin')
  )
);

CREATE POLICY "Managers can manage cycle KPIs" ON one_to_one_cycle_kpis
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM one_to_one_review_cycles rc
    WHERE rc.id = one_to_one_cycle_kpis.cycle_id
    AND rc.manager_id = (SELECT auth.uid())
  )
);