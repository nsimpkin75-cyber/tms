/*
  # Extend Review and Strategy System for Comprehensive Workflow
  
  1. New Tables
    - `executive_strategies` - Top-level strategies
    - `strategy_focus_areas_v2` - Focus areas within strategies
    - `strategy_lead_assignments` - Assign strategy leads
    - `department_strategies` - Department-level strategies
    - `department_strategy_kpis` - KPIs for department strategies
    - `department_strategy_approvals` - Approval workflow
    - `review_template_kpis` - KPIs within review templates
    - `review_instances` - Individual review records per employee
    
  2. Extend Existing Tables
    - Add columns to review_templates
    - Add columns to review_kpi_ratings
    - Add columns to review_competency_ratings
    
  3. Features
    - Strategy lead workflow
    - Department strategy approval
    - Role-level template selection
    - KPI definitions (Underperforming, On Target, Above Target, Over Achieving)
    - Review instance management
*/

-- Executive Strategies
CREATE TABLE IF NOT EXISTS executive_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  creator_id uuid NOT NULL REFERENCES profiles(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Strategy Focus Areas v2
CREATE TABLE IF NOT EXISTS strategy_focus_areas_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid NOT NULL REFERENCES executive_strategies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Strategy Lead Assignments
CREATE TABLE IF NOT EXISTS strategy_lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_area_id uuid NOT NULL REFERENCES strategy_focus_areas_v2(id) ON DELETE CASCADE,
  strategy_lead_id uuid NOT NULL REFERENCES profiles(id),
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid NOT NULL REFERENCES profiles(id),
  UNIQUE(focus_area_id, strategy_lead_id)
);

-- Department Strategies
CREATE TABLE IF NOT EXISTS department_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_area_id uuid NOT NULL REFERENCES strategy_focus_areas_v2(id),
  creator_id uuid NOT NULL REFERENCES profiles(id),
  department_id uuid REFERENCES departments(id),
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'active', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Department Strategy KPIs
CREATE TABLE IF NOT EXISTS department_strategy_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_strategy_id uuid NOT NULL REFERENCES department_strategies(id) ON DELETE CASCADE,
  kpi_title text NOT NULL,
  kpi_target text,
  success_measure text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Department Strategy Approvals
CREATE TABLE IF NOT EXISTS department_strategy_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_strategy_id uuid NOT NULL REFERENCES department_strategies(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  feedback text,
  actioned_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Review Template KPIs (with definitions)
CREATE TABLE IF NOT EXISTS review_template_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES review_templates(id) ON DELETE CASCADE,
  kpi_title text NOT NULL,
  kpi_target text,
  underperforming_definition text,
  on_target_definition text,
  above_target_definition text,
  over_achieving_definition text,
  is_from_strategy boolean DEFAULT false,
  can_remove boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Review Instances (one per employee per cycle)
CREATE TABLE IF NOT EXISTS review_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id),
  manager_id uuid NOT NULL REFERENCES profiles(id),
  template_id uuid REFERENCES review_templates(id),
  template_type text NOT NULL CHECK (template_type IN ('strategy_linked', 'generic', 'probation')),
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due', 'in_progress', 'completed', 'overdue')),
  last_weekly_checkin_date date,
  total_weekly_checkins integer DEFAULT 0,
  last_monthly_review_date date,
  total_monthly_reviews integer DEFAULT 0,
  half_year_unlocked boolean DEFAULT false,
  half_year_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cycle_id, employee_id)
);

