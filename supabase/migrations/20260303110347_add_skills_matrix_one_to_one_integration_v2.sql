/*
  # Skills Matrix & One to One Integration

  1. New Tables
    - `skill_types` - Categorizes skills (Technical, Soft, Product Knowledge)
    - `role_skills` - Maps required skills to job titles and departments
    - `skill_assessment_cycles` - Tracks skill assessment periods
    - `employee_skill_assessments` - Employee self-assessments of skills
    - `manager_skill_assessments` - Manager assessments of employee skills
    - `skill_assessment_discrepancies` - AI-flagged rating gaps between employee/manager
    - `one_to_one_skill_discussions` - Skills discussed during One to One meetings
    - `skill_development_actions` - Coaching actions linked to skills

  2. New Views
    - `employee_skill_summary` - Aggregated skill ratings and trends per employee
    - `team_skill_metrics` - Team-level skill assessment summaries

  3. Security
    - Enable RLS on all new tables
    - Employees can view own skills, managers can view team skills
    - Admins and L&D have full access to configure skill matrices
*/

-- Skill Types table
CREATE TABLE IF NOT EXISTS skill_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE skill_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage skill types"
  ON skill_types FOR ALL
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

CREATE POLICY "Authenticated users can view skill types"
  ON skill_types FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Role Skills mapping table
CREATE TABLE IF NOT EXISTS role_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title TEXT NOT NULL,
  department TEXT NOT NULL,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  skill_type_id UUID NOT NULL REFERENCES skill_types(id) ON DELETE CASCADE,
  proficiency_level_required INTEGER DEFAULT 3,
  is_mandatory BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_title, department, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_role_skills_job_dept ON role_skills(job_title, department);
CREATE INDEX IF NOT EXISTS idx_role_skills_skill ON role_skills(skill_id);

ALTER TABLE role_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage role skills"
  ON role_skills FOR ALL
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

CREATE POLICY "Authenticated users can view role skills"
  ON role_skills FOR SELECT
  TO authenticated
  USING (true);

-- Skill Assessment Cycles table
CREATE TABLE IF NOT EXISTS skill_assessment_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_assessment_cycles_status ON skill_assessment_cycles(status);
CREATE INDEX IF NOT EXISTS idx_assessment_cycles_dates ON skill_assessment_cycles(start_date, end_date);

ALTER TABLE skill_assessment_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assessment cycles"
  ON skill_assessment_cycles FOR ALL
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

CREATE POLICY "Authenticated users can view active cycles"
  ON skill_assessment_cycles FOR SELECT
  TO authenticated
  USING (status IN ('active', 'completed'));

