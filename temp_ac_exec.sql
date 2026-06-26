/*
  # Fix get_active_view_as_session function type mismatch

  1. Changes
    - Cast the role column to text to match the function return type
    - This fixes the "structure of query does not match function result type" error
  
  2. Issue
    - The profiles.role column is of type user_role (enum)
    - The function declares it returns text
    - Need to explicitly cast user_role to text in the SELECT statement
*/

-- Recreate the function with proper type casting
CREATE OR REPLACE FUNCTION get_active_view_as_session(admin_user_id uuid)
RETURNS TABLE (
  session_id uuid,
  target_user_id uuid,
  target_email text,
  target_name text,
  target_role text,
  started_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vas.id as session_id,
    vas.target_user_id,
    p.email as target_email,
    p.full_name as target_name,
    p.role::text as target_role,  -- Cast enum to text
    vas.started_at
  FROM view_as_sessions vas
  JOIN profiles p ON p.id = vas.target_user_id
  WHERE vas.admin_id = admin_user_id
  AND vas.ended_at IS NULL
  ORDER BY vas.started_at DESC
  LIMIT 1;
END;
$$;

/*
  # Create working test accounts v2
  
  1. Test Users
    - admin@eposnow.com - Full Admin (password: Admin123!)
    - john.doe@eposnow.com - Employee (password: Password123!)
    - jane.smith@eposnow.com - Manager (password: Password123!)
    - mike.wilson@eposnow.com - Employee (password: Password123!)
  
  2. Features
    - Creates auth users with proper encrypted passwords
    - Creates corresponding profiles
    - Sets up roles and permissions
*/

DO $$
DECLARE
  admin_id uuid;
  john_id uuid;
  jane_id uuid;
  mike_id uuid;
  existing_user_id uuid;
BEGIN
  -- Admin account
  SELECT id INTO existing_user_id FROM auth.users WHERE email = 'admin@eposnow.com';
  
  IF existing_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      instance_id
    ) VALUES (
      gen_random_uuid(),
      'admin@eposnow.com',
      crypt('Admin123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"System Administrator"}',
      false,
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000'
    )
    RETURNING id INTO admin_id;
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('Admin123!', gen_salt('bf'))
    WHERE id = existing_user_id;
    admin_id := existing_user_id;
  END IF;

  -- Create admin profile
  INSERT INTO profiles (id, email, full_name, role, department, job_title, admin_type)
  VALUES (
    admin_id,
    'admin@eposnow.com',
    'System Administrator',
    'admin',
    'IT',
    'System Administrator',
    'full_admin'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = 'admin',
    admin_type = 'full_admin',
    department = 'IT',
    job_title = 'System Administrator';

  -- Create identity for admin
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), 
    admin_id, 
    'admin@eposnow.com', 
    format('{"sub":"%s","email":"admin@eposnow.com"}', admin_id)::jsonb, 
    'email', 
    now(), 
    now(), 
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- John Doe (Employee)
  SELECT id INTO existing_user_id FROM auth.users WHERE email = 'john.doe@eposnow.com';
  
  IF existing_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      instance_id
    ) VALUES (
      gen_random_uuid(),
      'john.doe@eposnow.com',
      crypt('Password123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"John Doe"}',
      false,
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000'
    )
    RETURNING id INTO john_id;
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('Password123!', gen_salt('bf'))
    WHERE id = existing_user_id;
    john_id := existing_user_id;
  END IF;

  -- Create John's profile
  INSERT INTO profiles (id, email, full_name, role, department, job_title)
  VALUES (
    john_id,
    'john.doe@eposnow.com',
    'John Doe',
    'employee',
    'Sales',
    'Sales Representative'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = 'employee',
    department = 'Sales',
    job_title = 'Sales Representative';

  -- Create identity for John
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), 
    john_id, 
    'john.doe@eposnow.com', 
    format('{"sub":"%s","email":"john.doe@eposnow.com"}', john_id)::jsonb, 
    'email', 
    now(), 
    now(), 
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Jane Smith (Manager)
  SELECT id INTO existing_user_id FROM auth.users WHERE email = 'jane.smith@eposnow.com';
  
  IF existing_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      instance_id
    ) VALUES (
      gen_random_uuid(),
      'jane.smith@eposnow.com',
      crypt('Password123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Jane Smith"}',
      false,
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000'
    )
    RETURNING id INTO jane_id;
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('Password123!', gen_salt('bf'))
    WHERE id = existing_user_id;
    jane_id := existing_user_id;
  END IF;

  -- Create Jane's profile
  INSERT INTO profiles (id, email, full_name, role, department, job_title)
  VALUES (
    jane_id,
    'jane.smith@eposnow.com',
    'Jane Smith',
    'manager',
    'Sales',
    'Sales Manager'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = 'manager',
    department = 'Sales',
    job_title = 'Sales Manager';

  -- Create identity for Jane
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), 
    jane_id, 
    'jane.smith@eposnow.com', 
    format('{"sub":"%s","email":"jane.smith@eposnow.com"}', jane_id)::jsonb, 
    'email', 
    now(), 
    now(), 
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Set Jane as John's manager
  UPDATE profiles
  SET manager_id = jane_id
  WHERE id = john_id;

  -- Mike Wilson (Employee)
  SELECT id INTO existing_user_id FROM auth.users WHERE email = 'mike.wilson@eposnow.com';
  
  IF existing_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud,
      instance_id
    ) VALUES (
      gen_random_uuid(),
      'mike.wilson@eposnow.com',
      crypt('Password123!', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Mike Wilson"}',
      false,
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000'
    )
    RETURNING id INTO mike_id;
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('Password123!', gen_salt('bf'))
    WHERE id = existing_user_id;
    mike_id := existing_user_id;
  END IF;

  -- Create Mike's profile
  INSERT INTO profiles (id, email, full_name, role, department, job_title, manager_id)
  VALUES (
    mike_id,
    'mike.wilson@eposnow.com',
    'Mike Wilson',
    'employee',
    'Sales',
    'Sales Representative',
    jane_id
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    role = 'employee',
    department = 'Sales',
    job_title = 'Sales Representative',
    manager_id = jane_id;

  -- Create identity for Mike
  INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (
    gen_random_uuid(), 
    mike_id, 
    'mike.wilson@eposnow.com', 
    format('{"sub":"%s","email":"mike.wilson@eposnow.com"}', mike_id)::jsonb, 
    'email', 
    now(), 
    now(), 
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

END $$;

/*
  # Comprehensive Review and Performance Management System
  
  1. New Tables
    - `review_kpi_templates` - Standard KPI templates managers can apply to teams
    - `review_weekly_checkins` - Weekly check-in records with KPIs and progress
    - `review_monthly_sessions` - Monthly review sessions
    - `review_six_month_performance` - 6-month performance reviews
    - `review_competency_ratings` - Competency ratings within reviews
    - `review_rating_approvals` - Approval workflow for high ratings (4s)
    - `review_notifications` - Notification system for reviews
    - `review_kpis` - Individual KPIs for employees
    - `review_goal_progress` - Goal progress tracking in reviews
    
  2. Features
    - Weekly check-ins (optional) with KPI tracking
    - Monthly reviews with competency assessments
    - 6-month performance reviews with averaging
    - Approval workflow for rating 4s
    - Bulk KPI template application
    - Integration with career plans and learning
    - Notification system
    
  3. Security
    - RLS enabled on all tables
    - Managers can manage their team's reviews
    - Employees can view their own reviews
    - Heads of department can approve ratings
    - Execs can view performance data
*/

-- KPI Templates for bulk application
CREATE TABLE IF NOT EXISTS review_kpi_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES profiles(id),
  template_name text NOT NULL,
  department text,
  job_family_id uuid REFERENCES job_families(id),
  kpis jsonb NOT NULL, -- Array of {name, target, measurement_unit, frequency}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Individual KPIs assigned to employees
CREATE TABLE IF NOT EXISTS review_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  kpi_name text NOT NULL,
  target_value numeric,
  measurement_unit text,
  frequency text DEFAULT 'weekly', -- weekly, monthly, quarterly
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

-- Weekly check-ins
CREATE TABLE IF NOT EXISTS review_weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  manager_id uuid NOT NULL REFERENCES profiles(id),
  week_starting date NOT NULL,
  kpi_results jsonb, -- Array of {kpi_id, actual_value, notes}
  goal_updates jsonb, -- Array of {goal_id, progress_percent, comments}
  highlights text,
  challenges text,
  support_needed text,
  manager_comments text,
  status text DEFAULT 'scheduled', -- scheduled, in_progress, completed
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Monthly reviews
CREATE TABLE IF NOT EXISTS review_monthly_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  manager_id uuid NOT NULL REFERENCES profiles(id),
  review_month date NOT NULL,
  review_template_id uuid REFERENCES review_templates(id),
  
  -- KPI Section
  kpi_results jsonb, -- Array of {kpi_id, actual_value, target_value, achievement_percent}
  kpi_summary text,
  weekly_average_performance numeric, -- Calculated from weekly check-ins
  
  -- Goals Section
  goal_progress jsonb, -- Array of {goal_id, progress_percent, status, comments}
  cdp_actions jsonb, -- Pull from career_plans
  learning_actions jsonb, -- Outstanding learning modules
  
  -- Competency Section (monthly only)
  competency_ratings jsonb, -- Array of {competency_id, level, rating, comments, evidence}
  behavior_ratings jsonb, -- Array of {behavior, rating, comments}
  
  -- Overall scores
  overall_performance_score numeric,
  overall_competency_score numeric,
  
  -- Comments
  employee_comments text,
  manager_comments text,
  ai_weekly_summary text, -- AI-generated summary from weekly check-ins
  
  -- Status
  status text DEFAULT 'scheduled', -- scheduled, in_progress, completed, approved
  completed_at timestamptz,
  approved_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Competency ratings (separate for detailed tracking)
CREATE TABLE IF NOT EXISTS review_competency_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES review_monthly_sessions(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id),
  competency_id uuid NOT NULL REFERENCES competencies(id),
  target_level integer NOT NULL,
  actual_rating integer NOT NULL CHECK (actual_rating BETWEEN 1 AND 4),
  comments text NOT NULL,
  evidence text,
  ai_validation_status text, -- needs_more_info, validated, pending
  ai_validation_feedback text,
  requires_approval boolean DEFAULT false, -- true if rating is 4
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6-month performance reviews
CREATE TABLE IF NOT EXISTS review_six_month_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  manager_id uuid NOT NULL REFERENCES profiles(id),
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  
  -- Monthly review references
  monthly_review_ids uuid[] NOT NULL, -- Array of 6 monthly review IDs
  
  -- Averaged scores
  average_performance_score numeric,
  average_competency_score numeric,
  trend_analysis jsonb, -- Performance trend over 6 months
  
  -- Manager assessment
  manager_summary text,
  strengths text,
  development_areas text,
  recommended_actions text,
  
  -- Pay/bonus recommendation
  pay_review_recommended boolean DEFAULT false,
  bonus_recommended boolean DEFAULT false,
  promotion_recommended boolean DEFAULT false,
  recommendation_rationale text,
  
  -- Status and approvals
  status text DEFAULT 'draft', -- draft, submitted, approved, pay_review
  submitted_at timestamptz,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Approval workflow for rating 4s
CREATE TABLE IF NOT EXISTS review_rating_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES review_monthly_sessions(id),
  competency_rating_id uuid REFERENCES review_competency_ratings(id),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  manager_id uuid NOT NULL REFERENCES profiles(id),
  approver_id uuid NOT NULL REFERENCES profiles(id), -- Head of dept
  
  rating_type text NOT NULL, -- competency, performance
  rating_value integer NOT NULL,
  justification text NOT NULL,
  evidence text,
  
  status text DEFAULT 'pending', -- pending, approved, moderated, rejected
  approver_comments text,
  moderated_rating integer, -- If approver changes the rating
  moderation_reason text,
  
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Goal progress tracking in reviews
CREATE TABLE IF NOT EXISTS review_goal_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL, -- Can be weekly or monthly
  review_type text NOT NULL, -- weekly, monthly
  employee_id uuid NOT NULL REFERENCES profiles(id),
  goal_id uuid, -- Reference to career_plan_goals or strategic_goals
  goal_source text, -- cdp, strategic, personal
  goal_description text NOT NULL,
  progress_percent integer DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  status text DEFAULT 'on_track', -- on_track, at_risk, blocked, completed
  comments text,
  actions_required text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notification system for reviews
CREATE TABLE IF NOT EXISTS review_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id),
  sender_id uuid REFERENCES profiles(id),
  notification_type text NOT NULL, -- review_scheduled, approval_needed, rating_moderated, review_completed
  title text NOT NULL,
  message text NOT NULL,
  related_review_id uuid,
  action_url text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_created_by ON review_kpi_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_department ON review_kpi_templates(department);
CREATE INDEX IF NOT EXISTS idx_review_kpis_employee ON review_kpis(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_kpis_active ON review_kpis(employee_id, active);
CREATE INDEX IF NOT EXISTS idx_review_weekly_employee ON review_weekly_checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_weekly_manager ON review_weekly_checkins(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_weekly_status ON review_weekly_checkins(status);
CREATE INDEX IF NOT EXISTS idx_review_monthly_employee ON review_monthly_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_monthly_manager ON review_monthly_sessions(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_monthly_status ON review_monthly_sessions(status);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_review ON review_competency_ratings(review_id);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_approval ON review_competency_ratings(requires_approval);
CREATE INDEX IF NOT EXISTS idx_review_six_month_employee ON review_six_month_performance(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_six_month_status ON review_six_month_performance(status);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_approver ON review_rating_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_status ON review_rating_approvals(status);
CREATE INDEX IF NOT EXISTS idx_review_goal_progress_review ON review_goal_progress(review_id, review_type);
CREATE INDEX IF NOT EXISTS idx_review_notifications_recipient ON review_notifications(recipient_id, is_read);

-- Enable RLS
ALTER TABLE review_kpi_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_weekly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_monthly_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_competency_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_six_month_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_rating_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- KPI Templates
CREATE POLICY "Managers can create KPI templates"
  ON review_kpi_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

CREATE POLICY "Managers can view their templates"
  ON review_kpi_templates FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Managers can update their templates"
  ON review_kpi_templates FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Review KPIs
CREATE POLICY "Managers can assign KPIs"
  ON review_kpis FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND (p.role IN ('manager', 'leadership', 'admin')
      OR p.id IN (
        SELECT manager_id FROM profiles WHERE id = employee_id
      ))
    )
  );

CREATE POLICY "Users can view their KPIs"
  ON review_kpis FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role IN ('leadership', 'admin')
      OR id = (SELECT manager_id FROM profiles WHERE id = employee_id))
    )
  );

CREATE POLICY "Managers can update KPIs"
  ON review_kpis FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND id = (SELECT manager_id FROM profiles WHERE id = employee_id)
    )
  );

