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