-- Employee Skill Assessments table
CREATE TABLE IF NOT EXISTS employee_skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES skill_assessment_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  self_rating INTEGER NOT NULL,
  self_comment TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_self_rating CHECK (self_rating BETWEEN 1 AND 5),
  UNIQUE(cycle_id, employee_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_assessments_employee ON employee_skill_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_assessments_cycle ON employee_skill_assessments(cycle_id);

ALTER TABLE employee_skill_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can manage own skill assessments"
  ON employee_skill_assessments FOR ALL
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Managers can view team skill assessments"
  ON employee_skill_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin', 'leadership')
    )
    AND EXISTS (
      SELECT 1 FROM profiles emp
      WHERE emp.id = employee_skill_assessments.employee_id
      AND emp.manager_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all skill assessments"
  ON employee_skill_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Manager Skill Assessments table
CREATE TABLE IF NOT EXISTS manager_skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES skill_assessment_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  manager_rating INTEGER NOT NULL,
  manager_comment TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_manager_rating CHECK (manager_rating BETWEEN 1 AND 5),
  UNIQUE(cycle_id, employee_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_assessments_employee ON manager_skill_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_manager_assessments_manager ON manager_skill_assessments(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_assessments_cycle ON manager_skill_assessments(cycle_id);

ALTER TABLE manager_skill_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage team skill assessments"
  ON manager_skill_assessments FOR ALL
  TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Employees can view own manager assessments"
  ON manager_skill_assessments FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Admins can view all manager assessments"
  ON manager_skill_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Skill Assessment Discrepancies table (AI-flagged)
CREATE TABLE IF NOT EXISTS skill_assessment_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES skill_assessment_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  employee_rating INTEGER NOT NULL,
  manager_rating INTEGER NOT NULL,
  rating_gap INTEGER NOT NULL,
  ai_analysis TEXT,
  ai_discussion_prompts JSONB,
  flagged_for_discussion BOOLEAN DEFAULT false,
  discussed_in_meeting_id UUID REFERENCES one_to_one_monthly_reviews(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cycle_id, employee_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_discrepancies_employee ON skill_assessment_discrepancies(employee_id);
CREATE INDEX IF NOT EXISTS idx_discrepancies_flagged ON skill_assessment_discrepancies(flagged_for_discussion) WHERE flagged_for_discussion = true;

ALTER TABLE skill_assessment_discrepancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view team discrepancies"
  ON skill_assessment_discrepancies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles emp
      WHERE emp.id = skill_assessment_discrepancies.employee_id
      AND emp.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update team discrepancies"
  ON skill_assessment_discrepancies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles emp
      WHERE emp.id = skill_assessment_discrepancies.employee_id
      AND emp.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles emp
      WHERE emp.id = skill_assessment_discrepancies.employee_id
      AND emp.manager_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view own discrepancies"
  ON skill_assessment_discrepancies FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Admins can manage all discrepancies"
  ON skill_assessment_discrepancies FOR ALL
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

-- One to One Skill Discussions table
CREATE TABLE IF NOT EXISTS one_to_one_skill_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_review_id UUID NOT NULL REFERENCES one_to_one_monthly_reviews(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  discrepancy_id UUID REFERENCES skill_assessment_discrepancies(id) ON DELETE SET NULL,
  discussion_notes TEXT NOT NULL,
  manager_notes TEXT,
  coaching_actions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_discussions_review ON one_to_one_skill_discussions(monthly_review_id);
CREATE INDEX IF NOT EXISTS idx_skill_discussions_skill ON one_to_one_skill_discussions(skill_id);

ALTER TABLE one_to_one_skill_discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage skill discussions"
  ON one_to_one_skill_discussions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews r
      WHERE r.id = one_to_one_skill_discussions.monthly_review_id
      AND r.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews r
      WHERE r.id = one_to_one_skill_discussions.monthly_review_id
      AND r.manager_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view own skill discussions"
  ON one_to_one_skill_discussions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews r
      WHERE r.id = one_to_one_skill_discussions.monthly_review_id
      AND r.employee_id = auth.uid()
    )
  );

-- Skill Development Actions table
CREATE TABLE IF NOT EXISTS skill_development_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  discussion_id UUID REFERENCES one_to_one_skill_discussions(id) ON DELETE SET NULL,
  action_description TEXT NOT NULL,
  action_type TEXT DEFAULT 'training',
  target_date DATE,
  status TEXT DEFAULT 'open',
  completion_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_action_type CHECK (action_type IN ('training', 'mentoring', 'practice', 'project', 'other')),
  CONSTRAINT valid_action_status CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_dev_actions_employee ON skill_development_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_dev_actions_status ON skill_development_actions(status);
CREATE INDEX IF NOT EXISTS idx_dev_actions_skill ON skill_development_actions(skill_id);

ALTER TABLE skill_development_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own development actions"
  ON skill_development_actions FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can manage team development actions"
  ON skill_development_actions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles emp
      WHERE emp.id = skill_development_actions.employee_id
      AND emp.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles emp
      WHERE emp.id = skill_development_actions.employee_id
      AND emp.manager_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all development actions"
  ON skill_development_actions FOR ALL
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

-- Seed default skill types
INSERT INTO skill_types (name, description, icon, sort_order) VALUES
  ('Technical', 'Technical skills and software proficiency', '💻', 1),
  ('Soft Skills', 'Communication, leadership, and interpersonal skills', '🤝', 2),
  ('Product Knowledge', 'Domain and product-specific knowledge', '📚', 3)
ON CONFLICT (name) DO NOTHING;

-- Create view: Employee Skill Summary (simplified initial version)
CREATE OR REPLACE VIEW employee_skill_summary AS
SELECT
  esa.employee_id,
  esa.skill_id,
  s.name AS skill_name,
  st.name AS skill_type,
  st.icon AS skill_type_icon,
  rs.proficiency_level_required AS target_level,
  rs.is_mandatory,
  esa.self_rating AS latest_self_rating,
  msa.manager_rating AS latest_manager_rating,
  COALESCE(msa.manager_rating, esa.self_rating) AS current_rating,
  COALESCE(msa.completed_at, esa.completed_at) AS last_assessed_at,
  sac.status AS cycle_status,
  d.flagged_for_discussion AS has_discrepancy,
  d.ai_analysis AS discrepancy_analysis
FROM employee_skill_assessments esa
JOIN skills s ON s.id = esa.skill_id
JOIN profiles p ON p.id = esa.employee_id
JOIN skill_assessment_cycles sac ON sac.id = esa.cycle_id
LEFT JOIN manager_skill_assessments msa ON 
  msa.cycle_id = esa.cycle_id AND 
  msa.employee_id = esa.employee_id AND 
  msa.skill_id = esa.skill_id
LEFT JOIN role_skills rs ON 
  rs.skill_id = esa.skill_id AND
  rs.job_title = p.job_title AND
  rs.department = p.department
LEFT JOIN skill_types st ON st.id = rs.skill_type_id
LEFT JOIN skill_assessment_discrepancies d ON 
  d.cycle_id = esa.cycle_id AND 
  d.employee_id = esa.employee_id AND 
  d.skill_id = esa.skill_id;

-- Create view: Team Skill Metrics
CREATE OR REPLACE VIEW team_skill_metrics AS
SELECT
  p.manager_id,
  s.name AS skill_name,
  st.name AS skill_type,
  COUNT(DISTINCT ess.employee_id) AS total_employees_assessed,
  ROUND(AVG(ess.current_rating), 2) AS team_average_rating,
  ROUND(AVG(ess.target_level), 2) AS team_target_level,
  COUNT(*) FILTER (WHERE ess.has_discrepancy = true) AS total_discrepancies,
  COUNT(DISTINCT sda.id) FILTER (WHERE sda.status = 'open') AS outstanding_development_actions
FROM employee_skill_summary ess
JOIN profiles p ON p.id = ess.employee_id
JOIN skills s ON s.id = ess.skill_id
LEFT JOIN skill_types st ON st.name = ess.skill_type
LEFT JOIN skill_development_actions sda ON 
  sda.employee_id = ess.employee_id AND 
  sda.skill_id = ess.skill_id
WHERE p.manager_id IS NOT NULL
GROUP BY p.manager_id, s.name, st.name;