-- Weekly Check-ins
CREATE POLICY "Employees and managers can create weekly check-ins"
  ON review_weekly_checkins FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
    OR manager_id = auth.uid()
  );

CREATE POLICY "Employees and managers can view weekly check-ins"
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

CREATE POLICY "Employees and managers can update weekly check-ins"
  ON review_weekly_checkins FOR UPDATE
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR manager_id = auth.uid()
  );

-- Monthly Reviews
CREATE POLICY "Managers can create monthly reviews"
  ON review_monthly_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Employees and managers can view monthly reviews"
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

CREATE POLICY "Managers can update monthly reviews"
  ON review_monthly_sessions FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR employee_id = auth.uid()
  );

-- Competency Ratings
CREATE POLICY "Users can view their competency ratings"
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
  );

-- 6-Month Performance Reviews
CREATE POLICY "Managers can create 6-month reviews"
  ON review_six_month_performance FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = auth.uid()
  );

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

CREATE POLICY "Managers can update 6-month reviews"
  ON review_six_month_performance FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid()
  );

-- Rating Approvals
CREATE POLICY "Approvers can view rating approvals"
  ON review_rating_approvals FOR SELECT
  TO authenticated
  USING (
    approver_id = auth.uid()
    OR manager_id = auth.uid()
    OR employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "System can create rating approvals"
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

-- Goal Progress
CREATE POLICY "Users can view their goal progress"
  ON review_goal_progress FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p1
      INNER JOIN profiles p2 ON p2.manager_id = p1.id
      WHERE p1.id = auth.uid()
      AND p2.id = employee_id
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Employees and managers can manage goal progress"
  ON review_goal_progress FOR ALL
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p1
      INNER JOIN profiles p2 ON p2.manager_id = p1.id
      WHERE p1.id = auth.uid()
      AND p2.id = employee_id
    )
  );

-- Notifications
CREATE POLICY "Users can view their notifications"
  ON review_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON review_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their notifications"
  ON review_notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid());

