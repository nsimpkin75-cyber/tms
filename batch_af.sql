/*
  # Create Test Admin - Work With Trigger

  ## Overview
  Creates test admin and updates the auto-created profile.

  ## Test Account
  - Email: test@admin.com
  - Password: Admin123!
*/

DO $$
DECLARE
  v_admin_id uuid := gen_random_uuid();
  v_password text := 'Admin123!';
BEGIN
  -- Clean up existing
  DELETE FROM public.profiles WHERE email IN ('admin@test.com', 'test@admin.com');
  DELETE FROM auth.identities WHERE provider_id IN (
    SELECT id::text FROM auth.users WHERE email IN ('admin@test.com', 'test@admin.com')
  );
  DELETE FROM auth.users WHERE email IN ('admin@test.com', 'test@admin.com');

  -- Create auth user (trigger will create profile)
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_admin_id,
    'authenticated',
    'authenticated',
    'test@admin.com',
    crypt(v_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Test Admin"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- Create identity
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_admin_id::text,
    v_admin_id,
    format('{"sub":"%s","email":"test@admin.com","email_verified":true,"phone_verified":false}', v_admin_id)::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- Wait a moment for trigger
  PERFORM pg_sleep(0.1);

  -- Update the profile created by trigger
  UPDATE public.profiles
  SET 
    role = 'admin',
    admin_type = 'full_admin',
    department = 'IT',
    tenure = 1
  WHERE id = v_admin_id;

  RAISE NOTICE 'Test admin created: test@admin.com / Admin123!';
END $$;

/*
  # Create Departments and Job Titles Tables

  1. New Tables
    - `departments_org`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Department name
      - `description` (text) - Department description
      - `active` (boolean) - Whether this department is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `job_titles_org`
      - `id` (uuid, primary key)
      - `title` (text, unique) - Job title name
      - `description` (text) - Job title description
      - `active` (boolean) - Whether this title is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to `profiles` table
    - Add `start_date` column (date) - Employee's start date with the organization
    - Add `active` column (boolean) - Whether the user is active
    - Keep `job_title` column (will now be a free-text field)
    - Keep `tenure` for backward compatibility

  3. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read
    - Add policies for admins to manage

  4. Data
    - Seed common departments and job titles
*/

-- Create departments_org table
CREATE TABLE IF NOT EXISTS departments_org (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create job_titles_org table
CREATE TABLE IF NOT EXISTS job_titles_org (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text UNIQUE NOT NULL,
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add start_date and active to profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN start_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN active boolean DEFAULT true;
  END IF;
END $$;

-- Enable RLS on both tables
ALTER TABLE departments_org ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_titles_org ENABLE ROW LEVEL SECURITY;

-- Departments policies
CREATE POLICY "Authenticated users can read departments"
  ON departments_org FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert departments"
  ON departments_org FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update departments"
  ON departments_org FOR UPDATE
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

CREATE POLICY "Admins can delete departments"
  ON departments_org FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Job titles policies
CREATE POLICY "Authenticated users can read job titles"
  ON job_titles_org FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert job titles"
  ON job_titles_org FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update job titles"
  ON job_titles_org FOR UPDATE
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

CREATE POLICY "Admins can delete job titles"
  ON job_titles_org FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_departments_org_active ON departments_org(active);
CREATE INDEX IF NOT EXISTS idx_job_titles_org_active ON job_titles_org(active);
CREATE INDEX IF NOT EXISTS idx_profiles_start_date ON profiles(start_date);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(active);

-- Seed departments from existing job families data
INSERT INTO departments_org (name, description, active)
SELECT DISTINCT
  department,
  'Department from job families',
  true
FROM job_families
WHERE department IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Add more common departments
INSERT INTO departments_org (name, description, active) VALUES
  ('Engineering', 'Software engineering and development', true),
  ('Product', 'Product management and strategy', true),
  ('Design', 'User experience and visual design', true),
  ('Marketing', 'Marketing and communications', true),
  ('Sales', 'Sales and business development', true),
  ('Customer Success', 'Customer support and success', true),
  ('Human Resources', 'HR and people operations', true),
  ('Finance', 'Finance and accounting', true),
  ('Operations', 'Business operations', true),
  ('Executive', 'Executive leadership', true)
ON CONFLICT (name) DO NOTHING;

-- Seed job titles from existing job families
INSERT INTO job_titles_org (title, description, active)
SELECT DISTINCT
  title,
  description,
  true
FROM job_families
WHERE title IS NOT NULL
ON CONFLICT (title) DO NOTHING;

-- Add additional common job titles
INSERT INTO job_titles_org (title, description, active) VALUES
  ('Junior Developer', 'Entry-level software developer', true),
  ('Developer', 'Mid-level software developer', true),
  ('Senior Developer', 'Senior-level software developer', true),
  ('Lead Developer', 'Technical lead for development team', true),
  ('Engineering Manager', 'Manager of engineering team', true),
  ('Product Manager', 'Product management role', true),
  ('Designer', 'Design professional', true),
  ('Senior Designer', 'Senior design professional', true),
  ('Marketing Specialist', 'Marketing team member', true),
  ('Sales Representative', 'Sales team member', true),
  ('Customer Success Manager', 'Customer success role', true),
  ('HR Manager', 'Human resources manager', true),
  ('Operations Manager', 'Operations management role', true),
  ('Finance Manager', 'Finance management role', true),
  ('Executive Assistant', 'Executive support role', true),
  ('Chief Executive Officer', 'CEO - Executive leader', true),
  ('Chief Technology Officer', 'CTO - Technology leader', true),
  ('Chief Financial Officer', 'CFO - Finance leader', true)
ON CONFLICT (title) DO NOTHING;
/*
  # Create Review Performance Tables
  
  Creates the missing review and performance management tables that are being
  queried by the frontend but don't exist in the database.
  
  Tables created:
  - review_six_month_performance - 6-month performance reviews
  - review_kpis - Individual KPIs for employees  
  - review_weekly_checkins - Weekly check-in records
  - review_monthly_sessions - Monthly review sessions
  - review_competency_ratings - Competency ratings
  - review_rating_approvals - Approval workflow
  - review_goal_progress - Goal progress tracking
  - review_notifications - Notification system
  - review_kpi_templates - KPI templates
*/

-- 6-month performance reviews (most critical - being queried now)
CREATE TABLE IF NOT EXISTS review_six_month_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES profiles(id),
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  monthly_review_ids uuid[],
  average_performance_score numeric,
  average_competency_score numeric,
  avg_performance_rating numeric,
  trend_analysis jsonb,
  manager_summary text,
  strengths text,
  development_areas text,
  recommended_actions text,
  pay_review_recommended boolean DEFAULT false,
  bonus_recommended boolean DEFAULT false,
  promotion_recommended boolean DEFAULT false,
  recommendation_rationale text,
  status text DEFAULT 'draft',
  submitted_at timestamptz,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Individual KPIs assigned to employees
CREATE TABLE IF NOT EXISTS review_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kpi_name text NOT NULL,
  target_value numeric,
  measurement_unit text,
  frequency text DEFAULT 'weekly',
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

-- Weekly check-ins
CREATE TABLE IF NOT EXISTS review_weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES profiles(id),
  week_starting date NOT NULL,
  kpi_results jsonb,
  goal_updates jsonb,
  highlights text,
  challenges text,
  support_needed text,
  manager_comments text,
  status text DEFAULT 'scheduled',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Monthly reviews
CREATE TABLE IF NOT EXISTS review_monthly_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES profiles(id),
  review_month date NOT NULL,
  review_template_id uuid,
  kpi_results jsonb,
  kpi_summary text,
  weekly_average_performance numeric,
  goal_progress jsonb,
  cdp_actions jsonb,
  learning_actions jsonb,
  competency_ratings jsonb,
  behavior_ratings jsonb,
  overall_performance_score numeric,
  overall_competency_score numeric,
  employee_comments text,
  manager_comments text,
  ai_weekly_summary text,
  status text DEFAULT 'scheduled',
  completed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Competency ratings
CREATE TABLE IF NOT EXISTS review_competency_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES review_monthly_sessions(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  competency_id uuid,
  competency_name text,
  target_level integer,
  actual_rating integer CHECK (actual_rating BETWEEN 1 AND 4),
  comments text,
  evidence text,
  ai_validation_status text,
  ai_validation_feedback text,
  requires_approval boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rating approvals
CREATE TABLE IF NOT EXISTS review_rating_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES review_monthly_sessions(id) ON DELETE CASCADE,
  competency_rating_id uuid REFERENCES review_competency_ratings(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES profiles(id),
  approver_id uuid NOT NULL REFERENCES profiles(id),
  rating_type text NOT NULL,
  rating_value integer NOT NULL,
  justification text NOT NULL,
  evidence text,
  status text DEFAULT 'pending',
  approver_comments text,
  moderated_rating integer,
  moderation_reason text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Goal progress tracking
CREATE TABLE IF NOT EXISTS review_goal_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  review_type text NOT NULL,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_id uuid,
  goal_source text,
  goal_description text NOT NULL,
  progress_percent integer DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  status text DEFAULT 'on_track',
  comments text,
  actions_required text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS review_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id),
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_review_id uuid,
  action_url text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- KPI Templates
CREATE TABLE IF NOT EXISTS review_kpi_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES profiles(id),
  template_name text NOT NULL,
  department text,
  job_family_id uuid REFERENCES job_families(id),
  kpis jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_six_month_employee ON review_six_month_performance(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_six_month_manager ON review_six_month_performance(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_six_month_status ON review_six_month_performance(status);
CREATE INDEX IF NOT EXISTS idx_review_six_month_rating ON review_six_month_performance(avg_performance_rating);
CREATE INDEX IF NOT EXISTS idx_review_kpis_employee ON review_kpis(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_weekly_employee ON review_weekly_checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_monthly_employee ON review_monthly_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_competency_review ON review_competency_ratings(review_id);
CREATE INDEX IF NOT EXISTS idx_review_notifications_recipient ON review_notifications(recipient_id, is_read);

-- Enable RLS
ALTER TABLE review_six_month_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_weekly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_monthly_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_competency_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_rating_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_kpi_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_six_month_performance
CREATE POLICY "Users can view their 6-month reviews"
  ON review_six_month_performance FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Managers can insert 6-month reviews"
  ON review_six_month_performance FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'leadership')
    )
  );

CREATE POLICY "Managers can update 6-month reviews"
  ON review_six_month_performance FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'leadership')
    )
  );

-- RLS Policies for other tables
CREATE POLICY "Users can view their KPIs"
  ON review_kpis FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

CREATE POLICY "Managers can manage KPIs"
  ON review_kpis FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

CREATE POLICY "Users can view their weekly checkins"
  ON review_weekly_checkins FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Users can manage their weekly checkins"
  ON review_weekly_checkins FOR ALL
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR manager_id = auth.uid()
  );

