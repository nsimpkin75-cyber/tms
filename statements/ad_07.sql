CREATE TABLE IF NOT EXISTS skill_rating_scale (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_name TEXT NOT NULL UNIQUE,
  rating_value INTEGER NOT NULL UNIQUE,
  description TEXT,
  color_code TEXT DEFAULT '#gray',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE skill_rating_scale ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rating scale"
  ON skill_rating_scale FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage rating scale"
  ON skill_rating_scale FOR ALL
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

CREATE TABLE IF NOT EXISTS department_skills_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_family_id UUID REFERENCES job_families(id) ON DELETE SET NULL,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  skill_type_id UUID NOT NULL REFERENCES skill_types(id) ON DELETE CASCADE,
  is_mandatory BOOLEAN DEFAULT true,
  is_role_relevant BOOLEAN DEFAULT true,
  target_rating_value INTEGER DEFAULT 3,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(department, job_title, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_dept_matrix_dept_title ON department_skills_matrix(department, job_title);
CREATE INDEX IF NOT EXISTS idx_dept_matrix_skill ON department_skills_matrix(skill_id);

ALTER TABLE department_skills_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage department skills matrix"
  ON department_skills_matrix FOR ALL
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

CREATE POLICY "Managers can view team matrix"
  ON department_skills_matrix FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin', 'leadership')
    )
  );

CREATE POLICY "Employees can view own matrix"
  ON department_skills_matrix FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.department = department_skills_matrix.department
      AND profiles.job_title = department_skills_matrix.job_title
    )
  );

CREATE TABLE IF NOT EXISTS skills_assessment_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES skill_assessment_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  employee_status TEXT DEFAULT 'pending',
  manager_status TEXT DEFAULT 'pending',
  has_discrepancies BOOLEAN DEFAULT false,
  discrepancy_count INTEGER DEFAULT 0,
  approval_status TEXT DEFAULT 'pending',
  employee_completed_at TIMESTAMPTZ,
  manager_completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  employee_notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_employee_status CHECK (employee_status IN ('pending', 'in_progress', 'completed', 'overdue')),
  CONSTRAINT valid_manager_status CHECK (manager_status IN ('pending', 'in_progress', 'completed', 'overdue')),
  CONSTRAINT valid_approval_status CHECK (approval_status IN ('pending', 'approved', 'changes_made')),
  UNIQUE(cycle_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_cycle ON skills_assessment_workflow(cycle_id);
CREATE INDEX IF NOT EXISTS idx_workflow_employee ON skills_assessment_workflow(employee_id);
CREATE INDEX IF NOT EXISTS idx_workflow_manager ON skills_assessment_workflow(manager_id);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON skills_assessment_workflow(employee_status, manager_status);

ALTER TABLE skills_assessment_workflow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own workflow"
  ON skills_assessment_workflow FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can view team workflow"
  ON skills_assessment_workflow FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'leadership')
    )
  );

CREATE POLICY "Managers can update team workflow"
  ON skills_assessment_workflow FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all workflows"
  ON skills_assessment_workflow FOR ALL
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