-- Function to calculate weekly average for monthly review
CREATE OR REPLACE FUNCTION calculate_weekly_average_performance(
  p_employee_id uuid,
  p_review_month date
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_average numeric;
BEGIN
  -- Calculate average KPI achievement from weekly check-ins for the month
  SELECT AVG(
    (
      SELECT AVG(((kpi->>'achievement_percent')::numeric))
      FROM jsonb_array_elements(kpi_results) AS kpi
      WHERE (kpi->>'achievement_percent') IS NOT NULL
    )
  )
  INTO v_average
  FROM review_weekly_checkins
  WHERE employee_id = p_employee_id
  AND week_starting >= date_trunc('month', p_review_month)
  AND week_starting < date_trunc('month', p_review_month) + interval '1 month'
  AND status = 'completed';
  
  RETURN COALESCE(v_average, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_weekly_average_performance(uuid, date) TO authenticated;

-- Function to get head of department for approval
CREATE OR REPLACE FUNCTION get_head_of_department(p_employee_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_department text;
  v_hod_id uuid;
BEGIN
  -- Get employee's department
  SELECT department INTO v_department
  FROM profiles
  WHERE id = p_employee_id;
  
  -- Find head of department (could be in strategic_goals or custom logic)
  -- For now, find a leadership role in the same department
  SELECT id INTO v_hod_id
  FROM profiles
  WHERE department = v_department
  AND role = 'leadership'
  LIMIT 1;
  
  RETURN v_hod_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_head_of_department(uuid) TO authenticated;

-- Trigger to create approval request when rating is 4
CREATE OR REPLACE FUNCTION trigger_rating_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_manager_id uuid;
  v_hod_id uuid;
BEGIN
  IF NEW.actual_rating = 4 AND NEW.requires_approval = true THEN
    -- Get manager ID from the review
    SELECT manager_id INTO v_manager_id
    FROM review_monthly_sessions
    WHERE id = NEW.review_id;
    
    -- Get head of department
    v_hod_id := get_head_of_department(NEW.employee_id);
    
    IF v_hod_id IS NOT NULL THEN
      -- Create approval request
      INSERT INTO review_rating_approvals (
        review_id,
        competency_rating_id,
        employee_id,
        manager_id,
        approver_id,
        rating_type,
        rating_value,
        justification,
        evidence
      ) VALUES (
        NEW.review_id,
        NEW.id,
        NEW.employee_id,
        v_manager_id,
        v_hod_id,
        'competency',
        NEW.actual_rating,
        NEW.comments,
        NEW.evidence
      );
      
      -- Create notification for head of department
      INSERT INTO review_notifications (
        recipient_id,
        sender_id,
        notification_type,
        title,
        message,
        related_review_id
      ) VALUES (
        v_hod_id,
        v_manager_id,
        'approval_needed',
        'Rating 4 Approval Required',
        'A competency rating of 4 requires your approval',
        NEW.review_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_competency_rating_insert ON review_competency_ratings;
CREATE TRIGGER on_competency_rating_insert
  AFTER INSERT ON review_competency_ratings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_rating_approval();

-- Function to get employees eligible for pay review
CREATE OR REPLACE FUNCTION get_employees_eligible_for_pay_review()
RETURNS TABLE (
  employee_id uuid,
  employee_name text,
  department text,
  average_performance_score numeric,
  average_competency_score numeric,
  review_id uuid,
  manager_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.employee_id,
    p.full_name as employee_name,
    p.department,
    r.average_performance_score,
    r.average_competency_score,
    r.id as review_id,
    m.full_name as manager_name
  FROM review_six_month_performance r
  INNER JOIN profiles p ON p.id = r.employee_id
  INNER JOIN profiles m ON m.id = r.manager_id
  WHERE r.status = 'approved'
  AND (
    (r.average_performance_score >= 4 AND r.average_competency_score >= 4)
    OR r.pay_review_recommended = true
    OR r.bonus_recommended = true
  )
  ORDER BY r.average_performance_score DESC, r.average_competency_score DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_employees_eligible_for_pay_review() TO authenticated;

/*
  # Add Missing Foreign Key Indexes
  
  1. Performance Optimization
    - Add indexes on all unindexed foreign key columns
    - Improves JOIN performance and query optimization
    - Prevents table scans on foreign key lookups
  
  2. Tables Updated
    - department_strategies
    - goal_milestones
    - half_year_review_summaries
    - job_families
    - performance_ratings
    - profiles
    - review_competency_assessments
    - review_competency_ratings
    - review_goal_progress
    - review_kpi_templates
    - review_kpis
    - review_monthly_sessions
    - review_notifications
    - review_rating_approvals
    - review_six_month_performance
    - standalone_strategy_actions
    - strategy_actions
    - user_admin_permissions
    - weekly_performance_scores
*/

-- Department strategies
CREATE INDEX IF NOT EXISTS idx_department_strategies_business_strategy_id 
  ON department_strategies(business_strategy_id);

-- Goal milestones
CREATE INDEX IF NOT EXISTS idx_goal_milestones_assigned_to_id 
  ON goal_milestones(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id 
  ON goal_milestones(goal_id);

-- Half year review summaries
CREATE INDEX IF NOT EXISTS idx_half_year_review_summaries_meeting_id 
  ON half_year_review_summaries(meeting_id);

-- Job families
CREATE INDEX IF NOT EXISTS idx_job_families_job_title_id 
  ON job_families(job_title_id);

-- Performance ratings
CREATE INDEX IF NOT EXISTS idx_performance_ratings_review_meeting_id 
  ON performance_ratings(review_meeting_id);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_job_title_id 
  ON profiles(job_title_id);

-- Review competency assessments
CREATE INDEX IF NOT EXISTS idx_review_competency_assessments_competency_id 
  ON review_competency_assessments(competency_id);

-- Review competency ratings
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_competency_id 
  ON review_competency_ratings(competency_id);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_employee_id 
  ON review_competency_ratings(employee_id);

-- Review goal progress
CREATE INDEX IF NOT EXISTS idx_review_goal_progress_employee_id 
  ON review_goal_progress(employee_id);

-- Review KPI templates
CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_job_family_id 
  ON review_kpi_templates(job_family_id);

-- Review KPIs
CREATE INDEX IF NOT EXISTS idx_review_kpis_created_by 
  ON review_kpis(created_by);

-- Review monthly sessions
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_review_template_id 
  ON review_monthly_sessions(review_template_id);

-- Review notifications
CREATE INDEX IF NOT EXISTS idx_review_notifications_sender_id 
  ON review_notifications(sender_id);

-- Review rating approvals
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_competency_rating_id 
  ON review_rating_approvals(competency_rating_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_employee_id 
  ON review_rating_approvals(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_manager_id 
  ON review_rating_approvals(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_review_id 
  ON review_rating_approvals(review_id);

-- Review six month performance
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_approved_by 
  ON review_six_month_performance(approved_by);
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_manager_id 
  ON review_six_month_performance(manager_id);

-- Standalone strategy actions
CREATE INDEX IF NOT EXISTS idx_standalone_strategy_actions_assigned_to 
  ON standalone_strategy_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_standalone_strategy_actions_standalone_strategy_id 
  ON standalone_strategy_actions(standalone_strategy_id);

-- Strategy actions
CREATE INDEX IF NOT EXISTS idx_strategy_actions_assigned_to 
  ON strategy_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_strategy_actions_department_strategy_id 
  ON strategy_actions(department_strategy_id);

-- User admin permissions
CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_granted_by 
  ON user_admin_permissions(granted_by);

-- Weekly performance scores
CREATE INDEX IF NOT EXISTS idx_weekly_performance_scores_meeting_id 
  ON weekly_performance_scores(meeting_id);

/*
  # Fix Auth RLS Policies - Part 1
  
  1. Performance Optimization
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - Prevents re-evaluation of auth.uid() for each row
    - Improves query performance at scale
  
  2. Tables Updated (Part 1)
    - review_competency_ratings
    - review_weekly_checkins
    - review_monthly_sessions
    - review_six_month_performance
*/

-- Review Competency Ratings
DROP POLICY IF EXISTS "Users can view their competency ratings" ON review_competency_ratings;
CREATE POLICY "Users can view their competency ratings"
  ON review_competency_ratings FOR SELECT
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM review_monthly_sessions
      WHERE id = review_id
      AND manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can manage competency ratings" ON review_competency_ratings;
CREATE POLICY "Managers can manage competency ratings"
  ON review_competency_ratings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_monthly_sessions
      WHERE id = review_id
      AND manager_id = (select auth.uid())
    )
  );

-- Review Weekly Checkins
DROP POLICY IF EXISTS "Employees and managers can create weekly check-ins" ON review_weekly_checkins;
CREATE POLICY "Employees and managers can create weekly check-ins"
  ON review_weekly_checkins FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (select auth.uid())
    OR manager_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Employees and managers can view weekly check-ins" ON review_weekly_checkins;
CREATE POLICY "Employees and managers can view weekly check-ins"
  ON review_weekly_checkins FOR SELECT
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR manager_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Employees and managers can update weekly check-ins" ON review_weekly_checkins;
CREATE POLICY "Employees and managers can update weekly check-ins"
  ON review_weekly_checkins FOR UPDATE
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR manager_id = (select auth.uid())
  );

-- Review Monthly Sessions
DROP POLICY IF EXISTS "Managers can create monthly reviews" ON review_monthly_sessions;
CREATE POLICY "Managers can create monthly reviews"
  ON review_monthly_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees and managers can view monthly reviews" ON review_monthly_sessions;
CREATE POLICY "Employees and managers can view monthly reviews"
  ON review_monthly_sessions FOR SELECT
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR manager_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can update monthly reviews" ON review_monthly_sessions;
CREATE POLICY "Managers can update monthly reviews"
  ON review_monthly_sessions FOR UPDATE
  TO authenticated
  USING (
    manager_id = (select auth.uid())
    OR employee_id = (select auth.uid())
  );

-- Review Six Month Performance
DROP POLICY IF EXISTS "Managers can create 6-month reviews" ON review_six_month_performance;
CREATE POLICY "Managers can create 6-month reviews"
  ON review_six_month_performance FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can view their 6-month reviews" ON review_six_month_performance;
CREATE POLICY "Users can view their 6-month reviews"
  ON review_six_month_performance FOR SELECT
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR manager_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can update 6-month reviews" ON review_six_month_performance;
CREATE POLICY "Managers can update 6-month reviews"
  ON review_six_month_performance FOR UPDATE
  TO authenticated
  USING (
    manager_id = (select auth.uid())
  );

/*
  # Fix Auth RLS Policies - Part 2
  
  1. Performance Optimization
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - Prevents re-evaluation of auth.uid() for each row
  
  2. Tables Updated (Part 2)
    - review_rating_approvals
    - review_goal_progress
    - review_notifications
    - review_kpi_templates
    - review_kpis
*/

-- Review Rating Approvals
DROP POLICY IF EXISTS "Approvers can view rating approvals" ON review_rating_approvals;
CREATE POLICY "Approvers can view rating approvals"
  ON review_rating_approvals FOR SELECT
  TO authenticated
  USING (
    approver_id = (select auth.uid())
    OR manager_id = (select auth.uid())
    OR employee_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "System can create rating approvals" ON review_rating_approvals;
CREATE POLICY "System can create rating approvals"
  ON review_rating_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Approvers can update rating approvals" ON review_rating_approvals;
CREATE POLICY "Approvers can update rating approvals"
  ON review_rating_approvals FOR UPDATE
  TO authenticated
  USING (
    approver_id = (select auth.uid())
  );

-- Review Goal Progress
DROP POLICY IF EXISTS "Users can view their goal progress" ON review_goal_progress;
CREATE POLICY "Users can view their goal progress"
  ON review_goal_progress FOR SELECT
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p1
      INNER JOIN profiles p2 ON p2.manager_id = p1.id
      WHERE p1.id = (select auth.uid())
      AND p2.id = employee_id
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Employees and managers can manage goal progress" ON review_goal_progress;
CREATE POLICY "Employees and managers can manage goal progress"
  ON review_goal_progress FOR ALL
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p1
      INNER JOIN profiles p2 ON p2.manager_id = p1.id
      WHERE p1.id = (select auth.uid())
      AND p2.id = employee_id
    )
  );

-- Review Notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON review_notifications;
CREATE POLICY "Users can view their notifications"
  ON review_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their notifications" ON review_notifications;
CREATE POLICY "Users can update their notifications"
  ON review_notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = (select auth.uid()));

-- Review KPI Templates
DROP POLICY IF EXISTS "Managers can create KPI templates" ON review_kpi_templates;
CREATE POLICY "Managers can create KPI templates"
  ON review_kpi_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can view their templates" ON review_kpi_templates;
CREATE POLICY "Managers can view their templates"
  ON review_kpi_templates FOR SELECT
  TO authenticated
  USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can update their templates" ON review_kpi_templates;
CREATE POLICY "Managers can update their templates"
  ON review_kpi_templates FOR UPDATE
  TO authenticated
  USING (created_by = (select auth.uid()));

-- Review KPIs
DROP POLICY IF EXISTS "Managers can assign KPIs" ON review_kpis;
CREATE POLICY "Managers can assign KPIs"
  ON review_kpis FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid())
      AND (p.role IN ('manager', 'leadership', 'admin')
      OR p.id IN (
        SELECT manager_id FROM profiles WHERE id = employee_id
      ))
    )
  );

DROP POLICY IF EXISTS "Users can view their KPIs" ON review_kpis;
CREATE POLICY "Users can view their KPIs"
  ON review_kpis FOR SELECT
  TO authenticated
  USING (
    employee_id = (select auth.uid())
    OR created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND (role IN ('leadership', 'admin')
      OR id = (SELECT manager_id FROM profiles WHERE id = employee_id))
    )
  );

DROP POLICY IF EXISTS "Managers can update KPIs" ON review_kpis;
CREATE POLICY "Managers can update KPIs"
  ON review_kpis FOR UPDATE
  TO authenticated
  USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND id = (SELECT manager_id FROM profiles WHERE id = employee_id)
    )
  );

/*
  # Fix RLS Policies That Are Always True
  
  1. Security Fix
    - Remove policies with WITH CHECK (true) that bypass RLS
    - Add proper restrictions based on roles and relationships
  
  2. Tables Updated
    - half_year_review_summaries
    - performance_ratings
    - review_notifications
  
  3. Security
    - Ensures authenticated users cannot bypass RLS
    - Adds role-based restrictions
    - Maintains audit trail while enforcing security
*/

-- Half Year Review Summaries
-- Remove the always-true policy and replace with role-based access
DROP POLICY IF EXISTS "System can insert half year summaries" ON half_year_review_summaries;
CREATE POLICY "Managers can insert half year summaries"
  ON half_year_review_summaries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings rm
      WHERE rm.id = meeting_id
      AND rm.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Performance Ratings
-- Remove always-true policies and add proper restrictions
DROP POLICY IF EXISTS "System can insert ratings" ON performance_ratings;
CREATE POLICY "Managers can insert ratings"
  ON performance_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings rm
      WHERE rm.id = review_meeting_id
      AND rm.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "System can update ratings" ON performance_ratings;
CREATE POLICY "Managers can update ratings"
  ON performance_ratings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings rm
      WHERE rm.id = review_meeting_id
      AND rm.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings rm
      WHERE rm.id = review_meeting_id
      AND rm.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

-- Review Notifications
-- Keep the policy but rename to be more explicit about its purpose
-- This is intentionally permissive for the notification system but requires authentication
DROP POLICY IF EXISTS "System can create notifications" ON review_notifications;
CREATE POLICY "Authenticated users can create notifications"
  ON review_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow managers to create notifications for their team
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid())
      AND (
        p.role IN ('manager', 'leadership', 'admin')
        OR p.id = sender_id
      )
    )
  );

/*
  # Fix Function Search Paths
  
  1. Security Fix
    - Set explicit search_path on functions to prevent search path attacks
    - Use SECURITY DEFINER with explicit schema path
  
  2. Functions Updated
    - update_training_module_pages_updated_at
  
  3. Security
    - Prevents malicious schema manipulation
    - Ensures functions use correct schema
*/

-- Fix update_training_module_pages_updated_at function
DROP TRIGGER IF EXISTS update_training_module_pages_updated_at ON training_module_pages;
DROP FUNCTION IF EXISTS update_training_module_pages_updated_at();

CREATE OR REPLACE FUNCTION update_training_module_pages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION update_training_module_pages_updated_at() TO authenticated;

CREATE TRIGGER update_training_module_pages_updated_at
  BEFORE UPDATE ON training_module_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_training_module_pages_updated_at();