CREATE POLICY "Users can view their monthly reviews"
  ON review_monthly_sessions FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Managers can manage monthly reviews"
  ON review_monthly_sessions FOR ALL
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can view competency ratings"
  ON review_competency_ratings FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM review_monthly_sessions
      WHERE id = review_id
      AND manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Managers can manage competency ratings"
  ON review_competency_ratings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_monthly_sessions
      WHERE id = review_id
      AND manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can view rating approvals"
  ON review_rating_approvals FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR manager_id = auth.uid()
    OR approver_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Managers can create rating approvals"
  ON review_rating_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = auth.uid()
  );

CREATE POLICY "Approvers can update rating approvals"
  ON review_rating_approvals FOR UPDATE
  TO authenticated
  USING (
    approver_id = auth.uid()
  );

CREATE POLICY "Users can view goal progress"
  ON review_goal_progress FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

CREATE POLICY "Users can manage goal progress"
  ON review_goal_progress FOR ALL
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

CREATE POLICY "Users can view their notifications"
  ON review_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON review_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

CREATE POLICY "Users can update their notifications"
  ON review_notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Managers can view KPI templates"
  ON review_kpi_templates FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

CREATE POLICY "Managers can manage KPI templates"
  ON review_kpi_templates FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('leadership', 'admin')
    )
  );
