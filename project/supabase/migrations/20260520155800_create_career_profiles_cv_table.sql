/*
  # Create career_profiles table for My Profile (Internal CV)

  ## Summary
  Creates the career_profiles table which acts as an employee's internal CV.
  This table was referenced in existing code but was not yet created in this database instance.

  ## New Table: career_profiles
  - `id` — primary key
  - `user_id` — unique FK to profiles (one career profile per employee)
  - `current_role_title` — pulled from profiles but editable for display
  - `current_department` — pulled from profiles but editable for display
  - `role_purpose_summary` — employee's own summary of their current role
  - `years_in_current_role` — numeric tenure in years
  - `role_history` — jsonb array of previous internal roles (title, dept, start_date, end_date, summary, achievements)
  - `additional_skills` — jsonb array of employee-added skills (name, category, evidence, confidence_level)
  - `qualifications_training` — jsonb array of qualifications/certs (name, provider, date_completed, expiry_date, evidence_link)
  - `career_goals` — free text career aspirations (used by SERA coaching)
  - `previous_roles` — legacy jsonb array kept for backward compatibility
  - `external_qualifications` — legacy jsonb array kept for backward compatibility
  - `external_experience` — legacy jsonb array kept for backward compatibility
  - `external_skills` — legacy jsonb array kept for backward compatibility
  - `skills_summary`, `competencies_summary`, `performance_scores` — auto-populated aggregates
  - `profile_completeness` — 0-100 score
  - `last_updated`, `created_at`, `updated_at` — timestamps

  ## Security
  - RLS enabled
  - Employees: view and manage own profile
  - Managers: view direct reports' profiles
  - Admins: view all
*/

CREATE TABLE IF NOT EXISTS career_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Current role (mirrors profile data, editable)
  current_role_title text,
  current_department text,
  years_in_current_role numeric(4,2),
  role_purpose_summary text,

  -- Structured role history (new)
  role_history jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Employee-added skills (new)
  additional_skills jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Qualifications and training (new)
  qualifications_training jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Career interests / goals
  career_goals text,

  -- Legacy / backward-compat columns
  previous_roles jsonb DEFAULT '[]'::jsonb,
  external_qualifications jsonb DEFAULT '[]'::jsonb,
  external_experience jsonb DEFAULT '[]'::jsonb,
  external_skills jsonb DEFAULT '[]'::jsonb,

  -- Auto-populated aggregates
  skills_summary jsonb DEFAULT '{}'::jsonb,
  competencies_summary jsonb DEFAULT '{}'::jsonb,
  performance_scores jsonb DEFAULT '{}'::jsonb,
  preferred_pathways jsonb DEFAULT '[]'::jsonb,

  -- Meta
  profile_completeness numeric(3,0) DEFAULT 0 CHECK (profile_completeness BETWEEN 0 AND 100),
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_career_profiles_user ON career_profiles(user_id);

ALTER TABLE career_profiles ENABLE ROW LEVEL SECURITY;

-- Employees: view own
CREATE POLICY "Users can view own career profile"
  ON career_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Employees: insert own
CREATE POLICY "Users can insert own career profile"
  ON career_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Employees: update own
CREATE POLICY "Users can update own career profile"
  ON career_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Managers: view direct reports
CREATE POLICY "Managers can view team career profiles"
  ON career_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_profiles.user_id
      AND profiles.manager_id = (SELECT id FROM profiles WHERE id = auth.uid())
    )
  );

-- Admins: view all
CREATE POLICY "Admins can view all career profiles"
  ON career_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'leadership')
    )
  );