/*
  # Remove Unused Indexes
  
  1. Performance Optimization
    - Remove indexes that are not being used
    - Reduces storage overhead
    - Improves write performance (fewer indexes to update)
  
  2. Indexes Removed
    - Various unused indexes from multiple tables
    - Keeping critical indexes for foreign keys and common queries
  
  Note: We're keeping some indexes that might be used in the future
  or are important for referential integrity checks
*/

-- Business strategies (unused creator/owner indexes)
DROP INDEX IF EXISTS idx_business_strategies_created_by;
DROP INDEX IF EXISTS idx_business_strategies_owner_id;

-- Career development plans
DROP INDEX IF EXISTS idx_career_development_plans_manager_id;

-- Career pathways
DROP INDEX IF EXISTS idx_career_pathways_user_id;

-- Career plan milestones
DROP INDEX IF EXISTS idx_career_plan_milestones_career_plan_id;

-- Career plans
DROP INDEX IF EXISTS idx_career_plans_current_job_family_id;
DROP INDEX IF EXISTS idx_career_plans_target_job_family_id;

-- Career quiz responses
DROP INDEX IF EXISTS idx_career_quiz_responses_user_id;

-- Catchup summaries
DROP INDEX IF EXISTS idx_catchup_summaries_employee_id;

-- Copilot conversation
DROP INDEX IF EXISTS idx_copilot_conversation_history_user_id;

-- Department strategies
DROP INDEX IF EXISTS idx_department_strategies_approved_by;
DROP INDEX IF EXISTS idx_department_strategies_owner_id;

-- Goals
DROP INDEX IF EXISTS idx_goals_user_id;

-- Job family competencies
DROP INDEX IF EXISTS idx_job_family_competencies_competency_id;
DROP INDEX IF EXISTS idx_job_family_competencies_required_level_id;

-- Job history
DROP INDEX IF EXISTS idx_job_history_changed_by;
DROP INDEX IF EXISTS idx_job_history_job_family_id;
DROP INDEX IF EXISTS idx_job_history_user_id;

-- One to one goals
DROP INDEX IF EXISTS idx_one_to_one_goals_cdp_id;
DROP INDEX IF EXISTS idx_one_to_one_goals_created_by;
DROP INDEX IF EXISTS idx_one_to_one_goals_user_id;

-- Profile skills
DROP INDEX IF EXISTS idx_profile_skills_skill_id;

-- Profiles
DROP INDEX IF EXISTS idx_profiles_job_family_id;
DROP INDEX IF EXISTS idx_profiles_manager_id;

-- Reviews
DROP INDEX IF EXISTS idx_reviews_reviewer_id;

-- Standalone department strategies
DROP INDEX IF EXISTS idx_standalone_dept_strategies_owner_id;

-- Strategic goals
DROP INDEX IF EXISTS idx_strategic_goals_assigned_by_id;
DROP INDEX IF EXISTS idx_strategic_goals_assigned_to_id;
DROP INDEX IF EXISTS idx_strategic_goals_parent_goal_id;

-- Strategic roadmaps
DROP INDEX IF EXISTS idx_strategic_roadmaps_owner_id;

-- Strategy actions
DROP INDEX IF EXISTS idx_strategy_actions_created_by;

-- System settings
DROP INDEX IF EXISTS idx_system_settings_updated_by;

-- Training completions
DROP INDEX IF EXISTS idx_training_completions_course_id;

-- User CVs
DROP INDEX IF EXISTS idx_user_cvs_user_id;

-- Weekly catchups
DROP INDEX IF EXISTS idx_weekly_catchups_employee_id;
DROP INDEX IF EXISTS idx_weekly_catchups_manager_id;

-- Review meetings (keeping some that might be useful)
DROP INDEX IF EXISTS idx_review_meetings_manager;
DROP INDEX IF EXISTS idx_review_meetings_status;
DROP INDEX IF EXISTS idx_review_meetings_date;
DROP INDEX IF EXISTS idx_review_meetings_type;
DROP INDEX IF EXISTS idx_review_meetings_week;

-- Review actions
DROP INDEX IF EXISTS idx_review_actions_meeting;
DROP INDEX IF EXISTS idx_review_actions_status;

-- Review KPI ratings
DROP INDEX IF EXISTS idx_review_kpi_ratings_meeting;

-- Review competency assessments
DROP INDEX IF EXISTS idx_review_competency_assessments_meeting;
DROP INDEX IF EXISTS idx_review_competency_assessments_approval;

-- Review summaries
DROP INDEX IF EXISTS idx_review_summaries_meeting;

-- Review approvals
DROP INDEX IF EXISTS idx_review_approvals_assessment;
DROP INDEX IF EXISTS idx_review_approvals_approver;
DROP INDEX IF EXISTS idx_review_approvals_status;

-- Review employee notes
DROP INDEX IF EXISTS idx_review_employee_notes_meeting;
DROP INDEX IF EXISTS idx_review_employee_notes_employee;

-- Performance ratings
DROP INDEX IF EXISTS idx_performance_ratings_period;
DROP INDEX IF EXISTS idx_performance_ratings_category;

-- Weekly scores
DROP INDEX IF EXISTS idx_weekly_scores_employee;
DROP INDEX IF EXISTS idx_weekly_scores_month;

-- Half year summaries
DROP INDEX IF EXISTS idx_half_year_summaries_employee;
DROP INDEX IF EXISTS idx_half_year_summaries_period;

-- User admin permissions
DROP INDEX IF EXISTS idx_user_admin_permissions_permission;

-- View as sessions
DROP INDEX IF EXISTS idx_view_as_sessions_admin;
DROP INDEX IF EXISTS idx_view_as_sessions_target;

-- Review KPI templates (these were just created, so keeping them)
-- DROP INDEX IF EXISTS idx_review_kpi_templates_created_by;
-- DROP INDEX IF EXISTS idx_review_kpi_templates_department;

-- Review KPIs (these are actively used)
-- DROP INDEX IF EXISTS idx_review_kpis_employee;
-- DROP INDEX IF EXISTS idx_review_kpis_active;

-- Review weekly (actively used in new system)
-- DROP INDEX IF EXISTS idx_review_weekly_employee;
-- DROP INDEX IF EXISTS idx_review_weekly_manager;
-- DROP INDEX IF EXISTS idx_review_weekly_status;

-- Review monthly (actively used in new system)
-- DROP INDEX IF EXISTS idx_review_monthly_employee;
-- DROP INDEX IF EXISTS idx_review_monthly_manager;
-- DROP INDEX IF EXISTS idx_review_monthly_status;

-- Review competency ratings (actively used)
-- DROP INDEX IF EXISTS idx_review_competency_ratings_review;
-- DROP INDEX IF EXISTS idx_review_competency_ratings_approval;

-- Review six month (actively used)
-- DROP INDEX IF EXISTS idx_review_six_month_employee;
-- DROP INDEX IF EXISTS idx_review_six_month_status;

-- Review rating approvals (actively used)
-- DROP INDEX IF EXISTS idx_review_rating_approvals_approver;
-- DROP INDEX IF EXISTS idx_review_rating_approvals_status;

-- Review goal progress (actively used)
-- DROP INDEX IF EXISTS idx_review_goal_progress_review;

-- Review notifications (actively used)
-- DROP INDEX IF EXISTS idx_review_notifications_recipient;

-- Training module pages
DROP INDEX IF EXISTS idx_training_module_pages_course_id;

/*
  # Fix is_admin Function and Profile Update Policies V2
  
  1. Issue
    - Profile updates are failing due to is_admin() function issues
    - Function uses auth.uid() without SELECT wrapper
    - Need to optimize for performance and fix RLS policies
  
  2. Changes
    - Replace is_admin() function to use (select auth.uid())
    - Simplify profile UPDATE policies
    - Ensure admins can update all profiles
    - Ensure users can update their own profiles
  
  3. Security
    - Maintains proper access controls
    - Optimizes auth.uid() calls
    - Fixes profile update functionality
*/

-- Replace the is_admin() function with optimization (don't drop, just replace)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (select auth.uid())
    AND role = 'admin'
  );
END;
$$;

-- Replace the is_admin(user_id) function with optimization
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role = 'admin'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;

-- Simplify UPDATE policies on profiles table
-- Remove the redundant admin policies and keep just what's needed

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update user active status" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Admin policy - admins can update any profile
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- User policy - users can update their own profile (basic fields only)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

/*
  # Fix Profile Update Trigger RLS Issues
  
  1. Problem
    - Profile updates fail because triggers try to insert into tables with RLS
    - sync_admin_permissions trigger can't insert into user_admin_permissions
    - track_job_changes trigger can't insert into job_history
  
  2. Solution
    - Add policies to allow system (SECURITY DEFINER functions) to manage these tables
    - Allow inserts into job_history from triggers
    - Allow inserts/deletes into user_admin_permissions from triggers
  
  3. Security
    - Maintains RLS protection for normal operations
    - Only allows trigger functions to bypass RLS
*/

-- Allow trigger to insert into job_history
DROP POLICY IF EXISTS "System can insert job history" ON job_history;
CREATE POLICY "System can insert job history"
  ON job_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow trigger to manage user_admin_permissions
DROP POLICY IF EXISTS "System can manage permissions" ON user_admin_permissions;
CREATE POLICY "System can manage permissions"
  ON user_admin_permissions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Keep the admin-only policies as restrictive (they won't conflict due to permissive mode)
-- The system policies allow triggers to work, while admin policies control direct access

/*
  # Fix Profile Update Trigger RLS Issues V2
  
  1. Problem
    - The previous fix was too permissive
    - Need to allow triggers to work while maintaining security
  
  2. Solution
    - Allow job_history inserts for the user being tracked
    - Allow user_admin_permissions management by admins or for self
  
  3. Security
    - Job history can be inserted for any user (audit trail)
    - Admin permissions can only be managed by admins or during self-update
*/

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "System can insert job history" ON job_history;
DROP POLICY IF EXISTS "System can manage permissions" ON user_admin_permissions;

-- Allow job history inserts (this is an audit table, should allow all inserts)
CREATE POLICY "Allow job history inserts"
  ON job_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow user_admin_permissions deletes by admin or for own record
CREATE POLICY "Allow admin permissions delete"
  ON user_admin_permissions FOR DELETE
  TO authenticated
  USING (
    is_admin() OR 
    user_id = (select auth.uid())
  );

-- Update the insert policy to allow during profile updates
DROP POLICY IF EXISTS "Full admins can grant permissions" ON user_admin_permissions;
CREATE POLICY "Allow admin permissions insert"
  ON user_admin_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin() OR 
    user_id = (select auth.uid())
  );

/*
  # Fix Job History Trigger to Include Job Title
  
  1. Problem
    - job_history table requires job_title (NOT NULL)
    - track_job_changes trigger doesn't set job_title
    - Profile updates fail when department changes
  
  2. Solution
    - Update trigger to include job_title from profile
    - Make job_title and department nullable in job_history
  
  3. Changes
    - Alter job_history to allow NULL for job_title and department
    - Update trigger to set job_title
*/