-- Extend review_templates table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_templates' AND column_name = 'department_strategy_id') THEN
    ALTER TABLE review_templates ADD COLUMN department_strategy_id uuid REFERENCES department_strategies(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_templates' AND column_name = 'role_level') THEN
    ALTER TABLE review_templates ADD COLUMN role_level text CHECK (role_level IN ('head_of', 'team_leader', 'agent', 'all'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_templates' AND column_name = 'department_id') THEN
    ALTER TABLE review_templates ADD COLUMN department_id uuid REFERENCES departments(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_templates' AND column_name = 'creator_id') THEN
    ALTER TABLE review_templates ADD COLUMN creator_id uuid REFERENCES profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_templates' AND column_name = 'weekly_checkin_enabled') THEN
    ALTER TABLE review_templates ADD COLUMN weekly_checkin_enabled boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_templates' AND column_name = 'monthly_review_enabled') THEN
    ALTER TABLE review_templates ADD COLUMN monthly_review_enabled boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_templates' AND column_name = 'half_year_review_enabled') THEN
    ALTER TABLE review_templates ADD COLUMN half_year_review_enabled boolean DEFAULT true;
  END IF;
END $$;

-- Extend review_kpi_ratings table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_kpi_ratings' AND column_name = 'review_instance_id') THEN
    ALTER TABLE review_kpi_ratings ADD COLUMN review_instance_id uuid REFERENCES review_instances(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_kpi_ratings' AND column_name = 'template_kpi_id') THEN
    ALTER TABLE review_kpi_ratings ADD COLUMN template_kpi_id uuid REFERENCES review_template_kpis(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_kpi_ratings' AND column_name = 'review_type') THEN
    ALTER TABLE review_kpi_ratings ADD COLUMN review_type text CHECK (review_type IN ('weekly', 'monthly', 'half_year'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_kpi_ratings' AND column_name = 'review_date') THEN
    ALTER TABLE review_kpi_ratings ADD COLUMN review_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_kpi_ratings' AND column_name = 'rolling_average') THEN
    ALTER TABLE review_kpi_ratings ADD COLUMN rolling_average numeric;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_kpi_ratings' AND column_name = 'recorded_by') THEN
    ALTER TABLE review_kpi_ratings ADD COLUMN recorded_by uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Extend review_competency_ratings table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_competency_ratings' AND column_name = 'review_instance_id') THEN
    ALTER TABLE review_competency_ratings ADD COLUMN review_instance_id uuid REFERENCES review_instances(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_competency_ratings' AND column_name = 'review_type') THEN
    ALTER TABLE review_competency_ratings ADD COLUMN review_type text CHECK (review_type IN ('monthly', 'half_year'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_competency_ratings' AND column_name = 'review_date') THEN
    ALTER TABLE review_competency_ratings ADD COLUMN review_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_competency_ratings' AND column_name = 'requires_moderation') THEN
    ALTER TABLE review_competency_ratings ADD COLUMN requires_moderation boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_competency_ratings' AND column_name = 'ai_coaching_suggestion') THEN
    ALTER TABLE review_competency_ratings ADD COLUMN ai_coaching_suggestion text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_competency_ratings' AND column_name = 'ai_learning_suggestion') THEN
    ALTER TABLE review_competency_ratings ADD COLUMN ai_learning_suggestion text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_competency_ratings' AND column_name = 'recorded_by') THEN
    ALTER TABLE review_competency_ratings ADD COLUMN recorded_by uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Extend review_summaries table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_summaries' AND column_name = 'review_instance_id') THEN
    ALTER TABLE review_summaries ADD COLUMN review_instance_id uuid REFERENCES review_instances(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_summaries' AND column_name = 'nine_box_position') THEN
    ALTER TABLE review_summaries ADD COLUMN nine_box_position text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_summaries' AND column_name = 'gap_analysis') THEN
    ALTER TABLE review_summaries ADD COLUMN gap_analysis text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_summaries' AND column_name = 'recommended_learning_path') THEN
    ALTER TABLE review_summaries ADD COLUMN recommended_learning_path jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_summaries' AND column_name = 'employee_self_assessment') THEN
    ALTER TABLE review_summaries ADD COLUMN employee_self_assessment jsonb;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_executive_strategies_creator ON executive_strategies(creator_id);
CREATE INDEX IF NOT EXISTS idx_executive_strategies_status ON executive_strategies(status);
CREATE INDEX IF NOT EXISTS idx_strategy_focus_areas_v2_strategy ON strategy_focus_areas_v2(strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_lead_assignments_lead ON strategy_lead_assignments(strategy_lead_id);
CREATE INDEX IF NOT EXISTS idx_strategy_lead_assignments_focus_area ON strategy_lead_assignments(focus_area_id);
CREATE INDEX IF NOT EXISTS idx_department_strategies_focus_area ON department_strategies(focus_area_id);
CREATE INDEX IF NOT EXISTS idx_department_strategies_creator ON department_strategies(creator_id);
CREATE INDEX IF NOT EXISTS idx_department_strategies_status ON department_strategies(status);
CREATE INDEX IF NOT EXISTS idx_department_strategy_kpis_dept_strategy ON department_strategy_kpis(department_strategy_id);
CREATE INDEX IF NOT EXISTS idx_department_strategy_approvals_dept_strategy ON department_strategy_approvals(department_strategy_id);
CREATE INDEX IF NOT EXISTS idx_review_templates_dept_strategy ON review_templates(department_strategy_id);
CREATE INDEX IF NOT EXISTS idx_review_templates_role_dept ON review_templates(role_level, department_id);
CREATE INDEX IF NOT EXISTS idx_review_template_kpis_template ON review_template_kpis(template_id);
CREATE INDEX IF NOT EXISTS idx_review_instances_cycle ON review_instances(cycle_id);
CREATE INDEX IF NOT EXISTS idx_review_instances_employee ON review_instances(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_instances_manager ON review_instances(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_instances_status ON review_instances(status);

-- Enable RLS
ALTER TABLE executive_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_focus_areas_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_strategy_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_strategy_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_template_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_instances ENABLE ROW LEVEL SECURITY;

-- RLS Policies

CREATE POLICY "Exec can create strategies" ON executive_strategies FOR INSERT TO authenticated WITH CHECK (is_leadership_or_admin(auth.uid()));
CREATE POLICY "Users can view active strategies" ON executive_strategies FOR SELECT TO authenticated USING (status IN ('active', 'completed') OR creator_id = auth.uid() OR is_leadership_or_admin(auth.uid()));
CREATE POLICY "Creators can update strategies" ON executive_strategies FOR UPDATE TO authenticated USING (creator_id = auth.uid() OR is_leadership_or_admin(auth.uid()));

CREATE POLICY "Users can view focus areas" ON strategy_focus_areas_v2 FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM executive_strategies WHERE id = strategy_id AND (status IN ('active', 'completed') OR creator_id = auth.uid() OR is_leadership_or_admin(auth.uid()))));
CREATE POLICY "Exec can manage focus areas" ON strategy_focus_areas_v2 FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM executive_strategies WHERE id = strategy_id AND (creator_id = auth.uid() OR is_leadership_or_admin(auth.uid()))));

CREATE POLICY "Users can view lead assignments" ON strategy_lead_assignments FOR SELECT TO authenticated USING (strategy_lead_id = auth.uid() OR is_leadership_or_admin(auth.uid()));
CREATE POLICY "Exec can manage lead assignments" ON strategy_lead_assignments FOR ALL TO authenticated USING (is_leadership_or_admin(auth.uid()));

CREATE POLICY "Leads can create dept strategies" ON department_strategies FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM strategy_lead_assignments WHERE focus_area_id = department_strategies.focus_area_id AND strategy_lead_id = auth.uid()));
CREATE POLICY "Users can view dept strategies" ON department_strategies FOR SELECT TO authenticated USING (creator_id = auth.uid() OR is_leadership_or_admin(auth.uid()));
CREATE POLICY "Creators can update dept strategies" ON department_strategies FOR UPDATE TO authenticated USING (creator_id = auth.uid() OR is_leadership_or_admin(auth.uid()));

CREATE POLICY "Users can view dept KPIs" ON department_strategy_kpis FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM department_strategies WHERE id = department_strategy_id AND (creator_id = auth.uid() OR is_leadership_or_admin(auth.uid()))));
CREATE POLICY "Creators can manage dept KPIs" ON department_strategy_kpis FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM department_strategies WHERE id = department_strategy_id AND creator_id = auth.uid()));

CREATE POLICY "Users can view approvals" ON department_strategy_approvals FOR SELECT TO authenticated USING (approver_id = auth.uid() OR EXISTS (SELECT 1 FROM department_strategies WHERE id = department_strategy_id AND creator_id = auth.uid()));
CREATE POLICY "Approvers can manage approvals" ON department_strategy_approvals FOR ALL TO authenticated USING (approver_id = auth.uid());

CREATE POLICY "Users can view template KPIs" ON review_template_kpis FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM review_templates WHERE id = template_id));
CREATE POLICY "Creators can manage template KPIs" ON review_template_kpis FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM review_templates WHERE id = template_id AND creator_id = auth.uid()));

CREATE POLICY "Users can view review instances" ON review_instances FOR SELECT TO authenticated USING (employee_id = auth.uid() OR manager_id = auth.uid() OR is_leadership_or_admin(auth.uid()));
CREATE POLICY "Managers can create review instances" ON review_instances FOR INSERT TO authenticated WITH CHECK (manager_id = auth.uid());
CREATE POLICY "Managers can update review instances" ON review_instances FOR UPDATE TO authenticated USING (manager_id = auth.uid() OR is_leadership_or_admin(auth.uid()));

-- Helper Functions

-- Function to get applicable template for a role
CREATE OR REPLACE FUNCTION get_applicable_review_template(
  p_department_id uuid,
  p_role_level text
)
RETURNS TABLE (
  template_id uuid,
  template_name text,
  template_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check for strategy-linked template first
  RETURN QUERY
  SELECT rt.id, rt.name, rt.template_type
  FROM review_templates rt
  WHERE rt.is_active = true
  AND rt.department_id = p_department_id
  AND rt.role_level = p_role_level
  AND rt.template_type = 'strategy_linked'
  LIMIT 1;
  
  -- If not found, return generic template signal
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT NULL::uuid, 'Generic One to One'::text, 'generic'::text;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_applicable_review_template(uuid, text) TO authenticated;

-- Trigger to auto-generate review instances
CREATE OR REPLACE FUNCTION auto_generate_review_instances_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle RECORD;
  v_employee RECORD;
  v_template RECORD;
BEGIN
  SELECT * INTO v_cycle FROM review_cycles WHERE id = NEW.cycle_id;
  SELECT * INTO v_employee FROM profiles WHERE id = NEW.employee_id;
  
  SELECT * INTO v_template
  FROM get_applicable_review_template(v_employee.department_id, 'all')
  LIMIT 1;
  
  INSERT INTO review_instances (
    cycle_id, employee_id, manager_id, template_id, template_type, status
  ) VALUES (
    NEW.cycle_id, NEW.employee_id, v_cycle.manager_id,
    v_template.template_id, v_template.template_type, 'upcoming'
  )
  ON CONFLICT (cycle_id, employee_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_cycle_member_added_v2 ON review_cycle_members;
CREATE TRIGGER on_cycle_member_added_v2
  AFTER INSERT ON review_cycle_members
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION auto_generate_review_instances_v2();

-- Trigger to unlock half-year review
CREATE OR REPLACE FUNCTION check_half_year_unlock_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.total_monthly_reviews >= 6 AND NOT NEW.half_year_unlocked THEN
    NEW.half_year_unlocked := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_instance_update_v2 ON review_instances;
CREATE TRIGGER on_review_instance_update_v2
  BEFORE UPDATE ON review_instances
  FOR EACH ROW
  EXECUTE FUNCTION check_half_year_unlock_v2();