CREATE TABLE IF NOT EXISTS employee_skills_assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES skills_assessment_workflow(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  matrix_id UUID NOT NULL REFERENCES department_skills_matrix(id) ON DELETE CASCADE,
  rating_value INTEGER NOT NULL,
  rating_name TEXT NOT NULL,
  comments TEXT,
  is_greyed_out BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_rating CHECK (rating_value BETWEEN 1 AND 5),
  UNIQUE(workflow_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_responses_workflow ON employee_skills_assessment_responses(workflow_id);
CREATE INDEX IF NOT EXISTS idx_employee_responses_employee ON employee_skills_assessment_responses(employee_id);

ALTER TABLE employee_skills_assessment_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can manage own responses"
  ON employee_skills_assessment_responses FOR ALL
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Managers can view team responses"
  ON employee_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM skills_assessment_workflow w
      WHERE w.id = employee_skills_assessment_responses.workflow_id
      AND w.manager_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all responses"
  ON employee_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS manager_skills_assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES skills_assessment_workflow(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  matrix_id UUID NOT NULL REFERENCES department_skills_matrix(id) ON DELETE CASCADE,
  rating_value INTEGER NOT NULL,
  rating_name TEXT NOT NULL,
  comments TEXT,
  is_greyed_out BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_manager_rating CHECK (rating_value BETWEEN 1 AND 5),
  UNIQUE(workflow_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_responses_workflow ON manager_skills_assessment_responses(workflow_id);
CREATE INDEX IF NOT EXISTS idx_manager_responses_manager ON manager_skills_assessment_responses(manager_id);

ALTER TABLE manager_skills_assessment_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage team responses"
  ON manager_skills_assessment_responses FOR ALL
  TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Employees can view own manager responses"
  ON manager_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Admins can view all manager responses"
  ON manager_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS assessment_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES skills_assessment_workflow(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  employee_rating INTEGER NOT NULL,
  manager_rating INTEGER NOT NULL,
  has_discrepancy BOOLEAN DEFAULT false,
  approved_rating INTEGER NOT NULL,
  approval_action TEXT NOT NULL,
  manager_override_reason TEXT,
  ai_discrepancy_analysis TEXT,
  approved_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  approved_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_approval_action CHECK (approval_action IN ('approved_employee', 'approved_manager', 'override')),
  UNIQUE(workflow_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_approvals_workflow ON assessment_approvals(workflow_id);

ALTER TABLE assessment_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage approvals"
  ON assessment_approvals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM skills_assessment_workflow w
      WHERE w.id = assessment_approvals.workflow_id
      AND w.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM skills_assessment_workflow w
      WHERE w.id = assessment_approvals.workflow_id
      AND w.manager_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view own approvals"
  ON assessment_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM skills_assessment_workflow w
      WHERE w.id = assessment_approvals.workflow_id
      AND w.employee_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all approvals"
  ON assessment_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS assessment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES skills_assessment_workflow(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_notification_type CHECK (notification_type IN ('assessment_assigned', 'manager_completed', 'approved', 'changes_made', 'overdue'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON assessment_notifications(recipient_id, is_read);

ALTER TABLE assessment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON assessment_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON assessment_notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON assessment_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

INSERT INTO skill_rating_scale (rating_name, rating_value, description, color_code, sort_order) VALUES
  ('Not Trained', 1, 'No training or experience with this skill', '#ef4444', 1),
  ('Trained', 2, 'Has received training but limited practical experience', '#f59e0b', 2),
  ('Developing', 3, 'Actively developing proficiency through practice', '#eab308', 3),
  ('Good', 4, 'Demonstrates good proficiency and can work independently', '#3b82f6', 4),
  ('Competent', 5, 'Expert level proficiency, can mentor others', '#10b981', 5)
ON CONFLICT (rating_name) DO NOTHING;

CREATE OR REPLACE VIEW team_skills_matrix_view AS
SELECT
  p.id AS employee_id,
  p.full_name AS employee_name,
  p.job_title,
  p.department,
  p.manager_id,
  s.id AS skill_id,
  s.name AS skill_name,
  st.name AS skill_type,
  dsm.is_mandatory,
  dsm.is_role_relevant,
  dsm.target_rating_value,
  COALESCE(aa.approved_rating, msr.rating_value, esr.rating_value) AS current_rating,
  COALESCE(aa.approved_rating, msr.rating_value, esr.rating_value) AS average_rating,
  w.employee_status,
  w.manager_status,
  w.has_discrepancies,
  w.employee_completed_at AS last_assessment_date,
  sac.status AS cycle_status,
  sac.name AS cycle_name
FROM profiles p
JOIN department_skills_matrix dsm ON 
  dsm.department = p.department AND 
  dsm.job_title = p.job_title
JOIN skills s ON s.id = dsm.skill_id
LEFT JOIN skill_types st ON st.id = dsm.skill_type_id
LEFT JOIN skills_assessment_workflow w ON 
  w.employee_id = p.id AND
  w.cycle_id IN (
    SELECT id FROM skill_assessment_cycles
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  )
LEFT JOIN skill_assessment_cycles sac ON sac.id = w.cycle_id
LEFT JOIN employee_skills_assessment_responses esr ON 
  esr.workflow_id = w.id AND
  esr.skill_id = s.id
LEFT JOIN manager_skills_assessment_responses msr ON 
  msr.workflow_id = w.id AND
  msr.skill_id = s.id
LEFT JOIN assessment_approvals aa ON 
  aa.workflow_id = w.id AND
  aa.skill_id = s.id
WHERE p.active = true;

CREATE OR REPLACE VIEW assessment_cycle_metrics AS
SELECT
  sac.id AS cycle_id,
  sac.name AS cycle_name,
  sac.status AS cycle_status,
  sac.start_date,
  sac.end_date,
  COUNT(DISTINCT w.employee_id) AS total_assigned,
  COUNT(DISTINCT w.employee_id) FILTER (WHERE w.employee_status = 'completed') AS employee_completed,
  COUNT(DISTINCT w.employee_id) FILTER (WHERE w.manager_status = 'completed') AS manager_completed,
  COUNT(DISTINCT w.employee_id) FILTER (WHERE w.employee_status = 'overdue' OR w.manager_status = 'overdue') AS overdue,
  COUNT(DISTINCT w.employee_id) FILTER (WHERE w.employee_status = 'in_progress') AS in_progress,
  COUNT(DISTINCT w.employee_id) FILTER (WHERE w.has_discrepancies = true) AS total_discrepancies,
  ROUND(AVG(w.discrepancy_count), 2) AS avg_discrepancies_per_employee,
  ROUND(
    (COUNT(DISTINCT w.employee_id) FILTER (WHERE w.employee_status = 'completed' AND w.manager_status = 'completed')::NUMERIC / 
    NULLIF(COUNT(DISTINCT w.employee_id), 0) * 100), 
    2
  ) AS completion_percentage
FROM skill_assessment_cycles sac
LEFT JOIN skills_assessment_workflow w ON w.cycle_id = sac.id
GROUP BY sac.id, sac.name, sac.status, sac.start_date, sac.end_date;