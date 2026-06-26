DROP POLICY IF EXISTS "Managers can create review cycles" ON review_cycles;
CREATE POLICY "Managers can create review cycles"
  ON review_cycles FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update their cycles" ON review_cycles;
CREATE POLICY "Managers can update their cycles"
  ON review_cycles FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their cycles" ON review_cycles;
CREATE POLICY "Users can view their cycles"
  ON review_cycles FOR SELECT
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM review_cycle_members rcm
      WHERE rcm.cycle_id = review_cycles.id
      AND rcm.employee_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can delete cycle members" ON review_cycle_members;
CREATE POLICY "Managers can delete cycle members"
  ON review_cycle_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_members.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can update cycle members" ON review_cycle_members;
CREATE POLICY "Managers can update cycle members"
  ON review_cycle_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_members.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_members.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view cycle members" ON review_cycle_members;
CREATE POLICY "Users can view cycle members"
  ON review_cycle_members FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_members.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can delete cycle KPIs" ON review_cycle_kpis;
CREATE POLICY "Managers can delete cycle KPIs"
  ON review_cycle_kpis FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_kpis.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can update cycle KPIs" ON review_cycle_kpis;
CREATE POLICY "Managers can update cycle KPIs"
  ON review_cycle_kpis FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_kpis.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_kpis.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view cycle KPIs" ON review_cycle_kpis;
CREATE POLICY "Users can view cycle KPIs"
  ON review_cycle_kpis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_kpis.cycle_id
      AND (
        rc.manager_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM review_cycle_members rcm
          WHERE rcm.cycle_id = rc.id
          AND rcm.employee_id = (SELECT auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS "Managers can delete cycle actions" ON review_cycle_actions;
CREATE POLICY "Managers can delete cycle actions"
  ON review_cycle_actions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_actions.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can update cycle actions" ON review_cycle_actions;
CREATE POLICY "Managers can update cycle actions"
  ON review_cycle_actions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_actions.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_actions.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view cycle actions" ON review_cycle_actions;
CREATE POLICY "Users can view cycle actions"
  ON review_cycle_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_actions.cycle_id
      AND (
        rc.manager_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM review_cycle_members rcm
          WHERE rcm.cycle_id = rc.id
          AND rcm.employee_id = (SELECT auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS "Managers can create KPI ratings" ON review_weekly_kpi_ratings;
CREATE POLICY "Managers can create KPI ratings"
  ON review_weekly_kpi_ratings FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update KPI ratings" ON review_weekly_kpi_ratings;
CREATE POLICY "Managers can update KPI ratings"
  ON review_weekly_kpi_ratings FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their KPI ratings" ON review_weekly_kpi_ratings;
CREATE POLICY "Users can view their KPI ratings"
  ON review_weekly_kpi_ratings FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage their actions" ON review_employee_actions;
CREATE POLICY "Users can manage their actions"
  ON review_employee_actions FOR ALL
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    action_owner = (SELECT auth.uid())
  )
  WITH CHECK (
    employee_id = (SELECT auth.uid()) OR
    action_owner = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can view their actions" ON review_employee_actions;
CREATE POLICY "Users can view their actions"
  ON review_employee_actions FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    action_owner = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Managers and HR can update weekly summaries" ON review_weekly_summaries;
CREATE POLICY "Managers and HR can update weekly summaries"
  ON review_weekly_summaries FOR UPDATE
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  )
  WITH CHECK (
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "Managers can create weekly summaries" ON review_weekly_summaries;
CREATE POLICY "Managers can create weekly summaries"
  ON review_weekly_summaries FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their weekly summaries" ON review_weekly_summaries;
CREATE POLICY "Users can view their weekly summaries"
  ON review_weekly_summaries FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Managers can manage competency scores" ON review_monthly_competency_scores;
CREATE POLICY "Managers can manage competency scores"
  ON review_monthly_competency_scores FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their competency scores" ON review_monthly_competency_scores;
CREATE POLICY "Users can view their competency scores"
  ON review_monthly_competency_scores FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Managers and HR can manage monthly averages" ON review_monthly_averages;
CREATE POLICY "Managers and HR can manage monthly averages"
  ON review_monthly_averages FOR ALL
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  )
  WITH CHECK (
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "Users can view their monthly averages" ON review_monthly_averages;
CREATE POLICY "Users can view their monthly averages"
  ON review_monthly_averages FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "System can create half year assessments" ON review_half_year_assessments;
CREATE POLICY "System can create half year assessments"
  ON review_half_year_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership', 'manager')
    )
  );

DROP POLICY IF EXISTS "Users and HR can update half year assessments" ON review_half_year_assessments;
CREATE POLICY "Users and HR can update half year assessments"
  ON review_half_year_assessments FOR UPDATE
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  )
  WITH CHECK (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "Users can view their half year assessments" ON review_half_year_assessments;
CREATE POLICY "Users can view their half year assessments"
  ON review_half_year_assessments FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Managers can manage schedules" ON review_schedules;
CREATE POLICY "Managers can manage schedules"
  ON review_schedules FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their schedules" ON review_schedules;
CREATE POLICY "Users can view their schedules"
  ON review_schedules FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Managers can view their submissions in queue" ON one_to_one_moderation_queue;
CREATE POLICY "Managers can view their submissions in queue"
  ON one_to_one_moderation_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews mr
      JOIN one_to_one_scheduled_meetings m ON m.id = mr.meeting_id
      WHERE mr.id = one_to_one_moderation_queue.monthly_review_id
      AND m.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Senior managers can moderate queue items" ON one_to_one_moderation_queue;
CREATE POLICY "Senior managers can moderate queue items"
  ON one_to_one_moderation_queue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  );