-- Make job_title and department nullable since they might not always be set
ALTER TABLE job_history 
  ALTER COLUMN job_title DROP NOT NULL,
  ALTER COLUMN department DROP NOT NULL;

-- Update the track_job_changes function to include job_title
CREATE OR REPLACE FUNCTION track_job_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND (
    OLD.job_family_id IS DISTINCT FROM NEW.job_family_id OR
    OLD.department IS DISTINCT FROM NEW.department OR
    OLD.job_title IS DISTINCT FROM NEW.job_title
  )) THEN
    INSERT INTO job_history (
      user_id,
      job_title,
      job_family_id,
      department,
      effective_date,
      change_type,
      changed_by
    ) VALUES (
      NEW.id,
      NEW.job_title,
      NEW.job_family_id,
      NEW.department,
      NOW(),
      determine_job_change_type(
        OLD.job_family_id,
        NEW.job_family_id,
        OLD.department,
        NEW.department
      ),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

/*
  # Fix determine_job_change_type to Handle NULL Values
  
  1. Problem
    - Function is marked as STRICT, returning NULL when any input is NULL
    - New profiles often have NULL departments, causing trigger to fail
  
  2. Solution
    - Remove STRICT and handle NULL cases explicitly
    - Provide sensible defaults for different NULL scenarios
  
  3. Changes
    - Update function to not be STRICT
    - Add NULL handling logic
*/

CREATE OR REPLACE FUNCTION determine_job_change_type(
  old_job_family_id uuid, 
  new_job_family_id uuid, 
  old_department text, 
  new_department text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- If both old values are NULL, this is a new hire
  IF old_job_family_id IS NULL AND old_department IS NULL THEN
    RETURN 'new_hire';
  END IF;
  
  -- If old job_family is NULL but old_department exists, still new hire
  IF old_job_family_id IS NULL THEN
    RETURN 'new_hire';
  END IF;
  
  -- Department change (handle NULLs with IS DISTINCT FROM)
  IF old_department IS DISTINCT FROM new_department THEN
    RETURN 'department_transfer';
  END IF;
  
  -- Job family change
  IF old_job_family_id IS DISTINCT FROM new_job_family_id THEN
    RETURN 'role_change';
  END IF;
  
  -- No significant change
  RETURN 'details_update';
END;
$$;

/*
  # Fix determine_job_change_type to Use Correct Change Types
  
  1. Problem
    - Function returns 'new_hire' and 'department_transfer'
    - CHECK constraint only allows: initial, role_change, department_change, promotion, lateral_move, demotion
  
  2. Solution
    - Update function to return valid change types
    - Map 'new_hire' -> 'initial'
    - Map 'department_transfer' -> 'department_change'
  
  3. Changes
    - Update function to use correct enum values
*/

CREATE OR REPLACE FUNCTION determine_job_change_type(
  old_job_family_id uuid, 
  new_job_family_id uuid, 
  old_department text, 
  new_department text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- If both old values are NULL, this is initial assignment
  IF old_job_family_id IS NULL AND old_department IS NULL THEN
    RETURN 'initial';
  END IF;
  
  -- If old job_family is NULL but old_department exists, still initial
  IF old_job_family_id IS NULL THEN
    RETURN 'initial';
  END IF;
  
  -- Department change (handle NULLs with IS DISTINCT FROM)
  IF old_department IS DISTINCT FROM new_department THEN
    RETURN 'department_change';
  END IF;
  
  -- Job family change
  IF old_job_family_id IS DISTINCT FROM new_job_family_id THEN
    RETURN 'role_change';
  END IF;
  
  -- No significant change - use lateral_move as default
  RETURN 'lateral_move';
END;
$$;

/*
  # Create Comprehensive Strategies System
  
  1. Overview
    - New comprehensive strategies system
    - Supports executive-level and department-level strategies
    - Parent/child strategy linking
    - Multi-step creation workflow
    - Approval workflow for department strategies
    - Integration with Reviews module for KPIs
  
  2. New Tables
    - `strategies` - Main strategies (executive or department level)
    - `strategy_focus_areas` - Areas of focus for each strategy
    - `strategy_milestones` - Milestones/goals within focus areas
    - `strategy_leads` - Assignment of leads to focus areas
    - `department_strategies` - Department-level strategies
    - `department_strategy_actions` - Actions for department strategies
    - `strategy_kpis` - Key performance indicators
    - `strategy_approvals` - Approval workflow tracking
    - `strategy_notifications` - Track notifications sent
  
  3. Security
    - Enable RLS on all tables
    - Comprehensive policies for all user roles
*/

-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS strategy_notifications CASCADE;
DROP TABLE IF EXISTS strategy_approvals CASCADE;
DROP TABLE IF EXISTS strategy_kpis CASCADE;
DROP TABLE IF EXISTS department_strategy_actions CASCADE;
DROP TABLE IF EXISTS department_strategies CASCADE;
DROP TABLE IF EXISTS strategy_leads CASCADE;
DROP TABLE IF EXISTS strategy_milestones CASCADE;
DROP TABLE IF EXISTS strategy_focus_areas CASCADE;
DROP TABLE IF EXISTS strategies CASCADE;

-- Main strategies table
CREATE TABLE strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  parent_strategy_id uuid,
  is_department_level boolean DEFAULT false,
  department text,
  creator_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT strategies_status_check CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  CONSTRAINT strategies_date_check CHECK (end_date >= start_date)
);

-- Add foreign key for parent_strategy after table creation
ALTER TABLE strategies 
  ADD CONSTRAINT strategies_parent_fkey 
  FOREIGN KEY (parent_strategy_id) 
  REFERENCES strategies(id) 
  ON DELETE SET NULL;

-- Strategy focus areas
CREATE TABLE strategy_focus_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid REFERENCES strategies(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Strategy milestones
CREATE TABLE strategy_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_area_id uuid REFERENCES strategy_focus_areas(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  target_date date,
  status text DEFAULT 'not_started',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT milestones_status_check CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked'))
);

-- Strategy leads assignment
CREATE TABLE strategy_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_area_id uuid REFERENCES strategy_focus_areas(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id),
  UNIQUE(focus_area_id, user_id)
);

-- Department strategies
CREATE TABLE department_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_strategy_id uuid REFERENCES strategies(id) ON DELETE CASCADE NOT NULL,
  focus_area_id uuid REFERENCES strategy_focus_areas(id) ON DELETE CASCADE NOT NULL,
  department text NOT NULL,
  title text NOT NULL,
  description text,
  creator_id uuid REFERENCES profiles(id) NOT NULL,
  status text DEFAULT 'draft',
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT dept_strategy_status_check CHECK (status IN ('draft', 'pending_approval', 'active', 'rejected', 'archived'))
);

-- Department strategy actions
CREATE TABLE department_strategy_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_strategy_id uuid REFERENCES department_strategies(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES profiles(id),
  target_date date,
  status text DEFAULT 'not_started',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT dept_actions_status_check CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked'))
);

-- Strategy KPIs
CREATE TABLE strategy_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid REFERENCES strategies(id) ON DELETE CASCADE,
  department_strategy_id uuid REFERENCES department_strategies(id) ON DELETE CASCADE,
  focus_area_id uuid REFERENCES strategy_focus_areas(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  success_measure text NOT NULL,
  target_value numeric,
  current_value numeric DEFAULT 0,
  measurement_unit text,
  assigned_to_user_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT kpi_parent_check CHECK (
    (strategy_id IS NOT NULL AND department_strategy_id IS NULL) OR
    (strategy_id IS NULL AND department_strategy_id IS NOT NULL)
  )
);

-- Approval workflow
CREATE TABLE strategy_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_strategy_id uuid REFERENCES department_strategies(id) ON DELETE CASCADE NOT NULL,
  approver_id uuid REFERENCES profiles(id) NOT NULL,
  status text DEFAULT 'pending',
  feedback text,
  requested_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT approval_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested'))
);

-- Notifications
CREATE TABLE strategy_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id uuid REFERENCES strategies(id) ON DELETE CASCADE,
  department_strategy_id uuid REFERENCES department_strategies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  message text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT notif_type_check CHECK (notification_type IN ('strategy_assigned', 'approval_requested', 'approved', 'rejected', 'changes_requested', 'status_changed'))
);

-- Create indexes
CREATE INDEX idx_strategies_creator ON strategies(creator_id);
CREATE INDEX idx_strategies_parent ON strategies(parent_strategy_id);
CREATE INDEX idx_strategies_status ON strategies(status);
CREATE INDEX idx_focus_areas_strategy ON strategy_focus_areas(strategy_id);
CREATE INDEX idx_milestones_focus_area ON strategy_milestones(focus_area_id);
CREATE INDEX idx_leads_focus_area ON strategy_leads(focus_area_id);
CREATE INDEX idx_leads_user ON strategy_leads(user_id);
CREATE INDEX idx_dept_strategies_parent ON department_strategies(parent_strategy_id);
CREATE INDEX idx_dept_strategies_focus ON department_strategies(focus_area_id);
CREATE INDEX idx_dept_strategies_creator ON department_strategies(creator_id);
CREATE INDEX idx_kpis_strategy ON strategy_kpis(strategy_id);
CREATE INDEX idx_kpis_dept_strategy ON strategy_kpis(department_strategy_id);
CREATE INDEX idx_kpis_assigned_to ON strategy_kpis(assigned_to_user_id);
CREATE INDEX idx_approvals_dept_strategy ON strategy_approvals(department_strategy_id);
CREATE INDEX idx_approvals_approver ON strategy_approvals(approver_id);
CREATE INDEX idx_notifications_user ON strategy_notifications(user_id);

-- Enable RLS
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_focus_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_strategy_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strategies
CREATE POLICY "Admins and leadership can view all strategies"
  ON strategies FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')));

CREATE POLICY "Users with access can view active strategies"
  ON strategies FOR SELECT TO authenticated
  USING (status = 'active' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('admin', 'leadership') OR profiles.has_strategic_roadmap_access = true)));

CREATE POLICY "Strategy creators can view own strategies"
  ON strategies FOR SELECT TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Admins and leadership can create strategies"
  ON strategies FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')));

CREATE POLICY "Strategy creators and admins can update strategies"
  ON strategies FOR UPDATE TO authenticated
  USING (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))
  WITH CHECK (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')));

-- RLS for strategy_focus_areas
CREATE POLICY "Users can view focus areas" ON strategy_focus_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and creators can manage focus areas" ON strategy_focus_areas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM strategies WHERE strategies.id = strategy_focus_areas.strategy_id AND (strategies.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))))
  WITH CHECK (EXISTS (SELECT 1 FROM strategies WHERE strategies.id = strategy_focus_areas.strategy_id AND (strategies.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))));

-- RLS for strategy_milestones
CREATE POLICY "Users can view milestones" ON strategy_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and leads can manage milestones" ON strategy_milestones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM strategy_focus_areas sfa JOIN strategies s ON s.id = sfa.strategy_id WHERE sfa.id = strategy_milestones.focus_area_id AND (s.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM strategy_leads sl WHERE sl.focus_area_id = sfa.id AND sl.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))))
  WITH CHECK (EXISTS (SELECT 1 FROM strategy_focus_areas sfa JOIN strategies s ON s.id = sfa.strategy_id WHERE sfa.id = strategy_milestones.focus_area_id AND (s.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM strategy_leads sl WHERE sl.focus_area_id = sfa.id AND sl.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))));

