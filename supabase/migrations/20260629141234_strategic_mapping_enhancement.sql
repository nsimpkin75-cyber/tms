
-- Extend existing strategies table with new fields
ALTER TABLE strategies
  ADD COLUMN IF NOT EXISTS strategic_theme TEXT,
  ADD COLUMN IF NOT EXISTS success_measures TEXT,
  ADD COLUMN IF NOT EXISTS supporting_notes TEXT,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS target_date DATE;

-- Strategy department assignments
CREATE TABLE IF NOT EXISTS strategy_department_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  department_name TEXT NOT NULL,
  strategic_lead_id UUID REFERENCES profiles(id),
  assigned_by_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE strategy_department_assignments ENABLE ROW LEVEL SECURITY;

-- Department Strategic Plans
CREATE TABLE IF NOT EXISTS department_strategic_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES strategy_department_assignments(id),
  department_name TEXT NOT NULL,
  strategic_lead_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  overview TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','in_review','amendments_requested','resubmitted','approved','active')),
  version INTEGER NOT NULL DEFAULT 1,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE department_strategic_plans ENABLE ROW LEVEL SECURITY;

-- Dept Plan Objectives
CREATE TABLE IF NOT EXISTS dept_plan_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES department_strategic_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE dept_plan_objectives ENABLE ROW LEVEL SECURITY;

-- Dept Plan Actions
CREATE TABLE IF NOT EXISTS dept_plan_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES department_strategic_plans(id) ON DELETE CASCADE,
  objective_id UUID REFERENCES dept_plan_objectives(id),
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES profiles(id),
  due_date DATE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','blocked')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE dept_plan_actions ENABLE ROW LEVEL SECURITY;

-- Dept Plan KPIs
CREATE TABLE IF NOT EXISTS dept_plan_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES department_strategic_plans(id) ON DELETE CASCADE,
  objective_id UUID REFERENCES dept_plan_objectives(id),
  title TEXT NOT NULL,
  description TEXT,
  target_value TEXT,
  measurement_unit TEXT,
  frequency TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE dept_plan_kpis ENABLE ROW LEVEL SECURITY;

-- Dept Plan Projects
CREATE TABLE IF NOT EXISTS dept_plan_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES department_strategic_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES profiles(id),
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','on_hold')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE dept_plan_projects ENABLE ROW LEVEL SECURITY;

-- Dept Plan Milestones
CREATE TABLE IF NOT EXISTS dept_plan_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES department_strategic_plans(id) ON DELETE CASCADE,
  project_id UUID REFERENCES dept_plan_projects(id),
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','blocked')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE dept_plan_milestones ENABLE ROW LEVEL SECURITY;

-- Dept Plan Risks
CREATE TABLE IF NOT EXISTS dept_plan_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES department_strategic_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  likelihood TEXT CHECK (likelihood IN ('low','medium','high')),
  impact TEXT CHECK (impact IN ('low','medium','high')),
  mitigation TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','mitigated','closed')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE dept_plan_risks ENABLE ROW LEVEL SECURITY;

-- Dept Plan Resource Requirements
CREATE TABLE IF NOT EXISTS dept_plan_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES department_strategic_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT CHECK (resource_type IN ('headcount','budget','technology','training','other')),
  quantity TEXT,
  estimated_cost TEXT,
  required_by DATE,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','in_progress')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE dept_plan_resources ENABLE ROW LEVEL SECURITY;

-- Dept Plan Success Measures
CREATE TABLE IF NOT EXISTS dept_plan_success_measures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES department_strategic_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_value TEXT,
  measurement_unit TEXT,
  review_frequency TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE dept_plan_success_measures ENABLE ROW LEVEL SECURITY;

-- Item assignments (objectives/KPIs → roles/employees)
CREATE TABLE IF NOT EXISTS dept_plan_item_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES department_strategic_plans(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('objective','kpi')),
  item_id UUID NOT NULL,
  assignee_type TEXT NOT NULL CHECK (assignee_type IN ('role','employee')),
  role TEXT,
  employee_id UUID REFERENCES profiles(id),
  assigned_by_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE dept_plan_item_assignments ENABLE ROW LEVEL SECURITY;