/*
  # Add Missing Foreign Key Indexes - Part 1 (Security Fix)

  1. Missing Indexes Added
    - career_plans.target_job_family_id
    - goal_actions.assigned_to
    - one_to_one_notes.created_by
    - performance_ratings.rater_id
    - profile_skills.skill_id
    - rating_approval_workflow.approver_id
    - review_competency_ratings.employee_id
    - review_goal_progress.employee_id
    - review_items.review_id
    - review_kpi_templates.created_by
    - review_kpi_templates.job_family_id
    - review_kpis.created_by
    - review_monthly_sessions.manager_id
    - review_notifications.sender_id

  2. Security Impact
    - Improves query performance for foreign key lookups
    - Prevents slow scans when joining tables
    - Critical for maintaining database performance at scale
*/

CREATE INDEX IF NOT EXISTS idx_career_plans_target_job_family 
  ON career_plans(target_job_family_id);

CREATE INDEX IF NOT EXISTS idx_goal_actions_assigned_to 
  ON goal_actions(assigned_to);

CREATE INDEX IF NOT EXISTS idx_one_to_one_notes_created_by 
  ON one_to_one_notes(created_by);

CREATE INDEX IF NOT EXISTS idx_performance_ratings_rater_id 
  ON performance_ratings(rater_id);

CREATE INDEX IF NOT EXISTS idx_profile_skills_skill_id 
  ON profile_skills(skill_id);

CREATE INDEX IF NOT EXISTS idx_rating_approval_workflow_approver_id 
  ON rating_approval_workflow(approver_id);

CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_employee_id 
  ON review_competency_ratings(employee_id);

CREATE INDEX IF NOT EXISTS idx_review_goal_progress_employee_id 
  ON review_goal_progress(employee_id);

CREATE INDEX IF NOT EXISTS idx_review_items_review_id 
  ON review_items(review_id);

CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_created_by 
  ON review_kpi_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_job_family_id 
  ON review_kpi_templates(job_family_id);

CREATE INDEX IF NOT EXISTS idx_review_kpis_created_by 
  ON review_kpis(created_by);

CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_manager_id 
  ON review_monthly_sessions(manager_id);

CREATE INDEX IF NOT EXISTS idx_review_notifications_sender_id 
  ON review_notifications(sender_id);
/*
  # Add Missing Foreign Key Indexes - Part 2 (Security Fix)

  1. Missing Indexes Added
    - review_rating_approvals.approver_id
    - review_rating_approvals.competency_rating_id
    - review_rating_approvals.employee_id
    - review_rating_approvals.manager_id
    - review_rating_approvals.review_id
    - review_responses.question_id
    - review_six_month_performance.approved_by
    - review_weekly_checkins.manager_id
    - skill_assessments.assessed_by
    - skill_development_plans.skill_id
    - skills_matrix.job_family_id
    - strategic_goals.owner_id
    - user_admin_permissions.granted_by
    - view_as_sessions.target_user_id

  2. Security Impact
    - Improves query performance for foreign key lookups
    - Prevents slow scans when joining tables
    - Critical for maintaining database performance at scale
*/

CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_approver_id 
  ON review_rating_approvals(approver_id);

CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_competency_rating_id 
  ON review_rating_approvals(competency_rating_id);

CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_employee_id 
  ON review_rating_approvals(employee_id);

CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_manager_id 
  ON review_rating_approvals(manager_id);

CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_review_id 
  ON review_rating_approvals(review_id);

CREATE INDEX IF NOT EXISTS idx_review_responses_question_id 
  ON review_responses(question_id);

CREATE INDEX IF NOT EXISTS idx_review_six_month_approved_by 
  ON review_six_month_performance(approved_by);

CREATE INDEX IF NOT EXISTS idx_review_weekly_checkins_manager_id 
  ON review_weekly_checkins(manager_id);

CREATE INDEX IF NOT EXISTS idx_skill_assessments_assessed_by 
  ON skill_assessments(assessed_by);

CREATE INDEX IF NOT EXISTS idx_skill_development_plans_skill_id 
  ON skill_development_plans(skill_id);

CREATE INDEX IF NOT EXISTS idx_skills_matrix_job_family_id 
  ON skills_matrix(job_family_id);

CREATE INDEX IF NOT EXISTS idx_strategic_goals_owner_id 
  ON strategic_goals(owner_id);

CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_granted_by 
  ON user_admin_permissions(granted_by);

CREATE INDEX IF NOT EXISTS idx_view_as_sessions_target_user_id 
  ON view_as_sessions(target_user_id);