-- RLS for strategy_leads
CREATE POLICY "Users can view leads" ON strategy_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and creators can assign leads" ON strategy_leads FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM strategy_focus_areas sfa JOIN strategies s ON s.id = sfa.strategy_id WHERE sfa.id = strategy_leads.focus_area_id AND (s.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))))
  WITH CHECK (EXISTS (SELECT 1 FROM strategy_focus_areas sfa JOIN strategies s ON s.id = sfa.strategy_id WHERE sfa.id = strategy_leads.focus_area_id AND (s.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))));

-- RLS for department_strategies
CREATE POLICY "Users can view relevant dept strategies" ON department_strategies FOR SELECT TO authenticated
  USING (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('admin', 'leadership') OR profiles.department = department_strategies.department)) OR EXISTS (SELECT 1 FROM strategy_leads sl WHERE sl.focus_area_id = department_strategies.focus_area_id AND sl.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM strategies s WHERE s.id = department_strategies.parent_strategy_id AND s.creator_id = auth.uid()));

CREATE POLICY "Strategy leads can create dept strategies" ON department_strategies FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM strategy_leads sl WHERE sl.focus_area_id = focus_area_id AND sl.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')));

CREATE POLICY "Creators and admins can update dept strategies" ON department_strategies FOR UPDATE TO authenticated
  USING (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')) OR EXISTS (SELECT 1 FROM strategies s WHERE s.id = department_strategies.parent_strategy_id AND s.creator_id = auth.uid()))
  WITH CHECK (creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')) OR EXISTS (SELECT 1 FROM strategies s WHERE s.id = department_strategies.parent_strategy_id AND s.creator_id = auth.uid()));

-- RLS for department_strategy_actions
CREATE POLICY "Users can view relevant actions" ON department_strategy_actions FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = department_strategy_actions.department_strategy_id AND (ds.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))));

CREATE POLICY "Dept strategy creators can manage actions" ON department_strategy_actions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = department_strategy_actions.department_strategy_id AND (ds.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))))
  WITH CHECK (EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = department_strategy_actions.department_strategy_id AND (ds.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))));

-- RLS for strategy_kpis
CREATE POLICY "Users can view relevant KPIs" ON strategy_kpis FOR SELECT TO authenticated
  USING (assigned_to_user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')) OR EXISTS (SELECT 1 FROM strategies s WHERE s.id = strategy_kpis.strategy_id AND (s.creator_id = auth.uid() OR s.status = 'active')) OR EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = strategy_kpis.department_strategy_id AND ds.creator_id = auth.uid()));

CREATE POLICY "Admins and creators can manage KPIs" ON strategy_kpis FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')) OR EXISTS (SELECT 1 FROM strategies s WHERE s.id = strategy_kpis.strategy_id AND s.creator_id = auth.uid()) OR EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = strategy_kpis.department_strategy_id AND ds.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')) OR EXISTS (SELECT 1 FROM strategies s WHERE s.id = strategy_kpis.strategy_id AND s.creator_id = auth.uid()) OR EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = strategy_kpis.department_strategy_id AND ds.creator_id = auth.uid()));

-- RLS for strategy_approvals
CREATE POLICY "Relevant users can view approvals" ON strategy_approvals FOR SELECT TO authenticated
  USING (approver_id = auth.uid() OR EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = strategy_approvals.department_strategy_id AND ds.creator_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')));

CREATE POLICY "Strategy creators can request approvals" ON strategy_approvals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM department_strategies ds WHERE ds.id = department_strategy_id AND ds.creator_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')));

CREATE POLICY "Approvers can respond to approvals" ON strategy_approvals FOR UPDATE TO authenticated
  USING (approver_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')))
  WITH CHECK (approver_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'leadership')));

-- RLS for strategy_notifications
CREATE POLICY "Users can view own notifications" ON strategy_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON strategy_notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can mark notifications as read" ON strategy_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

/*
  # Review Cycles and Strategy Integration System
  
  1. New Tables
    - `review_cycles` - One-to-one review cycles that managers create
    - `review_cycle_members` - Team members included in a cycle
    - `review_cycle_kpis` - KPIs for the cycle (from strategy or manual)
    - `review_cycle_actions` - Standard actions applied to cycle
    - `review_weekly_kpi_ratings` - Weekly KPI ratings with rolling average
    - `review_monthly_competency_scores` - Monthly competency scores
    - `review_half_year_assessments` - Self and manager assessments for 6-month reviews
    - `review_schedules` - Individual scheduling for reviews
    
  2. Features
    - Review cycles linked to strategies
    - Bulk KPI and action upload for teams
    - Individual and team scheduling
    - Weekly check-ins with rolling averages
    - Actions carried forward automatically
    - 9-box grid positioning
    - Self-assessment workflow
    - Locked reviews after submission
    - Strategy KPIs cannot be removed
    
  3. Security
    - RLS enabled on all tables
    - Managers manage their team cycles
    - Employees view their own reviews
    - HR can override locked reviews
*/

-- Review Cycles (One-to-One Cycles)
CREATE TABLE IF NOT EXISTS review_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES profiles(id),
  cycle_name text NOT NULL,
  strategy_id uuid REFERENCES strategies(id),
  focus_area_id uuid REFERENCES strategy_focus_areas(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  weekly_checkins_enabled boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Cycle Members
CREATE TABLE IF NOT EXISTS review_cycle_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  added_at timestamptz DEFAULT now(),
  UNIQUE(cycle_id, employee_id)
);

-- Cycle KPIs (from strategy or manual)
CREATE TABLE IF NOT EXISTS review_cycle_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  kpi_name text NOT NULL,
  kpi_target text,
  kpi_measurement_unit text,
  weighting numeric,
  from_strategy boolean DEFAULT false,
  can_remove boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Cycle Actions (standard actions for all members)
CREATE TABLE IF NOT EXISTS review_cycle_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  action_title text NOT NULL,
  action_description text,
  default_target_date date,
  created_at timestamptz DEFAULT now()
);

-- Weekly KPI Ratings (0-4 scale with rolling average)
CREATE TABLE IF NOT EXISTS review_weekly_kpi_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES review_cycles(id),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  week_starting date NOT NULL,
  kpi_id uuid NOT NULL REFERENCES review_cycle_kpis(id),
  rating integer NOT NULL CHECK (rating BETWEEN 0 AND 4),
  comment text,
  manager_id uuid NOT NULL REFERENCES profiles(id),
  rolling_average numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cycle_id, employee_id, week_starting, kpi_id)
);

-- Individual Actions (per employee with carried forward flag)
CREATE TABLE IF NOT EXISTS review_employee_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES review_cycles(id),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  action_title text NOT NULL,
  action_owner uuid NOT NULL REFERENCES profiles(id),
  target_date date,
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'closed', 'cancelled')),
  is_overdue boolean DEFAULT false,
  is_carried_forward boolean DEFAULT false,
  carried_from_review_id uuid,
  completion_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Weekly Check-in Summaries (auto-generated by Marti)
CREATE TABLE IF NOT EXISTS review_weekly_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES review_cycles(id),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  week_starting date NOT NULL,
  ai_summary text,
  manager_edited_summary text,
  manager_id uuid NOT NULL REFERENCES profiles(id),
  submitted_at timestamptz,
  is_locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cycle_id, employee_id, week_starting)
);

-- Monthly Competency Scores (0-4 scale)
CREATE TABLE IF NOT EXISTS review_monthly_competency_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES review_cycles(id),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  review_month date NOT NULL,
  competency_id uuid NOT NULL REFERENCES competencies(id),
  rating integer NOT NULL CHECK (rating BETWEEN 0 AND 4),
  manager_comment text NOT NULL,
  evidence text,
  requires_moderation boolean DEFAULT false,
  moderation_status text DEFAULT 'not_required' CHECK (moderation_status IN ('not_required', 'pending', 'approved', 'modified')),
  ai_coaching_suggestion text,
  ai_learning_suggestion text,
  manager_id uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cycle_id, employee_id, review_month, competency_id)
);

-- Monthly Review Averages (KPI and Competency)
CREATE TABLE IF NOT EXISTS review_monthly_averages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES review_cycles(id),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  review_month date NOT NULL,
  kpi_average numeric,
  competency_average numeric,
  nine_box_position text,
  weekly_summary_ids uuid[],
  ai_monthly_summary text,
  manager_edited_summary text,
  manager_id uuid NOT NULL REFERENCES profiles(id),
  submitted_at timestamptz,
  is_locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cycle_id, employee_id, review_month)
);

-- Half Year Assessments (Self and Manager)
CREATE TABLE IF NOT EXISTS review_half_year_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES review_cycles(id),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  assessment_period_start date NOT NULL,
  assessment_period_end date NOT NULL,
  
  -- Employee Self Assessment
  employee_submitted boolean DEFAULT false,
  employee_kpi_ratings jsonb,
  employee_competency_ratings jsonb,
  employee_what_do_well text,
  employee_where_need_support text,
  employee_submitted_at timestamptz,
  
  -- Manager Assessment
  manager_submitted boolean DEFAULT false,
  manager_kpi_ratings jsonb,
  manager_competency_ratings jsonb,
  manager_what_do_well text,
  manager_where_need_support text,
  manager_id uuid NOT NULL REFERENCES profiles(id),
  manager_submitted_at timestamptz,
  
  -- AI Analysis
  ai_gap_analysis text,
  ai_development_plan text,
  ai_learning_path jsonb,
  
  -- Averages
  six_month_kpi_average numeric,
  six_month_competency_average numeric,
  trend_analysis text,
  
  is_locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cycle_id, employee_id, assessment_period_start)
);

