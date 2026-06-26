/*
  # Career Pathways Features

  1. New Tables
    - `user_cvs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `content` (jsonb) - stores CV data in structured format
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `career_quiz_responses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `quiz_data` (jsonb) - stores questions and answers
      - `ai_analysis` (text) - AI analysis of responses
      - `recommendations` (jsonb) - structured recommendations
      - `created_at` (timestamptz)
    
    - `career_development_plans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `current_role_title` (text)
      - `target_role_title` (text)
      - `tenure_months` (integer) - months in current role
      - `current_skills` (jsonb) - array of skill IDs
      - `required_skills` (jsonb) - skills needed for progression
      - `internal_criteria_met` (jsonb) - criteria checklist
      - `status` (text) - pending, approved, rejected, active
      - `manager_id` (uuid, foreign key to profiles)
      - `manager_comments` (text)
      - `submitted_at` (timestamptz)
      - `reviewed_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `one_to_one_goals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `cdp_id` (uuid, foreign key to career_development_plans) - nullable
      - `title` (text)
      - `description` (text)
      - `target_date` (date)
      - `status` (text) - not_started, in_progress, completed
      - `progress_percentage` (integer)
      - `created_by` (uuid) - manager or user
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can view and manage their own CVs
    - Users can view their own quiz responses
    - Users can create and view their own CDPs
    - Managers can view and approve CDPs for their reports
    - Users and managers can view/manage one-to-one goals
*/

-- User CVs table
CREATE TABLE IF NOT EXISTS user_cvs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_cvs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own CV"
  ON user_cvs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own CV"
  ON user_cvs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own CV"
  ON user_cvs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own CV"
  ON user_cvs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Career quiz responses table
CREATE TABLE IF NOT EXISTS career_quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quiz_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_analysis text,
  recommendations jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE career_quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz responses"
  ON career_quiz_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz responses"
  ON career_quiz_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Career development plans table
CREATE TABLE IF NOT EXISTS career_development_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  current_role_title text NOT NULL,
  target_role_title text NOT NULL,
  tenure_months integer NOT NULL DEFAULT 0,
  current_skills jsonb DEFAULT '[]'::jsonb,
  required_skills jsonb DEFAULT '[]'::jsonb,
  internal_criteria_met jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active')),
  manager_id uuid REFERENCES profiles(id),
  manager_comments text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE career_development_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own CDPs"
  ON career_development_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own CDPs"
  ON career_development_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own CDPs"
  ON career_development_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view team CDPs"
  ON career_development_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_development_plans.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update team CDPs"
  ON career_development_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_development_plans.user_id
      AND profiles.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_development_plans.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- One to one goals table
CREATE TABLE IF NOT EXISTS one_to_one_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  cdp_id uuid REFERENCES career_development_plans(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  target_date date,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_by uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON one_to_one_goals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON one_to_one_goals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view team goals"
  ON one_to_one_goals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = one_to_one_goals.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can insert team goals"
  ON one_to_one_goals FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = one_to_one_goals.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update team goals"
  ON one_to_one_goals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = one_to_one_goals.user_id
      AND profiles.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = one_to_one_goals.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_cvs_user_id ON user_cvs(user_id);
CREATE INDEX IF NOT EXISTS idx_career_quiz_responses_user_id ON career_quiz_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_career_development_plans_user_id ON career_development_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_career_development_plans_manager_id ON career_development_plans(manager_id);
CREATE INDEX IF NOT EXISTS idx_career_development_plans_status ON career_development_plans(status);
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_user_id ON one_to_one_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_cdp_id ON one_to_one_goals(cdp_id);