-- Strategy Collaboration (threaded comments/questions/feedback)
CREATE TABLE IF NOT EXISTS strategy_collaboration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES department_strategic_plans(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  comment_type TEXT NOT NULL DEFAULT 'comment'
    CHECK (comment_type IN ('comment','question','amendment_request','concern','response')),
  content TEXT NOT NULL,
  parent_id UUID REFERENCES strategy_collaboration(id),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE strategy_collaboration ENABLE ROW LEVEL SECURITY;

-- Strategy Audit Log
CREATE TABLE IF NOT EXISTS strategy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES department_strategic_plans(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES profiles(id),
  old_status TEXT,
  new_status TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE strategy_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS: strategy_department_assignments
CREATE POLICY "sda_select" ON strategy_department_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "sda_insert" ON strategy_department_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','leadership')));
CREATE POLICY "sda_update" ON strategy_department_assignments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','leadership')));
CREATE POLICY "sda_delete" ON strategy_department_assignments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','leadership')));

-- RLS: department_strategic_plans
CREATE POLICY "dsp_select" ON department_strategic_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "dsp_insert" ON department_strategic_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = strategic_lead_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','leadership')));
CREATE POLICY "dsp_update" ON department_strategic_plans FOR UPDATE TO authenticated
  USING (auth.uid() = strategic_lead_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','leadership')));
CREATE POLICY "dsp_delete" ON department_strategic_plans FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS for all plan detail tables (open to all authenticated for team collaboration)
CREATE POLICY "dpo_select" ON dept_plan_objectives FOR SELECT TO authenticated USING (true);
CREATE POLICY "dpo_insert" ON dept_plan_objectives FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dpo_update" ON dept_plan_objectives FOR UPDATE TO authenticated USING (true);
CREATE POLICY "dpo_delete" ON dept_plan_objectives FOR DELETE TO authenticated USING (true);

CREATE POLICY "dpa_select" ON dept_plan_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "dpa_insert" ON dept_plan_actions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dpa_update" ON dept_plan_actions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "dpa_delete" ON dept_plan_actions FOR DELETE TO authenticated USING (true);

CREATE POLICY "dpk_select" ON dept_plan_kpis FOR SELECT TO authenticated USING (true);
CREATE POLICY "dpk_insert" ON dept_plan_kpis FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dpk_update" ON dept_plan_kpis FOR UPDATE TO authenticated USING (true);
CREATE POLICY "dpk_delete" ON dept_plan_kpis FOR DELETE TO authenticated USING (true);

CREATE POLICY "dppr_select" ON dept_plan_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "dppr_insert" ON dept_plan_projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dppr_update" ON dept_plan_projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "dppr_delete" ON dept_plan_projects FOR DELETE TO authenticated USING (true);

CREATE POLICY "dpm_select" ON dept_plan_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "dpm_insert" ON dept_plan_milestones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dpm_update" ON dept_plan_milestones FOR UPDATE TO authenticated USING (true);
CREATE POLICY "dpm_delete" ON dept_plan_milestones FOR DELETE TO authenticated USING (true);

CREATE POLICY "dpr_select" ON dept_plan_risks FOR SELECT TO authenticated USING (true);
CREATE POLICY "dpr_insert" ON dept_plan_risks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dpr_update" ON dept_plan_risks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "dpr_delete" ON dept_plan_risks FOR DELETE TO authenticated USING (true);

CREATE POLICY "dpres_select" ON dept_plan_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "dpres_insert" ON dept_plan_resources FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dpres_update" ON dept_plan_resources FOR UPDATE TO authenticated USING (true);
CREATE POLICY "dpres_delete" ON dept_plan_resources FOR DELETE TO authenticated USING (true);

CREATE POLICY "dpsm_select" ON dept_plan_success_measures FOR SELECT TO authenticated USING (true);
CREATE POLICY "dpsm_insert" ON dept_plan_success_measures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dpsm_update" ON dept_plan_success_measures FOR UPDATE TO authenticated USING (true);
CREATE POLICY "dpsm_delete" ON dept_plan_success_measures FOR DELETE TO authenticated USING (true);

CREATE POLICY "dpia_select" ON dept_plan_item_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "dpia_insert" ON dept_plan_item_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dpia_update" ON dept_plan_item_assignments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "dpia_delete" ON dept_plan_item_assignments FOR DELETE TO authenticated USING (true);

-- RLS: strategy_collaboration
CREATE POLICY "sc_select" ON strategy_collaboration FOR SELECT TO authenticated USING (true);
CREATE POLICY "sc_insert" ON strategy_collaboration FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "sc_update" ON strategy_collaboration FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "sc_delete" ON strategy_collaboration FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS: strategy_audit_log
CREATE POLICY "sal_select" ON strategy_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "sal_insert" ON strategy_audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);