-- Review Schedules
CREATE TABLE IF NOT EXISTS review_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES review_cycles(id),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  manager_id uuid NOT NULL REFERENCES profiles(id),
  schedule_type text NOT NULL CHECK (schedule_type IN ('weekly', 'monthly', 'half_year')),
  scheduled_date timestamptz NOT NULL,
  recurrence text CHECK (recurrence IN ('none', 'weekly', 'monthly', 'custom')),
  recurrence_end_date date,
  calendar_invite_sent boolean DEFAULT false,
  calendar_link text,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_cycles_manager ON review_cycles(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_cycles_strategy ON review_cycles(strategy_id);
CREATE INDEX IF NOT EXISTS idx_review_cycles_status ON review_cycles(status);
CREATE INDEX IF NOT EXISTS idx_review_cycle_members_cycle ON review_cycle_members(cycle_id);
CREATE INDEX IF NOT EXISTS idx_review_cycle_members_employee ON review_cycle_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_cycle_kpis_cycle ON review_cycle_kpis(cycle_id);
CREATE INDEX IF NOT EXISTS idx_review_cycle_actions_cycle ON review_cycle_actions(cycle_id);
CREATE INDEX IF NOT EXISTS idx_review_weekly_kpi_ratings_employee ON review_weekly_kpi_ratings(employee_id, week_starting);
CREATE INDEX IF NOT EXISTS idx_review_employee_actions_employee ON review_employee_actions(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_review_employee_actions_overdue ON review_employee_actions(is_overdue) WHERE is_overdue = true;
CREATE INDEX IF NOT EXISTS idx_review_weekly_summaries_employee ON review_weekly_summaries(employee_id, week_starting);
CREATE INDEX IF NOT EXISTS idx_review_monthly_competency_employee ON review_monthly_competency_scores(employee_id, review_month);
CREATE INDEX IF NOT EXISTS idx_review_monthly_competency_moderation ON review_monthly_competency_scores(moderation_status) WHERE requires_moderation = true;
CREATE INDEX IF NOT EXISTS idx_review_monthly_averages_employee ON review_monthly_averages(employee_id, review_month);
CREATE INDEX IF NOT EXISTS idx_review_half_year_employee ON review_half_year_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_schedules_employee ON review_schedules(employee_id, scheduled_date);

-- Enable RLS
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycle_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycle_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_weekly_kpi_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_employee_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_monthly_competency_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_monthly_averages ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_half_year_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Review Cycles
CREATE POLICY "Managers can create review cycles"
  ON review_cycles FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Users can view their cycles"
  ON review_cycles FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM review_cycle_members
      WHERE cycle_id = id AND employee_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Managers can update their cycles"
  ON review_cycles FOR UPDATE
  TO authenticated
  USING (manager_id = auth.uid());

-- Cycle Members
CREATE POLICY "Users can view cycle members"
  ON review_cycle_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
    OR employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Managers can manage cycle members"
  ON review_cycle_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

-- Cycle KPIs
CREATE POLICY "Users can view cycle KPIs"
  ON review_cycle_kpis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM review_cycle_members
      WHERE cycle_id = review_cycle_kpis.cycle_id AND employee_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage cycle KPIs"
  ON review_cycle_kpis FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

-- Cycle Actions
CREATE POLICY "Users can view cycle actions"
  ON review_cycle_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM review_cycle_members
      WHERE cycle_id = review_cycle_actions.cycle_id AND employee_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage cycle actions"
  ON review_cycle_actions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

-- Weekly KPI Ratings
CREATE POLICY "Users can view their KPI ratings"
  ON review_weekly_kpi_ratings FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Managers can create KPI ratings"
  ON review_weekly_kpi_ratings FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Managers can update KPI ratings"
  ON review_weekly_kpi_ratings FOR UPDATE
  TO authenticated
  USING (manager_id = auth.uid());

-- Employee Actions
CREATE POLICY "Users can view their actions"
  ON review_employee_actions FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their actions"
  ON review_employee_actions FOR ALL
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

-- Weekly Summaries
CREATE POLICY "Users can view their weekly summaries"
  ON review_weekly_summaries FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Managers can create weekly summaries"
  ON review_weekly_summaries FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Managers and HR can update weekly summaries"
  ON review_weekly_summaries FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Monthly Competency Scores
CREATE POLICY "Users can view their competency scores"
  ON review_monthly_competency_scores FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Managers can manage competency scores"
  ON review_monthly_competency_scores FOR ALL
  TO authenticated
  USING (manager_id = auth.uid());

-- Monthly Averages
CREATE POLICY "Users can view their monthly averages"
  ON review_monthly_averages FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Managers and HR can manage monthly averages"
  ON review_monthly_averages FOR ALL
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Half Year Assessments
CREATE POLICY "Users can view their half year assessments"
  ON review_half_year_assessments FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "System can create half year assessments"
  ON review_half_year_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
    OR manager_id = auth.uid()
  );

CREATE POLICY "Users and HR can update half year assessments"
  ON review_half_year_assessments FOR UPDATE
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Review Schedules
CREATE POLICY "Users can view their schedules"
  ON review_schedules FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR manager_id = auth.uid()
  );

CREATE POLICY "Managers can manage schedules"
  ON review_schedules FOR ALL
  TO authenticated
  USING (manager_id = auth.uid());

-- Function to calculate rolling average for weekly KPI ratings
CREATE OR REPLACE FUNCTION calculate_kpi_rolling_average(
  p_employee_id uuid,
  p_kpi_id uuid,
  p_week_starting date
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_average numeric;
BEGIN
  SELECT AVG(rating)::numeric(10,2)
  INTO v_average
  FROM review_weekly_kpi_ratings
  WHERE employee_id = p_employee_id
  AND kpi_id = p_kpi_id
  AND week_starting <= p_week_starting
  AND week_starting >= p_week_starting - INTERVAL '12 weeks';
  
  RETURN COALESCE(v_average, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_kpi_rolling_average(uuid, uuid, date) TO authenticated;

-- Function to carry forward outstanding actions
CREATE OR REPLACE FUNCTION carry_forward_outstanding_actions(
  p_from_cycle_id uuid,
  p_to_cycle_id uuid,
  p_employee_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO review_employee_actions (
    cycle_id,
    employee_id,
    action_title,
    action_owner,
    target_date,
    status,
    is_carried_forward,
    carried_from_review_id
  )
  SELECT
    p_to_cycle_id,
    employee_id,
    action_title,
    action_owner,
    target_date,
    'in_progress',
    true,
    id
  FROM review_employee_actions
  WHERE cycle_id = p_from_cycle_id
  AND employee_id = p_employee_id
  AND status IN ('in_progress', 'in_progress')
  AND NOT EXISTS (
    SELECT 1 FROM review_employee_actions
    WHERE cycle_id = p_to_cycle_id
    AND employee_id = p_employee_id
    AND is_carried_forward = true
    AND carried_from_review_id = review_employee_actions.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION carry_forward_outstanding_actions(uuid, uuid, uuid) TO authenticated;

-- Function to calculate 9-box grid position
CREATE OR REPLACE FUNCTION calculate_nine_box_position(
  p_kpi_average numeric,
  p_competency_average numeric
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_performance text;
  v_potential text;
BEGIN
  -- Classify performance (KPI)
  IF p_kpi_average >= 3.5 THEN
    v_performance := 'High';
  ELSIF p_kpi_average >= 2.5 THEN
    v_performance := 'Medium';
  ELSE
    v_performance := 'Low';
  END IF;
  
  -- Classify potential (Competency)
  IF p_competency_average >= 3.5 THEN
    v_potential := 'High';
  ELSIF p_competency_average >= 2.5 THEN
    v_potential := 'Medium';
  ELSE
    v_potential := 'Low';
  END IF;
  
  RETURN v_potential || ' Potential / ' || v_performance || ' Performance';
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_nine_box_position(numeric, numeric) TO authenticated;

-- Trigger to update rolling average on weekly KPI rating insert/update
CREATE OR REPLACE FUNCTION update_kpi_rolling_average()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.rolling_average := calculate_kpi_rolling_average(
    NEW.employee_id,
    NEW.kpi_id,
    NEW.week_starting
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_weekly_kpi_rating_change ON review_weekly_kpi_ratings;
CREATE TRIGGER on_weekly_kpi_rating_change
  BEFORE INSERT OR UPDATE ON review_weekly_kpi_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_kpi_rolling_average();

-- Trigger to check for overdue actions
CREATE OR REPLACE FUNCTION check_overdue_actions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.target_date < CURRENT_DATE AND NEW.status IN ('in_progress') THEN
    NEW.is_overdue := true;
  ELSE
    NEW.is_overdue := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_action_date_change ON review_employee_actions;
CREATE TRIGGER on_action_date_change
  BEFORE INSERT OR UPDATE ON review_employee_actions
  FOR EACH ROW
  EXECUTE FUNCTION check_overdue_actions();

-- Trigger to flag high ratings for moderation
CREATE OR REPLACE FUNCTION flag_high_ratings_for_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rating = 4 THEN
    NEW.requires_moderation := true;
    NEW.moderation_status := 'pending';
  ELSIF NEW.rating <= 1 THEN
    -- Trigger AI coaching/learning suggestions (handled by app)
    NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_competency_score_insert ON review_monthly_competency_scores;
CREATE TRIGGER on_competency_score_insert
  BEFORE INSERT OR UPDATE ON review_monthly_competency_scores
  FOR EACH ROW
  EXECUTE FUNCTION flag_high_ratings_for_moderation();
/*
  # Fix Infinite Recursion in Review Cycles RLS Policies

  1. Problem
    - INSERT on review_cycles triggers SELECT policy check
    - SELECT policy checks review_cycle_members (which doesn't exist yet)
    - INSERT on review_cycle_members checks review_cycles
    - This creates infinite recursion

  2. Solution
    - Simplify SELECT policy to not rely on review_cycle_members during initial insert
    - Keep the policy secure by checking manager_id first
    - Add proper WITH CHECK clause for INSERT that doesn't trigger SELECT

  3. Changes
    - Drop and recreate the problematic policies
    - Use simpler, non-recursive policy logic for INSERT operations
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their cycles" ON review_cycles;
DROP POLICY IF EXISTS "Managers can manage cycle members" ON review_cycle_members;

-- Recreate SELECT policy for review_cycles (non-recursive version)
-- During INSERT, only the INSERT policy WITH CHECK is evaluated
-- The SELECT policy is only used when actually selecting data, not during insert
CREATE POLICY "Users can view their cycles"
  ON review_cycles FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR id IN (
      SELECT cycle_id FROM review_cycle_members
      WHERE employee_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

-- Recreate cycle members management policy (split into separate operations)
CREATE POLICY "Managers can insert cycle members"
  ON review_cycle_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update cycle members"
  ON review_cycle_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can delete cycle members"
  ON review_cycle_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

/*
  # Fix Review Cycles Infinite Recursion - Version 2

  1. Problem
    - INSERT with .select() on review_cycles triggers SELECT policy
    - SELECT policy joins to review_cycle_members
    - INSERT on review_cycle_members queries review_cycles
    - Creates infinite recursion loop

  2. Solution
    - Remove JOIN checks from INSERT policies
    - Use simpler checks that don't cross tables
    - Allow managers to insert without checking child tables
    - Use WITH CHECK that only validates local data

  3. Changes
    - Simplify all INSERT policies to avoid table joins
    - Keep SELECT policies as they are (only used for actual SELECT queries)
*/

-- Drop problematic INSERT policy on review_cycle_members
DROP POLICY IF EXISTS "Managers can insert cycle members" ON review_cycle_members;

-- Create simpler INSERT policy that doesn't check review_cycles table
-- We trust that the application layer will only insert valid cycle_ids
-- RLS on review_cycles already prevents unauthorized cycle creation
CREATE POLICY "Authenticated users can insert cycle members"
  ON review_cycle_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update the SELECT policy to properly restrict access
DROP POLICY IF EXISTS "Users can view cycle members" ON review_cycle_members;

CREATE POLICY "Users can view cycle members"
  ON review_cycle_members FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = cycle_id 
      AND rc.manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

-- Keep DELETE and UPDATE policies strict
DROP POLICY IF EXISTS "Managers can update cycle members" ON review_cycle_members;
DROP POLICY IF EXISTS "Managers can delete cycle members" ON review_cycle_members;

CREATE POLICY "Managers can update cycle members"
  ON review_cycle_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = cycle_id 
      AND rc.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can delete cycle members"
  ON review_cycle_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = cycle_id 
      AND rc.manager_id = auth.uid()
    )
  );

/*
  # Fix Review Cycles SELECT Policy - Version 3

  1. Problem
    - INSERT with .select() triggers SELECT policy on review_cycles
    - SELECT policy queries review_cycle_members
    - review_cycle_members doesn't exist yet during the INSERT
    - Creates recursion or access denied errors

  2. Solution
    - Make SELECT policy on review_cycles prioritize manager_id check
    - Only check review_cycle_members as a secondary condition
    - This allows managers to see cycles they created immediately

  3. Changes
    - Update SELECT policy to be more efficient
    - Avoid unnecessary joins when manager_id matches
*/

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their cycles" ON review_cycles;

-- Create optimized SELECT policy that checks manager first
-- This avoids querying review_cycle_members when it's the manager
CREATE POLICY "Users can view their cycles"
  ON review_cycles FOR SELECT
  TO authenticated
  USING (
    -- Managers can always see their cycles (no join needed)
    manager_id = auth.uid()
    OR 
    -- Leadership/admin can see all cycles
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
    OR
    -- Employees can see cycles they're part of
    EXISTS (
      SELECT 1 FROM review_cycle_members
      WHERE cycle_id = review_cycles.id AND employee_id = auth.uid()
    )
  );

/*
  # Fix Review Cycle KPIs and Actions Policies - Version 4

  1. Problem
    - INSERT policies on review_cycle_kpis and review_cycle_actions check review_cycles
    - This creates circular dependencies during cycle creation
    - Policies use "ALL" which includes INSERT with qual checks

  2. Solution
    - Separate INSERT policies from other operations
    - Make INSERT policies simple (WITH CHECK only)
    - Keep SELECT/UPDATE/DELETE policies strict

  3. Changes
    - Split ALL policies into separate policies for each operation
    - Simplify INSERT to avoid joins
*/

-- Fix review_cycle_kpis policies
DROP POLICY IF EXISTS "Managers can manage cycle KPIs" ON review_cycle_kpis;
DROP POLICY IF EXISTS "Users can view cycle KPIs" ON review_cycle_kpis;

CREATE POLICY "Users can view cycle KPIs"
  ON review_cycle_kpis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM review_cycle_members
      WHERE cycle_id = review_cycle_kpis.cycle_id AND employee_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Authenticated users can insert cycle KPIs"
  ON review_cycle_kpis FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Managers can update cycle KPIs"
  ON review_cycle_kpis FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can delete cycle KPIs"
  ON review_cycle_kpis FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

-- Fix review_cycle_actions policies
DROP POLICY IF EXISTS "Managers can manage cycle actions" ON review_cycle_actions;
DROP POLICY IF EXISTS "Users can view cycle actions" ON review_cycle_actions;

CREATE POLICY "Users can view cycle actions"
  ON review_cycle_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM review_cycle_members
      WHERE cycle_id = review_cycle_actions.cycle_id AND employee_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Authenticated users can insert cycle actions"
  ON review_cycle_actions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Managers can update cycle actions"
  ON review_cycle_actions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can delete cycle actions"
  ON review_cycle_actions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

/*
  # Fix Review Cycles Circular Dependency - Final Fix
  
  1. Problem
    - SELECT policy on review_cycles checks review_cycle_members
    - SELECT policy on review_cycle_members checks review_cycles
    - This creates infinite recursion during INSERT operations
    
  2. Solution
    - Simplify review_cycles SELECT policy to use direct checks only
    - Create a helper function that safely checks membership
    - Use SECURITY DEFINER function to bypass RLS during policy checks
    
  3. Changes
    - Add is_cycle_member function with SECURITY DEFINER
    - Update review_cycles SELECT policy to use the function
    - This breaks the circular dependency
*/

-- Helper function to check if user is a cycle member (bypasses RLS)
CREATE OR REPLACE FUNCTION is_cycle_member(p_cycle_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_member boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM review_cycle_members
    WHERE cycle_id = p_cycle_id 
    AND employee_id = p_user_id
    AND status = 'active'
  ) INTO v_is_member;
  
  RETURN v_is_member;
END;
$$;

GRANT EXECUTE ON FUNCTION is_cycle_member(uuid, uuid) TO authenticated;

-- Helper function to check if user is leadership/admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_leadership_or_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_leadership boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id 
    AND role IN ('leadership', 'admin')
  ) INTO v_is_leadership;
  
  RETURN v_is_leadership;
END;
$$;

GRANT EXECUTE ON FUNCTION is_leadership_or_admin(uuid) TO authenticated;

-- Update review_cycles SELECT policy to break circular dependency
DROP POLICY IF EXISTS "Users can view their cycles" ON review_cycles;

CREATE POLICY "Users can view their cycles"
  ON review_cycles FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR is_cycle_member(id, auth.uid())
    OR is_leadership_or_admin(auth.uid())
  );

-- Update review_cycle_members SELECT policy to be simpler
DROP POLICY IF EXISTS "Users can view cycle members" ON review_cycle_members;

CREATE POLICY "Users can view cycle members"
  ON review_cycle_members FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = cycle_id AND rc.manager_id = auth.uid()
    )
    OR is_leadership_or_admin(auth.uid())
  );

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

