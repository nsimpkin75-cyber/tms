/*
  # Career Plans and Approval System

  1. New Tables
    - career_plans: Stores career development plans with quiz results and approval status
    - career_plan_milestones: Breakdown of steps needed to achieve career goals

  2. Changes
    - Creates comprehensive career planning system
    - Enables manager and admin approval workflow
    - Stores AI quiz results and recommendations

  3. Security
    - Enable RLS on all tables
    - Users can view and create their own plans
    - Managers can view their team plans
    - Admins can view all plans and approve
*/

-- Create career plans table
CREATE TABLE IF NOT EXISTS career_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_job_family_id uuid REFERENCES job_families(id),
  target_job_family_id uuid REFERENCES job_families(id),
  target_level text,
  quiz_data jsonb DEFAULT '{}'::jsonb,
  recommended_timeline_months integer DEFAULT 12,
  skills_gaps jsonb DEFAULT '[]'::jsonb,
  recommended_training jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent_to_manager', 'manager_approved', 'admin_approved', 'rejected')),
  sent_to_manager_at timestamptz,
  manager_reviewed_at timestamptz,
  manager_comments text,
  admin_reviewed_at timestamptz,
  admin_comments text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE career_plans ENABLE ROW LEVEL SECURITY;

-- Create career plan milestones table
CREATE TABLE IF NOT EXISTS career_plan_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_plan_id uuid REFERENCES career_plans(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  estimated_completion_months integer DEFAULT 1,
  required_skills jsonb DEFAULT '[]'::jsonb,
  required_training jsonb DEFAULT '[]'::jsonb,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE career_plan_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for career_plans

-- Users can view their own plans
CREATE POLICY "Users can view own career plans"
  ON career_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Managers can view their team's plans
CREATE POLICY "Managers can view team career plans"
  ON career_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_plans.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Admins can view all plans
CREATE POLICY "Admins can view all career plans"
  ON career_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can create their own plans
CREATE POLICY "Users can create own career plans"
  ON career_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own draft plans
CREATE POLICY "Users can update own draft career plans"
  ON career_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'draft')
  WITH CHECK (auth.uid() = user_id);

-- Users can send plans to manager
CREATE POLICY "Users can send plans to manager"
  ON career_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status IN ('draft', 'sent_to_manager'));

-- Managers can approve team plans
CREATE POLICY "Managers can approve team career plans"
  ON career_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_plans.user_id
      AND profiles.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_plans.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Admins can update any plan
CREATE POLICY "Admins can update any career plan"
  ON career_plans FOR UPDATE
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

-- Users can delete their own draft plans
CREATE POLICY "Users can delete own draft career plans"
  ON career_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'draft');

-- RLS Policies for career_plan_milestones

-- Users can view milestones for their plans
CREATE POLICY "Users can view own plan milestones"
  ON career_plan_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans
      WHERE career_plans.id = career_plan_milestones.career_plan_id
      AND career_plans.user_id = auth.uid()
    )
  );

-- Managers can view team plan milestones
CREATE POLICY "Managers can view team plan milestones"
  ON career_plan_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans
      JOIN profiles ON profiles.id = career_plans.user_id
      WHERE career_plans.id = career_plan_milestones.career_plan_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Admins can view all milestones
CREATE POLICY "Admins can view all plan milestones"
  ON career_plan_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can create milestones for their own plans
CREATE POLICY "Users can create own plan milestones"
  ON career_plan_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM career_plans
      WHERE career_plans.id = career_plan_milestones.career_plan_id
      AND career_plans.user_id = auth.uid()
      AND career_plans.status = 'draft'
    )
  );

-- Users can update milestones for their draft plans
CREATE POLICY "Users can update own plan milestones"
  ON career_plan_milestones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans
      WHERE career_plans.id = career_plan_milestones.career_plan_id
      AND career_plans.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM career_plans
      WHERE career_plans.id = career_plan_milestones.career_plan_id
      AND career_plans.user_id = auth.uid()
    )
  );

-- Users can delete milestones from draft plans
CREATE POLICY "Users can delete own plan milestones"
  ON career_plan_milestones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans
      WHERE career_plans.id = career_plan_milestones.career_plan_id
      AND career_plans.user_id = auth.uid()
      AND career_plans.status = 'draft'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_career_plans_user_id ON career_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_status ON career_plans(status);
CREATE INDEX IF NOT EXISTS idx_career_plans_target_job_family ON career_plans(target_job_family_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_milestones_plan_id ON career_plan_milestones(career_plan_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_milestones_sort ON career_plan_milestones(career_plan_id, sort_order);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_career_plan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_career_plans_updated_at ON career_plans;
CREATE TRIGGER update_career_plans_updated_at
  BEFORE UPDATE ON career_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_career_plan_updated_at();

-- Create view for pending approvals
CREATE OR REPLACE VIEW pending_career_approvals AS
SELECT 
  cp.id,
  cp.user_id,
  p.full_name as employee_name,
  p.email as employee_email,
  p.manager_id,
  m.full_name as manager_name,
  cp.status,
  cp.sent_to_manager_at,
  cp.manager_reviewed_at,
  cp.created_at,
  current_jf.title as current_role,
  target_jf.title as target_role,
  cp.recommended_timeline_months
FROM career_plans cp
JOIN profiles p ON p.id = cp.user_id
LEFT JOIN profiles m ON m.id = p.manager_id
LEFT JOIN job_families current_jf ON current_jf.id = cp.current_job_family_id
LEFT JOIN job_families target_jf ON target_jf.id = cp.target_job_family_id
WHERE cp.status IN ('sent_to_manager', 'manager_approved')
ORDER BY cp.sent_to_manager_at DESC;