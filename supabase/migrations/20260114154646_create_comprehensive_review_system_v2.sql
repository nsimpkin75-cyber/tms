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