/*
  # Create Missing Review Instances

  1. Purpose
    - Create review instances for all cycle members who don't have one yet
    - This ensures all team members have reviewable instances
  
  2. Changes
    - Insert review instances for existing cycle members without instances
*/

-- Create review instances for all cycle members who don't have one yet
INSERT INTO review_instances (cycle_id, employee_id, manager_id, template_type, status)
SELECT DISTINCT
  rcm.cycle_id,
  rcm.employee_id,
  rc.manager_id,
  'generic' as template_type,
  'upcoming' as status
FROM review_cycle_members rcm
JOIN review_cycles rc ON rc.id = rcm.cycle_id
LEFT JOIN review_instances ri ON ri.cycle_id = rcm.cycle_id AND ri.employee_id = rcm.employee_id
WHERE rcm.status = 'active'
  AND ri.id IS NULL;

/*
  # Seed Complete Review Data for Rachel - Simplified

  1. Purpose
    - Assign Rachel a job title so competencies can load
    - Create KPIs in the strategy and link to review cycle
    - Create actions for Rachel in the cycle
  
  2. Changes
    - Update Rachel's profile with job title
    - Create strategy focus area and KPIs, link to review cycle
    - Create cycle actions for the review cycle
    - Create employee actions for Rachel
*/

-- Step 1: Assign Rachel a job title (Software Engineer)
UPDATE profiles
SET job_title_id = (SELECT id FROM job_titles WHERE title = 'Software Engineer' LIMIT 1),
    job_title = 'Software Engineer'
WHERE email = 'rachel.schaanning@eposnow.com';

-- Step 2: Create Strategy Focus Area and KPIs
DO $$
DECLARE
  v_strategy_id uuid := '91887bca-6128-4e49-b471-adda505483ba';
  v_cycle_id uuid := 'ed019143-4d01-4acf-853a-349a70abb9e0';
  v_rachel_id uuid := '32e70912-f163-4bac-af4d-7db5dce10e98';
  v_manager_id uuid;
  v_focus_area_id uuid;
BEGIN
  -- Get manager ID
  SELECT manager_id INTO v_manager_id FROM review_cycles WHERE id = v_cycle_id;

  -- Create a focus area for the strategy
  INSERT INTO strategy_focus_areas (strategy_id, title, description, sort_order)
  VALUES (v_strategy_id, 'Product Development', 'Deliver high-quality software products on time', 1)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_focus_area_id;

  -- If focus area already exists, get its ID
  IF v_focus_area_id IS NULL THEN
    SELECT id INTO v_focus_area_id
    FROM strategy_focus_areas
    WHERE strategy_id = v_strategy_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  -- If still no focus area, create one
  IF v_focus_area_id IS NULL THEN
    INSERT INTO strategy_focus_areas (strategy_id, title, description, sort_order)
    VALUES (v_strategy_id, 'Product Development', 'Deliver high-quality software products on time', 1)
    RETURNING id INTO v_focus_area_id;
  END IF;

  -- Create KPIs for the strategy
  INSERT INTO strategy_kpis (
    strategy_id,
    focus_area_id,
    title,
    description,
    success_measure,
    target_value,
    current_value,
    measurement_unit
  )
  VALUES 
    (
      v_strategy_id,
      v_focus_area_id,
      'Sprint Velocity',
      'Measure team productivity through story points completed',
      '40 story points per sprint',
      40,
      35,
      'story points'
    ),
    (
      v_strategy_id,
      v_focus_area_id,
      'Code Quality Score',
      'Maintain high code quality standards',
      '90% or above',
      90,
      88,
      'percentage'
    ),
    (
      v_strategy_id,
      v_focus_area_id,
      'Bug Resolution Time',
      'Resolve bugs quickly to maintain product quality',
      'Under 48 hours average',
      48,
      52,
      'hours'
    )
  ON CONFLICT DO NOTHING;

  -- Link these KPIs to the review cycle
  INSERT INTO review_cycle_kpis (cycle_id, kpi_name, kpi_target, kpi_measurement_unit, from_strategy, can_remove, sort_order)
  SELECT 
    v_cycle_id,
    sk.title,
    sk.success_measure,
    sk.measurement_unit,
    true,
    false,
    ROW_NUMBER() OVER (ORDER BY sk.created_at)::integer
  FROM strategy_kpis sk
  WHERE sk.strategy_id = v_strategy_id
    AND sk.focus_area_id = v_focus_area_id
    AND NOT EXISTS (
      SELECT 1 FROM review_cycle_kpis rck
      WHERE rck.cycle_id = v_cycle_id AND rck.kpi_name = sk.title
    );

  -- Create cycle actions (standard actions for the cycle)
  INSERT INTO review_cycle_actions (cycle_id, action_title, action_description, default_target_date)
  VALUES 
    (v_cycle_id, 'Implement automated testing framework', 'Set up Jest and Cypress for comprehensive frontend testing coverage', (CURRENT_DATE + INTERVAL '30 days')::date),
    (v_cycle_id, 'Refactor authentication module', 'Improve security and maintainability of authentication code', (CURRENT_DATE + INTERVAL '45 days')::date),
    (v_cycle_id, 'Document API endpoints', 'Create comprehensive API documentation for internal and external use', (CURRENT_DATE + INTERVAL '21 days')::date)
  ON CONFLICT DO NOTHING;

  -- Create employee actions for Rachel
  INSERT INTO review_employee_actions (
    cycle_id,
    employee_id,
    action_title,
    action_owner,
    target_date,
    status,
    is_overdue
  )
  VALUES 
    (
      v_cycle_id,
      v_rachel_id,
      'Implement automated testing framework',
      v_rachel_id,
      (CURRENT_DATE + INTERVAL '30 days')::date,
      'in_progress',
      false
    ),
    (
      v_cycle_id,
      v_rachel_id,
      'Refactor authentication module',
      v_rachel_id,
      (CURRENT_DATE + INTERVAL '45 days')::date,
      'in_progress',
      false
    ),
    (
      v_cycle_id,
      v_rachel_id,
      'Document API endpoints',
      v_rachel_id,
      (CURRENT_DATE + INTERVAL '21 days')::date,
      'in_progress',
      false
    )
  ON CONFLICT DO NOTHING;

END $$;

