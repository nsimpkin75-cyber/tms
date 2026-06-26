/*
  # Progression Criteria and Skills Assessment System

  ## Overview
  This migration adds comprehensive support for career progression criteria,
  skill assessments, and performance-based progression recommendations.

  ## New Tables
  
  ### `progression_criteria`
  Defines requirements for progressing from one level to another within a job family.
  - `id` (uuid, primary key)
  - `job_family_id` (uuid, references job_families)
  - `from_level` (text) - Current level
  - `to_level` (text) - Target level for progression
  - `minimum_tenure_months` (integer) - Minimum time required in current role
  - `required_skills` (jsonb) - Array of required skills with descriptions
  - `required_experience` (jsonb) - Array of required experience items
  - `minimum_performance_rating` (numeric) - Minimum average rating from reviews (1-5 scale)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `user_skill_assessments`
  Tracks user self-assessment of skills for career progression.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `skill_name` (text) - Name of the skill
  - `has_skill` (boolean) - Whether user confirms having this skill
  - `assessed_at` (timestamptz)
  - `notes` (text) - Optional notes about the skill

  ## Updates to Existing Tables
  
  ### `career_quiz_responses`
  Add new columns to support enhanced quiz functionality.

  ## Security
  - Enable RLS on all new tables
  - Users can view and update their own assessments
  - Admins can manage progression criteria
  - Managers can view their team's assessments
*/

-- Create progression_criteria table
CREATE TABLE IF NOT EXISTS progression_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_family_id uuid REFERENCES job_families(id) ON DELETE CASCADE NOT NULL,
  from_level text NOT NULL,
  to_level text NOT NULL,
  minimum_tenure_months integer NOT NULL DEFAULT 12,
  required_skills jsonb DEFAULT '[]'::jsonb,
  required_experience jsonb DEFAULT '[]'::jsonb,
  minimum_performance_rating numeric(3,2) DEFAULT 3.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(job_family_id, from_level, to_level)
);

-- Create user_skill_assessments table
CREATE TABLE IF NOT EXISTS user_skill_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skill_name text NOT NULL,
  has_skill boolean DEFAULT false,
  assessed_at timestamptz DEFAULT now(),
  notes text,
  UNIQUE(user_id, skill_name, assessed_at)
);

-- Add new columns to career_quiz_responses if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'career_quiz_responses' AND column_name = 'months_in_role'
  ) THEN
    ALTER TABLE career_quiz_responses ADD COLUMN months_in_role integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'career_quiz_responses' AND column_name = 'skill_assessments'
  ) THEN
    ALTER TABLE career_quiz_responses ADD COLUMN skill_assessments jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'career_quiz_responses' AND column_name = 'performance_check'
  ) THEN
    ALTER TABLE career_quiz_responses ADD COLUMN performance_check jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'career_quiz_responses' AND column_name = 'recommendation'
  ) THEN
    ALTER TABLE career_quiz_responses ADD COLUMN recommendation text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'career_quiz_responses' AND column_name = 'recommendation_date'
  ) THEN
    ALTER TABLE career_quiz_responses ADD COLUMN recommendation_date timestamptz DEFAULT now();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE progression_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skill_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for progression_criteria

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'progression_criteria' AND policyname = 'Anyone can view progression criteria'
  ) THEN
    CREATE POLICY "Anyone can view progression criteria"
      ON progression_criteria FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'progression_criteria' AND policyname = 'Admins can insert progression criteria'
  ) THEN
    CREATE POLICY "Admins can insert progression criteria"
      ON progression_criteria FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'progression_criteria' AND policyname = 'Admins can update progression criteria'
  ) THEN
    CREATE POLICY "Admins can update progression criteria"
      ON progression_criteria FOR UPDATE
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'progression_criteria' AND policyname = 'Admins can delete progression criteria'
  ) THEN
    CREATE POLICY "Admins can delete progression criteria"
      ON progression_criteria FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- RLS Policies for user_skill_assessments

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_skill_assessments' AND policyname = 'Users can view own skill assessments'
  ) THEN
    CREATE POLICY "Users can view own skill assessments"
      ON user_skill_assessments FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_skill_assessments' AND policyname = 'Managers can view team skill assessments'
  ) THEN
    CREATE POLICY "Managers can view team skill assessments"
      ON user_skill_assessments FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = user_skill_assessments.user_id
          AND profiles.manager_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_skill_assessments' AND policyname = 'Users can insert own skill assessments'
  ) THEN
    CREATE POLICY "Users can insert own skill assessments"
      ON user_skill_assessments FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_skill_assessments' AND policyname = 'Users can update own skill assessments'
  ) THEN
    CREATE POLICY "Users can update own skill assessments"
      ON user_skill_assessments FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Seed progression criteria for Support job family
INSERT INTO progression_criteria (job_family_id, from_level, to_level, minimum_tenure_months, required_skills, required_experience, minimum_performance_rating)
SELECT 
  id,
  'Customer Support Consultant - Payments',
  'Senior Customer Support Consultant - Payments',
  12,
  '[
    {"name": "Advanced Payment Processing", "description": "Expert knowledge of payment systems and troubleshooting"},
    {"name": "Customer Escalation Handling", "description": "Ability to handle complex customer escalations independently"},
    {"name": "Team Mentoring", "description": "Experience mentoring junior team members"},
    {"name": "Process Improvement", "description": "Demonstrated ability to identify and implement process improvements"}
  ]'::jsonb,
  '[
    {"name": "Complex Case Resolution", "description": "Resolved 50+ complex payment cases independently"},
    {"name": "Quality Standards", "description": "Consistently met or exceeded quality standards (95%+)"},
    {"name": "Customer Satisfaction", "description": "Maintained high customer satisfaction scores"}
  ]'::jsonb,
  3.50
FROM job_families
WHERE title = 'Support' AND level = 'Customer Support Consultant - Payments'
ON CONFLICT (job_family_id, from_level, to_level) DO NOTHING;

INSERT INTO progression_criteria (job_family_id, from_level, to_level, minimum_tenure_months, required_skills, required_experience, minimum_performance_rating)
SELECT 
  id,
  'Senior Customer Support Consultant - Payments',
  'Team Lead - Customer Support',
  18,
  '[
    {"name": "Leadership Skills", "description": "Proven ability to lead and develop team members"},
    {"name": "Strategic Thinking", "description": "Understanding of departmental strategy and objectives"},
    {"name": "Stakeholder Management", "description": "Effective communication with cross-functional teams"},
    {"name": "Performance Management", "description": "Experience with performance reviews and development plans"}
  ]'::jsonb,
  '[
    {"name": "Team Projects", "description": "Led at least 2 major team projects or initiatives"},
    {"name": "Training Delivery", "description": "Delivered training to new team members"},
    {"name": "Process Ownership", "description": "Owned and improved key support processes"}
  ]'::jsonb,
  4.00
FROM job_families
WHERE title = 'Support' AND level = 'Senior Customer Support Consultant - Payments'
ON CONFLICT (job_family_id, from_level, to_level) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_progression_criteria_job_family ON progression_criteria(job_family_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_assessments_user ON user_skill_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_career_quiz_responses_date ON career_quiz_responses(recommendation_date DESC);