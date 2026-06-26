/*
  # Add Missing Columns and Supporting Tables

  ## Overview
  Adds missing columns to existing tables and creates supporting tables for:
  - Job families (progression, learning objectives, sort order)
  - Profiles (manager tracking, job title, admin type)
  - Copilot configuration
  - Language settings
  - Job history tracking
  - Progression criteria

  ## Changes
  1. Add columns to existing tables
  2. Create copilot configuration system
  3. Create job history tracking
  4. Create progression criteria tables
  5. Add AI quiz preferences table
*/

-- Add missing columns to job_families
ALTER TABLE job_families ADD COLUMN IF NOT EXISTS progression_to text;
ALTER TABLE job_families ADD COLUMN IF NOT EXISTS alternative_paths text[] DEFAULT '{}';
ALTER TABLE job_families ADD COLUMN IF NOT EXISTS learning_objectives text[] DEFAULT '{}';
ALTER TABLE job_families ADD COLUMN IF NOT EXISTS key_responsibilities text[] DEFAULT '{}';
ALTER TABLE job_families ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Add missing columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_type text CHECK (admin_type IN ('super_admin', 'hr_admin', 'department_admin'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active timestamptz;

-- Create indexes for new profile columns
CREATE INDEX IF NOT EXISTS idx_profiles_manager ON profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_profiles_job_title ON profiles(job_title);

-- Copilot Configuration System
CREATE TABLE IF NOT EXISTS copilot_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  config_data jsonb NOT NULL DEFAULT '{}',
  ai_intervention_threshold integer DEFAULT 3,
  auto_suggest_actions boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE copilot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view copilot config"
  ON copilot_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage copilot config"
  ON copilot_config FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Job History Tracking
CREATE TABLE IF NOT EXISTS job_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  job_title text NOT NULL,
  department text,
  change_type text CHECK (change_type IN ('hire', 'promotion', 'lateral_move', 'demotion', 'transfer')),
  previous_job_title text,
  effective_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own job history"
  ON job_history FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Managers can view team job history"
  ON job_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'dept_lead', 'leadership', 'admin'))
  );

CREATE POLICY "Admins can manage job history"
  ON job_history FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_job_history_profile ON job_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_job_history_date ON job_history(effective_date);

-- Progression Criteria
CREATE TABLE IF NOT EXISTS progression_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_level text NOT NULL,
  to_level text NOT NULL,
  category text NOT NULL,
  criteria_description text NOT NULL,
  required_skills text[],
  min_time_in_role_months integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE progression_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view progression criteria"
  ON progression_criteria FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage progression criteria"
  ON progression_criteria FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- AI Career Quiz Preferences
CREATE TABLE IF NOT EXISTS ai_quiz_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quiz_data jsonb NOT NULL DEFAULT '{}',
  career_interests text[],
  skill_preferences text[],
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id)
);

ALTER TABLE ai_quiz_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz preferences"
  ON ai_quiz_preferences FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can manage own quiz preferences"
  ON ai_quiz_preferences FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins can view all quiz preferences"
  ON ai_quiz_preferences FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Training module job family links
CREATE TABLE IF NOT EXISTS training_module_job_family_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_course_id uuid REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  job_family_id uuid REFERENCES job_families(id) ON DELETE CASCADE NOT NULL,
  is_recommended boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(training_course_id, job_family_id)
);

ALTER TABLE training_module_job_family_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view training links"
  ON training_module_job_family_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage training links"
  ON training_module_job_family_links FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('l_and_d', 'admin'))
  );

CREATE INDEX IF NOT EXISTS idx_training_links_course ON training_module_job_family_links(training_course_id);
CREATE INDEX IF NOT EXISTS idx_training_links_job_family ON training_module_job_family_links(job_family_id);

-- User status tracking view
CREATE OR REPLACE VIEW user_status_view AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.department,
  p.last_active,
  CASE 
    WHEN p.last_active > NOW() - INTERVAL '5 minutes' THEN 'online'
    WHEN p.last_active > NOW() - INTERVAL '1 hour' THEN 'away'
    ELSE 'offline'
  END as status
FROM profiles p;

-- Function to update last active timestamp
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET last_active = NOW()
  WHERE id = auth.uid();
END;
$$;