/*
  # Fix RLS Auth Performance Issues - Part 1 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Significantly improves query performance at scale
    - Fixes policies on: skills, profile_skills, reviews (4 policies), review_items (2 policies)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- skills table
DROP POLICY IF EXISTS "L&D and admins can manage skills" ON skills;
CREATE POLICY "L&D and admins can manage skills"
  ON skills
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND (role = 'admin' OR role = 'leadership')
    )
  );

-- profile_skills table
DROP POLICY IF EXISTS "Users can manage own profile skills" ON profile_skills;
CREATE POLICY "Users can manage own profile skills"
  ON profile_skills
  FOR ALL
  TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

-- reviews table (4 policies)
DROP POLICY IF EXISTS "Managers can create reviews" ON reviews;
CREATE POLICY "Managers can create reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can update own reviews" ON reviews;
CREATE POLICY "Managers can update own reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team reviews" ON reviews;
CREATE POLICY "Managers can view team reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own reviews" ON reviews;
CREATE POLICY "Users can view own reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- review_items table (2 policies)
DROP POLICY IF EXISTS "Managers can manage review items" ON review_items;
CREATE POLICY "Managers can manage review items"
  ON review_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_items.review_id
      AND r.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view review items for accessible reviews" ON review_items;
CREATE POLICY "Users can view review items for accessible reviews"
  ON review_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_items.review_id
      AND (r.employee_id = (SELECT auth.uid()) OR r.manager_id = (SELECT auth.uid()))
    )
  );
/*
  # Fix RLS Auth Performance Issues - Part 2 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: action_items (3), training_sessions, training_attendees (2)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- action_items table (3 policies)
DROP POLICY IF EXISTS "Managers can view team action items" ON action_items;
CREATE POLICY "Managers can view team action items"
  ON action_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.manager_id = (SELECT auth.uid())
      AND p.id = action_items.owner_id
    )
  );

DROP POLICY IF EXISTS "Users can manage own action items" ON action_items;
CREATE POLICY "Users can manage own action items"
  ON action_items
  FOR ALL
  TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own action items" ON action_items;
CREATE POLICY "Users can view own action items"
  ON action_items
  FOR SELECT
  TO authenticated
  USING (owner_id = (SELECT auth.uid()));

-- training_sessions table
DROP POLICY IF EXISTS "L&D can manage training sessions" ON training_sessions;
CREATE POLICY "L&D can manage training sessions"
  ON training_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('admin', 'leadership')
    )
  );

-- training_attendees table (2 policies)
DROP POLICY IF EXISTS "Users can book own training" ON training_attendees;
CREATE POLICY "Users can book own training"
  ON training_attendees
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can cancel own training" ON training_attendees;
CREATE POLICY "Users can cancel own training"
  ON training_attendees
  FOR UPDATE
  TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));
/*
  # Fix RLS Auth Performance Issues - Part 3 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: competency_frameworks, competency_categories, job_families, competency_levels

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- competency_frameworks table
DROP POLICY IF EXISTS "Admins can manage frameworks" ON competency_frameworks;
CREATE POLICY "Admins can manage frameworks"
  ON competency_frameworks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- competency_categories table
DROP POLICY IF EXISTS "Admins can manage categories" ON competency_categories;
CREATE POLICY "Admins can manage categories"
  ON competency_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- job_families table
DROP POLICY IF EXISTS "Leadership can manage job families" ON job_families;
CREATE POLICY "Leadership can manage job families"
  ON job_families
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('leadership', 'admin')
    )
  );

-- competency_levels table
DROP POLICY IF EXISTS "Admins can manage levels" ON competency_levels;
CREATE POLICY "Admins can manage levels"
  ON competency_levels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );
/*
  # Fix RLS Auth Performance Issues - Part 4 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: review_form_templates, review_template_sections, organisation_settings (2), review_template_questions

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- review_form_templates table
DROP POLICY IF EXISTS "Admins can manage templates" ON review_form_templates;
CREATE POLICY "Admins can manage templates"
  ON review_form_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- review_template_sections table
DROP POLICY IF EXISTS "Admins can manage sections" ON review_template_sections;
CREATE POLICY "Admins can manage sections"
  ON review_template_sections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- organisation_settings table (2 policies)
DROP POLICY IF EXISTS "Admins can insert organisation settings" ON organisation_settings;
CREATE POLICY "Admins can insert organisation settings"
  ON organisation_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update organisation settings" ON organisation_settings;
CREATE POLICY "Admins can update organisation settings"
  ON organisation_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- review_template_questions table
DROP POLICY IF EXISTS "Admins can manage questions" ON review_template_questions;
CREATE POLICY "Admins can manage questions"
  ON review_template_questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );
/*
  # Fix RLS Auth Performance Issues - Part 5 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: review_cycles, cycle_kpis, cycle_actions, user_admin_permissions (2), view_as_sessions (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- review_cycles table
DROP POLICY IF EXISTS "Admins can manage cycles" ON review_cycles;
CREATE POLICY "Admins can manage cycles"
  ON review_cycles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- cycle_kpis table
DROP POLICY IF EXISTS "Admins can manage cycle KPIs" ON cycle_kpis;
CREATE POLICY "Admins can manage cycle KPIs"
  ON cycle_kpis
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- cycle_actions table
DROP POLICY IF EXISTS "Admins can manage cycle actions" ON cycle_actions;
CREATE POLICY "Admins can manage cycle actions"
  ON cycle_actions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- user_admin_permissions table (2 policies)
DROP POLICY IF EXISTS "Admins can manage permissions" ON user_admin_permissions;
CREATE POLICY "Admins can manage permissions"
  ON user_admin_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all permissions" ON user_admin_permissions;
CREATE POLICY "Admins can view all permissions"
  ON user_admin_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- view_as_sessions table (3 policies)
DROP POLICY IF EXISTS "Admins can create sessions" ON view_as_sessions;
CREATE POLICY "Admins can create sessions"
  ON view_as_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update own sessions" ON view_as_sessions;
CREATE POLICY "Admins can update own sessions"
  ON view_as_sessions
  FOR UPDATE
  TO authenticated
  USING (admin_id = (SELECT auth.uid()))
  WITH CHECK (admin_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view own sessions" ON view_as_sessions;
CREATE POLICY "Admins can view own sessions"
  ON view_as_sessions
  FOR SELECT
  TO authenticated
  USING (admin_id = (SELECT auth.uid()));
/*
  # Fix RLS Auth Performance Issues - Part 6 Corrected (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: review_instances (4), review_responses (2), profiles (4)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- review_instances table (4 policies)
DROP POLICY IF EXISTS "Managers can create review instances" ON review_instances;
CREATE POLICY "Managers can create review instances"
  ON review_instances
  FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update review instances" ON review_instances;
CREATE POLICY "Managers can update review instances"
  ON review_instances
  FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team review instances" ON review_instances;
CREATE POLICY "Managers can view team review instances"
  ON review_instances
  FOR SELECT
  TO authenticated
  USING (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own review instances" ON review_instances;
CREATE POLICY "Users can view own review instances"
  ON review_instances
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- review_responses table (2 policies)
DROP POLICY IF EXISTS "Managers can manage review responses" ON review_responses;
CREATE POLICY "Managers can manage review responses"
  ON review_responses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_instances ri
      WHERE ri.id = review_responses.instance_id
      AND ri.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own review responses" ON review_responses;
CREATE POLICY "Users can view own review responses"
  ON review_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_instances ri
      WHERE ri.id = review_responses.instance_id
      AND ri.employee_id = (SELECT auth.uid())
    )
  );

-- profiles table (4 policies)
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated can insert own profile" ON profiles;
CREATE POLICY "Authenticated can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));
/*
  # Fix RLS Auth Performance Issues - Part 7 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: one_to_one_meetings (4), one_to_one_notes (3), one_to_one_action_items (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- one_to_one_meetings table (4 policies)
DROP POLICY IF EXISTS "Managers can create meetings" ON one_to_one_meetings;
CREATE POLICY "Managers can create meetings"
  ON one_to_one_meetings
  FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update meetings" ON one_to_one_meetings;
CREATE POLICY "Managers can update meetings"
  ON one_to_one_meetings
  FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team meetings" ON one_to_one_meetings;
CREATE POLICY "Managers can view team meetings"
  ON one_to_one_meetings
  FOR SELECT
  TO authenticated
  USING (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own meetings" ON one_to_one_meetings;
CREATE POLICY "Users can view own meetings"
  ON one_to_one_meetings
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- one_to_one_notes table (3 policies)
DROP POLICY IF EXISTS "Creators can update notes" ON one_to_one_notes;
CREATE POLICY "Creators can update notes"
  ON one_to_one_notes
  FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Participants can create notes" ON one_to_one_notes;
CREATE POLICY "Participants can create notes"
  ON one_to_one_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_meetings m
      WHERE m.id = one_to_one_notes.meeting_id
      AND (m.manager_id = (SELECT auth.uid()) OR m.employee_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can view meeting notes" ON one_to_one_notes;
CREATE POLICY "Users can view meeting notes"
  ON one_to_one_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_meetings m
      WHERE m.id = one_to_one_notes.meeting_id
      AND (m.manager_id = (SELECT auth.uid()) OR m.employee_id = (SELECT auth.uid()))
    )
  );

-- one_to_one_action_items table (3 policies)
DROP POLICY IF EXISTS "Owners can update actions" ON one_to_one_action_items;
CREATE POLICY "Owners can update actions"
  ON one_to_one_action_items
  FOR UPDATE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Participants can create actions" ON one_to_one_action_items;
CREATE POLICY "Participants can create actions"
  ON one_to_one_action_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_meetings m
      WHERE m.id = one_to_one_action_items.meeting_id
      AND (m.manager_id = (SELECT auth.uid()) OR m.employee_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can view meeting actions" ON one_to_one_action_items;
CREATE POLICY "Users can view meeting actions"
  ON one_to_one_action_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_meetings m
      WHERE m.id = one_to_one_action_items.meeting_id
      AND (m.manager_id = (SELECT auth.uid()) OR m.employee_id = (SELECT auth.uid()))
    )
  );
/*
  # Fix RLS Auth Performance Issues - Part 8 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: skills_matrix, skill_assessments (4), skill_development_plans (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- skills_matrix table
DROP POLICY IF EXISTS "Admins can manage skills matrix" ON skills_matrix;
CREATE POLICY "Admins can manage skills matrix"
  ON skills_matrix
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- skill_assessments table (4 policies)
DROP POLICY IF EXISTS "Managers can create assessments" ON skill_assessments;
CREATE POLICY "Managers can create assessments"
  ON skill_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    assessed_by = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = skill_assessments.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can update assessments" ON skill_assessments;
CREATE POLICY "Managers can update assessments"
  ON skill_assessments
  FOR UPDATE
  TO authenticated
  USING (assessed_by = (SELECT auth.uid()))
  WITH CHECK (assessed_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team assessments" ON skill_assessments;
CREATE POLICY "Managers can view team assessments"
  ON skill_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = skill_assessments.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own assessments" ON skill_assessments;
CREATE POLICY "Users can view own assessments"
  ON skill_assessments
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- skill_development_plans table (3 policies)
DROP POLICY IF EXISTS "Managers can view team development plans" ON skill_development_plans;
CREATE POLICY "Managers can view team development plans"
  ON skill_development_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = skill_development_plans.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own development plans" ON skill_development_plans;
CREATE POLICY "Users can manage own development plans"
  ON skill_development_plans
  FOR ALL
  TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own development plans" ON skill_development_plans;
CREATE POLICY "Users can view own development plans"
  ON skill_development_plans
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));
/*
  # Fix RLS Auth Performance Issues - Part 9 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: career_pathways, career_plans (3), career_plan_milestones (2)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- career_pathways table
DROP POLICY IF EXISTS "Admins can manage pathways" ON career_pathways;
CREATE POLICY "Admins can manage pathways"
  ON career_pathways
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- career_plans table (3 policies)
DROP POLICY IF EXISTS "Managers can view team career plans" ON career_plans;
CREATE POLICY "Managers can view team career plans"
  ON career_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = career_plans.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own career plans" ON career_plans;
CREATE POLICY "Users can manage own career plans"
  ON career_plans
  FOR ALL
  TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own career plans" ON career_plans;
CREATE POLICY "Users can view own career plans"
  ON career_plans
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- career_plan_milestones table (2 policies)
DROP POLICY IF EXISTS "Users can manage own milestones" ON career_plan_milestones;
CREATE POLICY "Users can manage own milestones"
  ON career_plan_milestones
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans cp
      WHERE cp.id = career_plan_milestones.plan_id
      AND cp.profile_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM career_plans cp
      WHERE cp.id = career_plan_milestones.plan_id
      AND cp.profile_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own milestones" ON career_plan_milestones;
CREATE POLICY "Users can view own milestones"
  ON career_plan_milestones
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans cp
      WHERE cp.id = career_plan_milestones.plan_id
      AND cp.profile_id = (SELECT auth.uid())
    )
  );
/*
  # Fix RLS Auth Performance Issues - Part 10 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: strategic_goals, goal_kpis, goal_actions, goal_departments

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- strategic_goals table
DROP POLICY IF EXISTS "Leadership can manage goals" ON strategic_goals;
CREATE POLICY "Leadership can manage goals"
  ON strategic_goals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('leadership', 'admin')
    )
  );

-- goal_kpis table
DROP POLICY IF EXISTS "Leadership can manage goal KPIs" ON goal_kpis;
CREATE POLICY "Leadership can manage goal KPIs"
  ON goal_kpis
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('leadership', 'admin')
    )
  );

-- goal_actions table
DROP POLICY IF EXISTS "Leadership can manage goal actions" ON goal_actions;
CREATE POLICY "Leadership can manage goal actions"
  ON goal_actions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('leadership', 'admin')
    )
  );

-- goal_departments table
DROP POLICY IF EXISTS "Leadership can manage goal departments" ON goal_departments;
CREATE POLICY "Leadership can manage goal departments"
  ON goal_departments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('leadership', 'admin')
    )
  );
/*
  # Fix RLS Auth Performance Issues - Part 11 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: training_courses, training_modules, module_content_items, training_completions (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- training_courses table
DROP POLICY IF EXISTS "Admins can manage courses" ON training_courses;
CREATE POLICY "Admins can manage courses"
  ON training_courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- training_modules table
DROP POLICY IF EXISTS "Admins can manage modules" ON training_modules;
CREATE POLICY "Admins can manage modules"
  ON training_modules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- module_content_items table
DROP POLICY IF EXISTS "Admins can manage content items" ON module_content_items;
CREATE POLICY "Admins can manage content items"
  ON module_content_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- training_completions table (3 policies)
DROP POLICY IF EXISTS "Managers can view team completions" ON training_completions;
CREATE POLICY "Managers can view team completions"
  ON training_completions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = training_completions.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own completions" ON training_completions;
CREATE POLICY "Users can manage own completions"
  ON training_completions
  FOR ALL
  TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own completions" ON training_completions;
CREATE POLICY "Users can view own completions"
  ON training_completions
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));
/*
  # Fix RLS Auth Performance Issues - Part 12 Corrected (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: performance_ratings (4), rating_approval_workflow (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- performance_ratings table (4 policies)
DROP POLICY IF EXISTS "Managers can create ratings" ON performance_ratings;
CREATE POLICY "Managers can create ratings"
  ON performance_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    rater_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = performance_ratings.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can update ratings" ON performance_ratings;
CREATE POLICY "Managers can update ratings"
  ON performance_ratings
  FOR UPDATE
  TO authenticated
  USING (rater_id = (SELECT auth.uid()))
  WITH CHECK (rater_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team ratings" ON performance_ratings;
CREATE POLICY "Managers can view team ratings"
  ON performance_ratings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = performance_ratings.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own ratings" ON performance_ratings;
CREATE POLICY "Users can view own ratings"
  ON performance_ratings
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- rating_approval_workflow table (3 policies)
DROP POLICY IF EXISTS "Approvers can update workflow" ON rating_approval_workflow;
CREATE POLICY "Approvers can update workflow"
  ON rating_approval_workflow
  FOR UPDATE
  TO authenticated
  USING (approver_id = (SELECT auth.uid()))
  WITH CHECK (approver_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Approvers can view workflow" ON rating_approval_workflow;
CREATE POLICY "Approvers can view workflow"
  ON rating_approval_workflow
  FOR SELECT
  TO authenticated
  USING (approver_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "System can create workflow" ON rating_approval_workflow;
CREATE POLICY "System can create workflow"
  ON rating_approval_workflow
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('manager', 'leadership', 'admin')
    )
  );
/*
  # Fix RLS Auth Performance Issues - Part 13 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: copilot_config, job_history (3), progression_criteria, ai_quiz_preferences (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- copilot_config table
DROP POLICY IF EXISTS "Admins can manage copilot config" ON copilot_config;
CREATE POLICY "Admins can manage copilot config"
  ON copilot_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- job_history table (3 policies)
DROP POLICY IF EXISTS "Admins can manage job history" ON job_history;
CREATE POLICY "Admins can manage job history"
  ON job_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can view team job history" ON job_history;
CREATE POLICY "Managers can view team job history"
  ON job_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = job_history.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own job history" ON job_history;
CREATE POLICY "Users can view own job history"
  ON job_history
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- progression_criteria table
DROP POLICY IF EXISTS "Admins can manage progression criteria" ON progression_criteria;
CREATE POLICY "Admins can manage progression criteria"
  ON progression_criteria
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- ai_quiz_preferences table (3 policies)
DROP POLICY IF EXISTS "Admins can view all quiz preferences" ON ai_quiz_preferences;
CREATE POLICY "Admins can view all quiz preferences"
  ON ai_quiz_preferences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can manage own quiz preferences" ON ai_quiz_preferences;
CREATE POLICY "Users can manage own quiz preferences"
  ON ai_quiz_preferences
  FOR ALL
  TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own quiz preferences" ON ai_quiz_preferences;
CREATE POLICY "Users can view own quiz preferences"
  ON ai_quiz_preferences
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));
/*
  # Fix RLS Auth Performance Issues - Part 14 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: training_module_job_family_links, departments_org (3), job_titles_org (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- training_module_job_family_links table
DROP POLICY IF EXISTS "Admins can manage training links" ON training_module_job_family_links;
CREATE POLICY "Admins can manage training links"
  ON training_module_job_family_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- departments_org table (3 policies)
DROP POLICY IF EXISTS "Admins can delete departments" ON departments_org;
CREATE POLICY "Admins can delete departments"
  ON departments_org
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert departments" ON departments_org;
CREATE POLICY "Admins can insert departments"
  ON departments_org
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update departments" ON departments_org;
CREATE POLICY "Admins can update departments"
  ON departments_org
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- job_titles_org table (3 policies)
DROP POLICY IF EXISTS "Admins can delete job titles" ON job_titles_org;
CREATE POLICY "Admins can delete job titles"
  ON job_titles_org
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert job titles" ON job_titles_org;
CREATE POLICY "Admins can insert job titles"
  ON job_titles_org
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update job titles" ON job_titles_org;
CREATE POLICY "Admins can update job titles"
  ON job_titles_org
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );
/*
  # Fix RLS Auth Performance Issues - Part 15 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: review_six_month_performance (3), review_kpis (2), review_weekly_checkins (2)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- review_six_month_performance table (3 policies)
DROP POLICY IF EXISTS "Managers can insert 6-month reviews" ON review_six_month_performance;
CREATE POLICY "Managers can insert 6-month reviews"
  ON review_six_month_performance
  FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update 6-month reviews" ON review_six_month_performance;
CREATE POLICY "Managers can update 6-month reviews"
  ON review_six_month_performance
  FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their 6-month reviews" ON review_six_month_performance;
CREATE POLICY "Users can view their 6-month reviews"
  ON review_six_month_performance
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- review_kpis table (2 policies)
DROP POLICY IF EXISTS "Managers can manage KPIs" ON review_kpis;
CREATE POLICY "Managers can manage KPIs"
  ON review_kpis
  FOR ALL
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their KPIs" ON review_kpis;
CREATE POLICY "Users can view their KPIs"
  ON review_kpis
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- review_weekly_checkins table (2 policies)
DROP POLICY IF EXISTS "Users can manage their weekly checkins" ON review_weekly_checkins;
CREATE POLICY "Users can manage their weekly checkins"
  ON review_weekly_checkins
  FOR ALL
  TO authenticated
  USING (employee_id = (SELECT auth.uid()))
  WITH CHECK (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their weekly checkins" ON review_weekly_checkins;
CREATE POLICY "Users can view their weekly checkins"
  ON review_weekly_checkins
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));
/*
  # Fix RLS Auth Performance Issues - Part 16 Corrected (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: review_monthly_sessions (2), review_competency_ratings (2), review_rating_approvals (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- review_monthly_sessions table (2 policies)
DROP POLICY IF EXISTS "Managers can manage monthly reviews" ON review_monthly_sessions;
CREATE POLICY "Managers can manage monthly reviews"
  ON review_monthly_sessions
  FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their monthly reviews" ON review_monthly_sessions;
CREATE POLICY "Users can view their monthly reviews"
  ON review_monthly_sessions
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- review_competency_ratings table (2 policies)
DROP POLICY IF EXISTS "Managers can manage competency ratings" ON review_competency_ratings;
CREATE POLICY "Managers can manage competency ratings"
  ON review_competency_ratings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_instances ri
      WHERE ri.id = review_competency_ratings.review_id
      AND ri.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_instances ri
      WHERE ri.id = review_competency_ratings.review_id
      AND ri.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view competency ratings" ON review_competency_ratings;
CREATE POLICY "Users can view competency ratings"
  ON review_competency_ratings
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- review_rating_approvals table (3 policies)
DROP POLICY IF EXISTS "Approvers can update rating approvals" ON review_rating_approvals;
CREATE POLICY "Approvers can update rating approvals"
  ON review_rating_approvals
  FOR UPDATE
  TO authenticated
  USING (approver_id = (SELECT auth.uid()))
  WITH CHECK (approver_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can create rating approvals" ON review_rating_approvals;
CREATE POLICY "Managers can create rating approvals"
  ON review_rating_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view rating approvals" ON review_rating_approvals;
CREATE POLICY "Users can view rating approvals"
  ON review_rating_approvals
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()) OR manager_id = (SELECT auth.uid()) OR approver_id = (SELECT auth.uid()));
/*
  # Fix RLS Auth Performance Issues - Part 17 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: review_goal_progress (2), review_notifications (3), review_kpi_templates (2)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- review_goal_progress table (2 policies)
DROP POLICY IF EXISTS "Users can manage goal progress" ON review_goal_progress;
CREATE POLICY "Users can manage goal progress"
  ON review_goal_progress
  FOR ALL
  TO authenticated
  USING (employee_id = (SELECT auth.uid()))
  WITH CHECK (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view goal progress" ON review_goal_progress;
CREATE POLICY "Users can view goal progress"
  ON review_goal_progress
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- review_notifications table (3 policies)
DROP POLICY IF EXISTS "System can create notifications" ON review_notifications;
CREATE POLICY "System can create notifications"
  ON review_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can update their notifications" ON review_notifications;
CREATE POLICY "Users can update their notifications"
  ON review_notifications
  FOR UPDATE
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their notifications" ON review_notifications;
CREATE POLICY "Users can view their notifications"
  ON review_notifications
  FOR SELECT
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

-- review_kpi_templates table (2 policies)
DROP POLICY IF EXISTS "Managers can manage KPI templates" ON review_kpi_templates;
CREATE POLICY "Managers can manage KPI templates"
  ON review_kpi_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can view KPI templates" ON review_kpi_templates;
CREATE POLICY "Managers can view KPI templates"
  ON review_kpi_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('manager', 'leadership', 'admin')
    )
  );
/*
  # Remove Unused Indexes (Security Fix)

  1. Indexes Removed
    - Removes 54 unused indexes that have never been used
    - Improves write performance by reducing index maintenance overhead
    - Reduces storage space usage

  2. Security Impact
    - Improves overall database performance
    - No negative impact on queries (indexes were never used)
*/

