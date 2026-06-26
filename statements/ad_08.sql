DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'quiz_session_id'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN quiz_session_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'learning_style'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN learning_style text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'weekly_hours_commitment'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN weekly_hours_commitment numeric(4,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'conversation_scheduled_at'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN conversation_scheduled_at timestamptz;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS career_quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  goal_role_id uuid REFERENCES job_titles(id),
  goal_role_custom_title text,

  reality_assessment jsonb DEFAULT '{}'::jsonb,
  current_gaps jsonb DEFAULT '[]'::jsonb,
  external_qualifications_text text,
  external_experience_text text,
  external_skills_text text,

  skill_ratings jsonb DEFAULT '{}'::jsonb,
  learning_style text,
  weekly_hours_commitment numeric(4,2),
  recommended_modules jsonb DEFAULT '[]'::jsonb,

  action_plan text,
  internal_criteria_met boolean DEFAULT false,

  current_step integer DEFAULT 1 CHECK (current_step BETWEEN 1 AND 4),
  quiz_status text DEFAULT 'draft' CHECK (quiz_status IN ('draft', 'submitted', 'manager_review', 'active', 'completed', 'discarded')),
  submitted_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS career_external_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_session_id uuid REFERENCES career_quiz_sessions(id) ON DELETE CASCADE,

  qualification_type text NOT NULL CHECK (qualification_type IN ('education', 'certification', 'experience', 'skill')),
  title text NOT NULL,
  description text,
  institution text,
  completion_date date,

  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS career_skill_self_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_session_id uuid NOT NULL REFERENCES career_quiz_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES skills(id) ON DELETE CASCADE,
  skill_name text NOT NULL,

  rating text NOT NULL CHECK (rating IN ('not_trained', 'trained', 'developing', 'good', 'competent')),
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(quiz_session_id, skill_id)
);

CREATE TABLE IF NOT EXISTS career_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  current_role_title text,
  current_department text,
  years_in_current_role numeric(4,2),
  previous_roles jsonb DEFAULT '[]'::jsonb,
  skills_summary jsonb DEFAULT '{}'::jsonb,
  competencies_summary jsonb DEFAULT '{}'::jsonb,
  performance_scores jsonb DEFAULT '{}'::jsonb,

  external_qualifications jsonb DEFAULT '[]'::jsonb,
  external_experience jsonb DEFAULT '[]'::jsonb,
  external_skills jsonb DEFAULT '[]'::jsonb,

  career_goals text,
  preferred_pathways jsonb DEFAULT '[]'::jsonb,

  last_updated timestamptz DEFAULT now(),
  profile_completeness numeric(3,0) DEFAULT 0 CHECK (profile_completeness BETWEEN 0 AND 100),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS marti_career_coaching_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_session_id uuid REFERENCES career_quiz_sessions(id) ON DELETE CASCADE,

  coaching_type text NOT NULL CHECK (coaching_type IN ('gap_analysis', 'recommendation', 'reality_check', 'action_plan', 'general_coaching')),

  prompt_text text NOT NULL,
  ai_response text NOT NULL,

  context_data jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_quiz_sessions_user ON career_quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_career_quiz_sessions_status ON career_quiz_sessions(quiz_status);
CREATE INDEX IF NOT EXISTS idx_career_external_quals_user ON career_external_qualifications(user_id);
CREATE INDEX IF NOT EXISTS idx_career_skill_ratings_session ON career_skill_self_ratings(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_career_profiles_user ON career_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_marti_coaching_user ON marti_career_coaching_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_marti_coaching_session ON marti_career_coaching_logs(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_quiz_session ON career_plans(quiz_session_id);

ALTER TABLE career_quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_external_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_skill_self_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marti_career_coaching_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz sessions"
  ON career_quiz_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own quiz sessions"
  ON career_quiz_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz sessions"
  ON career_quiz_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view team quiz sessions"
  ON career_quiz_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_quiz_sessions.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view all quiz sessions"
  ON career_quiz_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'leadership')
    )
  );

CREATE POLICY "Users can manage own qualifications"
  ON career_external_qualifications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view team qualifications"
  ON career_external_qualifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_external_qualifications.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own skill ratings"
  ON career_skill_self_ratings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view team skill ratings"
  ON career_skill_self_ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_skill_self_ratings.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own profile"
  ON career_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view team profiles"
  ON career_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_profiles.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view all profiles"
  ON career_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'leadership')
    )
  );

CREATE POLICY "Users can view own coaching logs"
  ON marti_career_coaching_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own coaching logs"
  ON marti_career_coaching_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all coaching logs"
  ON marti_career_coaching_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'leadership')
    )
  );

CREATE OR REPLACE FUNCTION create_default_career_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO career_profiles (
    user_id,
    current_role_title,
    current_department,
    profile_completeness
  )
  VALUES (
    NEW.id,
    NEW.job_title,
    NEW.department,
    25
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_career_profile_on_user_creation ON profiles;
CREATE TRIGGER create_career_profile_on_user_creation
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_career_profile();

CREATE OR REPLACE FUNCTION get_career_plan_metrics(dept_filter text DEFAULT NULL)
RETURNS TABLE (
  total_quizzes bigint,
  draft_plans bigint,
  sent_to_manager bigint,
  manager_approved bigint,
  admin_approved bigint,
  avg_completion_time interval
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT cqs.id)::bigint AS total_quizzes,
    COUNT(DISTINCT CASE WHEN cp.status = 'draft' THEN cp.id END)::bigint AS draft_plans,
    COUNT(DISTINCT CASE WHEN cp.status = 'sent_to_manager' THEN cp.id END)::bigint AS sent_to_manager,
    COUNT(DISTINCT CASE WHEN cp.status = 'manager_approved' THEN cp.id END)::bigint AS manager_approved,
    COUNT(DISTINCT CASE WHEN cp.status = 'admin_approved' THEN cp.id END)::bigint AS admin_approved,
    AVG(CASE WHEN cp.admin_reviewed_at IS NOT NULL THEN cp.admin_reviewed_at - cp.created_at END) AS avg_completion_time
  FROM career_quiz_sessions cqs
  LEFT JOIN career_plans cp ON cp.quiz_session_id = cqs.id
  LEFT JOIN profiles p ON p.id = cqs.user_id
  WHERE dept_filter IS NULL OR p.department = dept_filter;
END;
$$;