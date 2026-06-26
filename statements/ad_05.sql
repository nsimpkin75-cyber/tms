CREATE TABLE IF NOT EXISTS one_to_one_review_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES profiles(id) NOT NULL,
  cycle_name text NOT NULL,
  cycle_start_date date NOT NULL,
  cycle_end_date date NOT NULL,
  standard_agenda text,
  has_strategic_kpis boolean DEFAULT false,
  strategic_goal_id uuid REFERENCES strategic_goals(id),
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_review_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage their review cycles"
  ON one_to_one_review_cycles
  FOR ALL
  TO authenticated
  USING (manager_id = auth.uid());

CREATE POLICY "Leadership can view all review cycles"
  ON one_to_one_review_cycles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR has_strategic_roadmap_access = true)
    )
  );

CREATE TABLE IF NOT EXISTS one_to_one_cycle_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES one_to_one_review_cycles(id) ON DELETE CASCADE NOT NULL,
  kpi_name text NOT NULL,
  target_value numeric,
  measurement_unit text,
  frequency text DEFAULT 'weekly',
  source text DEFAULT 'manager',
  strategic_kpi_id uuid,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_cycle_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage cycle KPIs"
  ON one_to_one_cycle_kpis
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_review_cycles rc
      WHERE rc.id = cycle_id AND rc.manager_id = auth.uid()
    )
  );

CREATE POLICY "Leadership can view all cycle KPIs"
  ON one_to_one_cycle_kpis
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR has_strategic_roadmap_access = true)
    )
  );

CREATE TABLE IF NOT EXISTS one_to_one_scheduled_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES one_to_one_review_cycles(id) ON DELETE CASCADE NOT NULL,
  manager_id uuid REFERENCES profiles(id) NOT NULL,
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  scheduled_datetime timestamptz NOT NULL,
  google_calendar_event_id text,
  status text DEFAULT 'scheduled',
  meeting_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_scheduled_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and employees can view their meetings"
  ON one_to_one_scheduled_meetings
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid() OR employee_id = auth.uid());

CREATE POLICY "Managers can manage their meetings"
  ON one_to_one_scheduled_meetings
  FOR ALL
  TO authenticated
  USING (manager_id = auth.uid());

CREATE TABLE IF NOT EXISTS one_to_one_weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES one_to_one_scheduled_meetings(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  manager_id uuid REFERENCES profiles(id) NOT NULL,
  week_starting date NOT NULL,
  week_number integer NOT NULL,
  kpi_discussion jsonb,
  short_term_actions text[],
  summary text,
  performance_score integer CHECK (performance_score >= 1 AND performance_score <= 5),
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_weekly_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and employees can view their checkins"
  ON one_to_one_weekly_checkins
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid() OR employee_id = auth.uid());

CREATE POLICY "Managers can manage their team checkins"
  ON one_to_one_weekly_checkins
  FOR ALL
  TO authenticated
  USING (manager_id = auth.uid());

CREATE TABLE IF NOT EXISTS one_to_one_monthly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES one_to_one_scheduled_meetings(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  manager_id uuid REFERENCES profiles(id) NOT NULL,
  review_month date NOT NULL,
  average_weekly_performance numeric,
  overall_competency_score numeric,
  manager_summary text,
  ai_generated_summary text,
  requires_moderation boolean DEFAULT false,
  moderation_status text DEFAULT 'pending',
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  submitted_at timestamptz
);

ALTER TABLE one_to_one_monthly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and employees can view their monthly reviews"
  ON one_to_one_monthly_reviews
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid() OR employee_id = auth.uid());

CREATE POLICY "Managers can manage their team monthly reviews"
  ON one_to_one_monthly_reviews
  FOR ALL
  TO authenticated
  USING (manager_id = auth.uid());

