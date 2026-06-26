/*
  # Moderation Workflow System

  ## Summary
  Creates a configurable moderation workflow that triggers when KPI or competency ratings
  are 4 or 5 (exceeding expectations). Supports multi-step approval chains with AI
  summarisation for approvers.

  ## New Tables

  ### moderation_workflow_configs
  - Admin-configurable workflow definitions with trigger conditions

  ### moderation_workflow_steps
  - Ordered steps with assigned roles for each workflow

  ### moderation_cases
  - Auto-created when rating meets trigger threshold
  - Tracks AI validation, manager justification, and approval status

  ### moderation_case_decisions
  - Records each approver's decision at each step

  ## Security
  - RLS on all tables
  - Managers create/view own cases; dept leads and leadership approve
*/

CREATE TABLE IF NOT EXISTS moderation_workflow_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  trigger_field text NOT NULL DEFAULT 'rating',
  trigger_operator text NOT NULL DEFAULT 'gte',
  trigger_value numeric NOT NULL DEFAULT 4,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moderation_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES moderation_workflow_configs(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  step_name text NOT NULL,
  assigned_role text NOT NULL,
  description text DEFAULT '',
  requires_justification boolean NOT NULL DEFAULT true,
  allow_rating_adjustment boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workflow_id, step_number)
);

CREATE TABLE IF NOT EXISTS moderation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES moderation_workflow_configs(id) ON DELETE RESTRICT,
  source_type text NOT NULL CHECK (source_type IN ('kpi_rating', 'competency_assessment')),
  source_id uuid NOT NULL,
  meeting_id uuid,
  employee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  original_rating numeric NOT NULL,
  current_rating numeric NOT NULL,
  manager_justification text DEFAULT '',
  ai_validation_status text NOT NULL DEFAULT 'pending' CHECK (ai_validation_status IN ('pending', 'validated', 'flagged', 'overridden')),
  ai_validation_notes text DEFAULT '',
  ai_summary text DEFAULT '',
  manager_override boolean NOT NULL DEFAULT false,
  manager_override_notes text DEFAULT '',
  current_step integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'adjusted')),
  final_rating numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moderation_case_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES moderation_cases(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  step_name text NOT NULL,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision text NOT NULL CHECK (decision IN ('approve', 'reject', 'adjust_rating', 'request_more_info')),
  notes text DEFAULT '',
  adjusted_rating numeric,
  decided_at timestamptz DEFAULT now()
);

ALTER TABLE moderation_workflow_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_case_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view workflow configs"
  ON moderation_workflow_configs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins insert workflow configs"
  ON moderation_workflow_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership'))
  );

CREATE POLICY "Admins update workflow configs"
  ON moderation_workflow_configs FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')));

CREATE POLICY "Admins delete workflow configs"
  ON moderation_workflow_configs FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')));

CREATE POLICY "All view workflow steps"
  ON moderation_workflow_steps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage workflow steps insert"
  ON moderation_workflow_steps FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')));

CREATE POLICY "Admins manage workflow steps update"
  ON moderation_workflow_steps FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')));

CREATE POLICY "Admins manage workflow steps delete"
  ON moderation_workflow_steps FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')));

CREATE POLICY "View own and approver moderation cases"
  ON moderation_cases FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR employee_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership', 'dept_lead', 'senior'))
  );

CREATE POLICY "Managers create moderation cases"
  ON moderation_cases FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Managers and approvers update moderation cases"
  ON moderation_cases FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership', 'dept_lead', 'senior'))
  )
  WITH CHECK (
    manager_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership', 'dept_lead', 'senior'))
  );

CREATE POLICY "View relevant moderation decisions"
  ON moderation_case_decisions FOR SELECT
  TO authenticated
  USING (
    decided_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM moderation_cases mc
      WHERE mc.id = case_id AND (mc.manager_id = auth.uid() OR mc.employee_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership', 'dept_lead', 'senior'))
  );

CREATE POLICY "Approvers insert decisions"
  ON moderation_case_decisions FOR INSERT
  TO authenticated
  WITH CHECK (decided_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_moderation_cases_manager_id ON moderation_cases(manager_id);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_employee_id ON moderation_cases(employee_id);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_status ON moderation_cases(status);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_workflow_id ON moderation_cases(workflow_id);
CREATE INDEX IF NOT EXISTS idx_moderation_workflow_steps_workflow_id ON moderation_workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_moderation_case_decisions_case_id ON moderation_case_decisions(case_id);

INSERT INTO moderation_workflow_configs (name, description, trigger_field, trigger_operator, trigger_value, is_active)
VALUES (
  'Default High Rating Workflow',
  'Standard two-step moderation for ratings of 4 or 5 (exceeding expectations)',
  'rating',
  'gte',
  4,
  true
)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  v_config_id uuid;
BEGIN
  SELECT id INTO v_config_id FROM moderation_workflow_configs WHERE name = 'Default High Rating Workflow' LIMIT 1;

  IF v_config_id IS NOT NULL THEN
    INSERT INTO moderation_workflow_steps (workflow_id, step_number, step_name, assigned_role, description, requires_justification, allow_rating_adjustment)
    VALUES
      (v_config_id, 1, 'Department Lead Review', 'dept_lead', 'Department Lead reviews the rating and justification, then approves or rejects', true, false),
      (v_config_id, 2, 'Executive Review', 'leadership', 'Executive reviews and can approve or adjust the final rating', true, true)
    ON CONFLICT (workflow_id, step_number) DO NOTHING;
  END IF;
END $$;