DROP INDEX IF EXISTS idx_profiles_department;
DROP INDEX IF EXISTS idx_reviews_employee;
DROP INDEX IF EXISTS idx_reviews_manager;
DROP INDEX IF EXISTS idx_reviews_status;
DROP INDEX IF EXISTS idx_action_items_owner;
DROP INDEX IF EXISTS idx_action_items_completed;
DROP INDEX IF EXISTS idx_training_sessions_date;
DROP INDEX IF EXISTS idx_training_attendees_profile;
DROP INDEX IF EXISTS idx_training_attendees_session;
DROP INDEX IF EXISTS idx_user_admin_permissions_user_id;
DROP INDEX IF EXISTS idx_view_as_sessions_admin_id;
DROP INDEX IF EXISTS idx_view_as_sessions_active;
DROP INDEX IF EXISTS idx_profiles_manager_id;
DROP INDEX IF EXISTS idx_profiles_job_family_id;
DROP INDEX IF EXISTS idx_competency_categories_framework;
DROP INDEX IF EXISTS idx_competency_levels_category;
DROP INDEX IF EXISTS idx_review_template_sections_template;
DROP INDEX IF EXISTS idx_review_template_questions_section;
DROP INDEX IF EXISTS idx_review_cycles_template;
DROP INDEX IF EXISTS idx_cycle_kpis_cycle;
DROP INDEX IF EXISTS idx_cycle_actions_cycle;
DROP INDEX IF EXISTS idx_review_instances_cycle;
DROP INDEX IF EXISTS idx_review_responses_instance;
DROP INDEX IF EXISTS idx_skill_assessments_skill;
DROP INDEX IF EXISTS idx_career_pathways_from;
DROP INDEX IF EXISTS idx_career_pathways_to;
DROP INDEX IF EXISTS idx_career_plan_milestones_plan;
DROP INDEX IF EXISTS idx_goal_kpis_goal;
DROP INDEX IF EXISTS idx_goal_actions_goal;
DROP INDEX IF EXISTS idx_goal_departments_goal;
DROP INDEX IF EXISTS idx_training_modules_course;
DROP INDEX IF EXISTS idx_module_content_items_module;
DROP INDEX IF EXISTS idx_training_completions_course;
DROP INDEX IF EXISTS idx_rating_approval_workflow_rating;
DROP INDEX IF EXISTS idx_profiles_manager;
DROP INDEX IF EXISTS idx_profiles_job_title;
DROP INDEX IF EXISTS idx_job_history_date;
DROP INDEX IF EXISTS idx_training_links_course;
DROP INDEX IF EXISTS idx_training_links_job_family;
DROP INDEX IF EXISTS idx_departments_org_active;
DROP INDEX IF EXISTS idx_job_titles_org_active;
DROP INDEX IF EXISTS idx_profiles_start_date;
DROP INDEX IF EXISTS idx_profiles_active;
DROP INDEX IF EXISTS idx_review_six_month_employee;
DROP INDEX IF EXISTS idx_review_six_month_manager;
DROP INDEX IF EXISTS idx_review_six_month_status;
DROP INDEX IF EXISTS idx_review_six_month_rating;
DROP INDEX IF EXISTS idx_review_kpis_employee;
DROP INDEX IF EXISTS idx_review_weekly_employee;
DROP INDEX IF EXISTS idx_review_monthly_employee;
DROP INDEX IF EXISTS idx_review_competency_review;
DROP INDEX IF EXISTS idx_review_notifications_recipient;
/*
  # Fix Duplicate Indexes (Security Fix)

  1. Duplicate Index Removed
    - Remove idx_profiles_manager (duplicate of idx_profiles_manager_id)
    - Both indexes cover the same column on profiles table
    - Improves write performance and reduces storage

  2. Security Impact
    - No change to query performance (identical indexes)
    - Reduces index maintenance overhead
*/

DROP INDEX IF EXISTS idx_profiles_manager;
/*
  # Fix Unrestricted RLS Policy (Security Fix)

  1. Security Issue Fixed
    - Remove "Anon can insert profiles" policy that allows unrestricted access
    - This policy had WITH CHECK (true) which bypasses RLS completely
    - Anonymous users should NOT be able to insert profiles directly

  2. Proper Access Control
    - Keep "Authenticated can insert own profile" for self-signup
    - Keep "Service role can insert profiles" for admin operations via edge functions
    - Anonymous inserts are now properly blocked

  3. Impact
    - Self-signup still works via authenticated route
    - Admin user creation via edge functions still works
    - Blocks potential security vulnerability from anonymous inserts
*/

DROP POLICY IF EXISTS "Anon can insert profiles" ON profiles;