CREATE POLICY "Senior managers can view for moderation"
  ON one_to_one_monthly_reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.id = p2.manager_id
      WHERE p2.id = one_to_one_monthly_reviews.manager_id AND p1.id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS one_to_one_competency_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_review_id uuid REFERENCES one_to_one_monthly_reviews(id) ON DELETE CASCADE NOT NULL,
  competency_id uuid REFERENCES competencies(id) NOT NULL,
  competency_name text NOT NULL,
  target_level integer NOT NULL,
  manager_rating integer CHECK (manager_rating >= 1 AND manager_rating <= 5),
  manager_comment text,
  ai_validation_result jsonb,
  comment_quality_score integer,
  requires_moderation boolean DEFAULT false,
  evidence_provided text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_competency_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and employees can view competency ratings"
  ON one_to_one_competency_ratings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews mr
      WHERE mr.id = monthly_review_id 
      AND (mr.manager_id = auth.uid() OR mr.employee_id = auth.uid())
    )
  );

CREATE POLICY "Managers can manage competency ratings"
  ON one_to_one_competency_ratings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews mr
      WHERE mr.id = monthly_review_id AND mr.manager_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS one_to_one_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  manager_id uuid REFERENCES profiles(id) NOT NULL,
  weekly_checkin_id uuid REFERENCES one_to_one_weekly_checkins(id) ON DELETE CASCADE,
  monthly_review_id uuid REFERENCES one_to_one_monthly_reviews(id) ON DELETE CASCADE,
  action_title text NOT NULL,
  action_description text,
  action_owner uuid REFERENCES profiles(id) NOT NULL,
  target_date date,
  status text DEFAULT 'open',
  completed_date date,
  is_carried_forward boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and employees can view their actions"
  ON one_to_one_actions
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid() OR employee_id = auth.uid() OR action_owner = auth.uid());

CREATE POLICY "Managers can manage their team actions"
  ON one_to_one_actions
  FOR ALL
  TO authenticated
  USING (manager_id = auth.uid());

CREATE TABLE IF NOT EXISTS one_to_one_half_year_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  manager_id uuid REFERENCES profiles(id) NOT NULL,
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  self_assessment_id uuid,
  average_kpi_rating numeric,
  average_competency_rating numeric,
  overall_performance_rating integer CHECK (overall_performance_rating >= 1 AND overall_performance_rating <= 5),
  overall_competency_rating integer CHECK (overall_competency_rating >= 1 AND overall_competency_rating <= 5),
  nine_box_position text,
  manager_summary text,
  ai_generated_summary text,
  status text DEFAULT 'pending_self_assessment',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  submitted_at timestamptz
);

ALTER TABLE one_to_one_half_year_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and employees can view their half year reviews"
  ON one_to_one_half_year_reviews
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid() OR employee_id = auth.uid());

CREATE POLICY "Managers can manage their team half year reviews"
  ON one_to_one_half_year_reviews
  FOR ALL
  TO authenticated
  USING (manager_id = auth.uid());

