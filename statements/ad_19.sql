DROP POLICY IF EXISTS "Admins can manage skill types" ON skill_types;
CREATE POLICY "Admins can manage skill types"
  ON skill_types FOR ALL
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

DROP POLICY IF EXISTS "Admins can manage role skills" ON role_skills;
CREATE POLICY "Admins can manage role skills"
  ON role_skills FOR ALL
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

DROP POLICY IF EXISTS "Admins can manage assessment cycles" ON skill_assessment_cycles;
CREATE POLICY "Admins can manage assessment cycles"
  ON skill_assessment_cycles FOR ALL
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

DROP POLICY IF EXISTS "Admins can view all skill assessments" ON employee_skill_assessments;
CREATE POLICY "Admins can view all skill assessments"
  ON employee_skill_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can manage own skill assessments" ON employee_skill_assessments;
CREATE POLICY "Employees can manage own skill assessments"
  ON employee_skill_assessments FOR ALL
  TO authenticated
  USING (employee_id = (SELECT auth.uid()))
  WITH CHECK (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team skill assessments" ON employee_skill_assessments;
CREATE POLICY "Managers can view team skill assessments"
  ON employee_skill_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view all manager assessments" ON manager_skill_assessments;
CREATE POLICY "Admins can view all manager assessments"
  ON manager_skill_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can view own manager assessments" ON manager_skill_assessments;
CREATE POLICY "Employees can view own manager assessments"
  ON manager_skill_assessments FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can manage team skill assessments" ON manager_skill_assessments;
CREATE POLICY "Managers can manage team skill assessments"
  ON manager_skill_assessments FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all discrepancies" ON skill_assessment_discrepancies;
CREATE POLICY "Admins can manage all discrepancies"
  ON skill_assessment_discrepancies FOR ALL
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

DROP POLICY IF EXISTS "Employees can view own discrepancies" ON skill_assessment_discrepancies;
CREATE POLICY "Employees can view own discrepancies"
  ON skill_assessment_discrepancies FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update team discrepancies" ON skill_assessment_discrepancies;
CREATE POLICY "Managers can update team discrepancies"
  ON skill_assessment_discrepancies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can view team discrepancies" ON skill_assessment_discrepancies;
CREATE POLICY "Managers can view team discrepancies"
  ON skill_assessment_discrepancies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Employees can view own skill discussions" ON one_to_one_skill_discussions;
CREATE POLICY "Employees can view own skill discussions"
  ON one_to_one_skill_discussions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews mr
      JOIN one_to_one_scheduled_meetings m ON m.id = mr.meeting_id
      WHERE mr.id = one_to_one_skill_discussions.monthly_review_id
      AND m.employee_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can manage skill discussions" ON one_to_one_skill_discussions;
CREATE POLICY "Managers can manage skill discussions"
  ON one_to_one_skill_discussions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews mr
      JOIN one_to_one_scheduled_meetings m ON m.id = mr.meeting_id
      WHERE mr.id = one_to_one_skill_discussions.monthly_review_id
      AND m.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews mr
      JOIN one_to_one_scheduled_meetings m ON m.id = mr.meeting_id
      WHERE mr.id = one_to_one_skill_discussions.monthly_review_id
      AND m.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage all development actions" ON skill_development_actions;
CREATE POLICY "Admins can manage all development actions"
  ON skill_development_actions FOR ALL
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

DROP POLICY IF EXISTS "Employees can view own development actions" ON skill_development_actions;
CREATE POLICY "Employees can view own development actions"
  ON skill_development_actions FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can manage team development actions" ON skill_development_actions;
CREATE POLICY "Managers can manage team development actions"
  ON skill_development_actions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage rating scale" ON skill_rating_scale;
CREATE POLICY "Admins can manage rating scale"
  ON skill_rating_scale FOR ALL
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

DROP POLICY IF EXISTS "Admins can manage department skills matrix" ON department_skills_matrix;
CREATE POLICY "Admins can manage department skills matrix"
  ON department_skills_matrix FOR ALL
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

DROP POLICY IF EXISTS "Employees can view own matrix" ON department_skills_matrix;
CREATE POLICY "Employees can view own matrix"
  ON department_skills_matrix FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.department = department_skills_matrix.department
    )
  );

DROP POLICY IF EXISTS "Managers can view team matrix" ON department_skills_matrix;
CREATE POLICY "Managers can view team matrix"
  ON department_skills_matrix FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage all workflows" ON skills_assessment_workflow;
CREATE POLICY "Admins can manage all workflows"
  ON skills_assessment_workflow FOR ALL
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

DROP POLICY IF EXISTS "Employees can view own workflow" ON skills_assessment_workflow;
CREATE POLICY "Employees can view own workflow"
  ON skills_assessment_workflow FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update team workflow" ON skills_assessment_workflow;
CREATE POLICY "Managers can update team workflow"
  ON skills_assessment_workflow FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team workflow" ON skills_assessment_workflow;
CREATE POLICY "Managers can view team workflow"
  ON skills_assessment_workflow FOR SELECT
  TO authenticated
  USING (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all responses" ON employee_skills_assessment_responses;
CREATE POLICY "Admins can view all responses"
  ON employee_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can manage own responses" ON employee_skills_assessment_responses;
CREATE POLICY "Employees can manage own responses"
  ON employee_skills_assessment_responses FOR ALL
  TO authenticated
  USING (employee_id = (SELECT auth.uid()))
  WITH CHECK (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team responses" ON employee_skills_assessment_responses;
CREATE POLICY "Managers can view team responses"
  ON employee_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can view all manager responses" ON manager_skills_assessment_responses;
CREATE POLICY "Admins can view all manager responses"
  ON manager_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can view own manager responses" ON manager_skills_assessment_responses;
CREATE POLICY "Employees can view own manager responses"
  ON manager_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can manage team responses" ON manager_skills_assessment_responses;
CREATE POLICY "Managers can manage team responses"
  ON manager_skills_assessment_responses FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all approvals" ON assessment_approvals;
CREATE POLICY "Admins can view all approvals"
  ON assessment_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can view own approvals" ON assessment_approvals;
CREATE POLICY "Employees can view own approvals"
  ON assessment_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM skills_assessment_workflow saw
      WHERE saw.id = assessment_approvals.workflow_id
      AND saw.employee_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can manage approvals" ON assessment_approvals;
CREATE POLICY "Managers can manage approvals"
  ON assessment_approvals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM skills_assessment_workflow saw
      WHERE saw.id = assessment_approvals.workflow_id
      AND saw.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM skills_assessment_workflow saw
      WHERE saw.id = assessment_approvals.workflow_id
      AND saw.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own notifications" ON assessment_notifications;
CREATE POLICY "Users can update own notifications"
  ON assessment_notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own notifications" ON assessment_notifications;
CREATE POLICY "Users can view own notifications"
  ON assessment_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()));