CREATE TABLE IF NOT EXISTS one_to_one_self_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  half_year_review_id uuid REFERENCES one_to_one_half_year_reviews(id) ON DELETE CASCADE,
  what_do_well text,
  areas_need_support text,
  what_would_help text,
  additional_comments text,
  status text DEFAULT 'pending',
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_self_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can manage their own self assessments"
  ON one_to_one_self_assessments
  FOR ALL
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can view team self assessments"
  ON one_to_one_self_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = employee_id AND p.manager_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS one_to_one_moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_review_id uuid REFERENCES one_to_one_monthly_reviews(id) ON DELETE CASCADE,
  competency_rating_id uuid REFERENCES one_to_one_competency_ratings(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  manager_id uuid REFERENCES profiles(id) NOT NULL,
  moderator_id uuid REFERENCES profiles(id),
  rating_value integer NOT NULL,
  rating_type text NOT NULL,
  manager_justification text,
  ai_coaching_insights jsonb,
  moderation_status text DEFAULT 'pending',
  moderator_decision text,
  moderator_comments text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE one_to_one_moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view their submissions in queue"
  ON one_to_one_moderation_queue
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

CREATE POLICY "Senior managers can moderate queue items"
  ON one_to_one_moderation_queue
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.id = p2.manager_id
      WHERE p2.id = one_to_one_moderation_queue.manager_id AND p1.id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS one_to_one_reminder_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_type text NOT NULL,
  days_before integer DEFAULT 1,
  recipient_type text NOT NULL,
  message_template text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_reminder_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reminder config"
  ON one_to_one_reminder_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "All authenticated users can view reminder config"
  ON one_to_one_reminder_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS one_to_one_ai_coaching_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text NOT NULL,
  threshold_value numeric,
  validation_prompt text,
  coaching_message text,
  is_active boolean DEFAULT true,
  min_rating integer,
  max_rating integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_ai_coaching_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI coaching config"
  ON one_to_one_ai_coaching_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "All authenticated users can view AI coaching config"
  ON one_to_one_ai_coaching_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_review_cycles_manager ON one_to_one_review_cycles(manager_id);
CREATE INDEX IF NOT EXISTS idx_cycle_kpis_cycle ON one_to_one_cycle_kpis(cycle_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_cycle ON one_to_one_scheduled_meetings(cycle_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_employee ON one_to_one_scheduled_meetings(employee_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_manager ON one_to_one_scheduled_meetings(manager_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_meeting ON one_to_one_weekly_checkins(meeting_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_employee ON one_to_one_weekly_checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reviews_meeting ON one_to_one_monthly_reviews(meeting_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reviews_employee ON one_to_one_monthly_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_competency_ratings_review ON one_to_one_competency_ratings(monthly_review_id);
CREATE INDEX IF NOT EXISTS idx_actions_employee ON one_to_one_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_actions_weekly_checkin ON one_to_one_actions(weekly_checkin_id);
CREATE INDEX IF NOT EXISTS idx_actions_monthly_review ON one_to_one_actions(monthly_review_id);
CREATE INDEX IF NOT EXISTS idx_half_year_reviews_employee ON one_to_one_half_year_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_self_assessments_employee ON one_to_one_self_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON one_to_one_moderation_queue(moderation_status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_moderator ON one_to_one_moderation_queue(moderator_id);

INSERT INTO one_to_one_reminder_config (reminder_type, days_before, recipient_type, message_template) VALUES
('monthly_review_day_before', 1, 'manager', 'Reminder: You have a monthly one-to-one review scheduled tomorrow with {employee_name}.'),
('monthly_review_day_of', 0, 'manager', 'Reminder: You have a monthly one-to-one review scheduled today with {employee_name}.'),
('monthly_review_day_before_employee', 1, 'employee', 'Reminder: You have a monthly one-to-one review scheduled tomorrow. Outstanding actions: {action_list}'),
('half_year_self_assessment', 7, 'employee', 'Please complete your self-assessment for the upcoming half-year review.'),
('half_year_manager_projection', 7, 'manager', 'Half-year review approaching for {employee_name}. Projected ratings based on prior reviews: Performance {perf_rating}, Competency {comp_rating}');

INSERT INTO one_to_one_ai_coaching_config (rule_name, rule_type, threshold_value, validation_prompt, coaching_message, min_rating, max_rating) VALUES
('insufficient_comment_length', 'comment_quality', 20, 'Validate if the comment provides specific examples and justification for the rating', 'Your comment appears brief. Please provide specific examples and evidence to justify this rating.', 1, 5),
('high_rating_evidence', 'evidence_required', 50, 'Check if comment contains concrete examples for ratings of 4 or 5', 'Ratings of 4 or 5 require detailed evidence. Please describe specific achievements and behaviors that support this rating.', 4, 5),
('rating_comment_mismatch', 'consistency_check', NULL, 'Analyze if the comment sentiment matches the numerical rating', 'The tone of your comment may not align with the rating. Please review for consistency.', 1, 5),
('improvement_actions_missing', 'action_check', NULL, 'For ratings below 3, check if improvement actions are mentioned', 'For ratings below 3, please include specific improvement actions or support needed.', 1, 2);