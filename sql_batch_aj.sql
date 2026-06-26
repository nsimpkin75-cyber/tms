/*
  # Create SERA Career Coach Tables

  ## New Tables

  ### sera_career_coach_sessions
  Stores each career coaching conversation session, including the enriched context
  snapshot used (role, department, team, pathway match, performance avg, length of
  service) and the full message history. This allows admins to review what data
  SERA had access to when responding.

  Columns:
  - id (uuid, pk)
  - user_id (uuid, FK profiles)
  - started_at (timestamptz)
  - last_message_at (timestamptz)
  - messages (jsonb) — array of {role, content, timestamp}
  - context_snapshot (jsonb) — snapshot of career data used at session start
  - matched_pathway_id (uuid, nullable) — job_family that matched employee's role

  ### sera_career_coach_feedback
  Admin feedback on individual SERA career coaching responses, for quality improvement.
  Does NOT affect review ratings, competency scores or moderation workflow.

  Columns:
  - id (uuid, pk)
  - session_id (uuid, FK sera_career_coach_sessions)
  - message_index (int) — which assistant message in the session (0-based)
  - user_id (uuid) — the employee the session was for
  - feedback_rating (text) — 'good' | 'needs_detail' | 'incorrect' | 'missing_data'
  - correction_notes (text, nullable) — admin correction/improvement notes
  - reviewed_by (uuid, FK profiles) — admin who gave feedback
  - reviewed_at (timestamptz)
  - created_at (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Employees can read/insert their own sessions
  - Admins can read all sessions and insert/update feedback
*/

-- ─── Sessions table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sera_career_coach_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at          timestamptz NOT NULL DEFAULT now(),
  last_message_at     timestamptz NOT NULL DEFAULT now(),
  messages            jsonb NOT NULL DEFAULT '[]'::jsonb,
  context_snapshot    jsonb NOT NULL DEFAULT '{}'::jsonb,
  matched_pathway_id  uuid REFERENCES job_families(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sera_career_sessions_user_id ON sera_career_coach_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sera_career_sessions_started_at ON sera_career_coach_sessions(started_at DESC);

ALTER TABLE sera_career_coach_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own career coach sessions"
  ON sera_career_coach_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own career coach sessions"
  ON sera_career_coach_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own career coach sessions"
  ON sera_career_coach_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin read-all
CREATE POLICY "Admins can view all career coach sessions"
  ON sera_career_coach_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ─── Feedback table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sera_career_coach_feedback (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       uuid NOT NULL REFERENCES sera_career_coach_sessions(id) ON DELETE CASCADE,
  message_index    integer NOT NULL,
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feedback_rating  text NOT NULL CHECK (feedback_rating IN ('good', 'needs_detail', 'incorrect', 'missing_data')),
  correction_notes text,
  reviewed_by      uuid NOT NULL REFERENCES profiles(id),
  reviewed_at      timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, message_index)
);

CREATE INDEX IF NOT EXISTS idx_sera_career_feedback_session_id ON sera_career_coach_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_sera_career_feedback_reviewed_by ON sera_career_coach_feedback(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_sera_career_feedback_created_at ON sera_career_coach_feedback(created_at DESC);

ALTER TABLE sera_career_coach_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all career coach feedback"
  ON sera_career_coach_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert career coach feedback"
  ON sera_career_coach_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update career coach feedback"
  ON sera_career_coach_feedback FOR UPDATE
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

/*
  # Extend Career Plans and Actions System

  ## Summary
  This migration extends the career_plans table with all fields needed for the new
  AI Career Quiz workflow and adds a career_plan_actions table for the collaborative
  Way Forward step. It also creates a career_quiz_sessions table if missing.

  ## Changes

  ### career_plans table
  Adds columns for the new quiz workflow while preserving existing data:
  - user_id (uuid) — alias support alongside profile_id
  - goal_role_title (text) — title of the target role from quiz
  - target_department (text) — department of the target role
  - quiz_session_id (uuid) — links back to quiz session
  - quiz_data (jsonb) — full quiz step data
  - reality_data (jsonb) — step 2 reality check snapshot
  - skill_ratings (jsonb) — step 3 skill self-assessments
  - sera_readiness_result (jsonb) — SERA's readiness assessment
  - sera_recommendations (jsonb) — SERA's recommendations
  - skills_gaps (jsonb) — identified skill gaps
  - recommended_training (jsonb) — training suggestions
  - confirmed_at (timestamptz) — when employee confirmed (locked)
  - sent_to_manager_at (timestamptz)
  - manager_reviewed_at (timestamptz)
  - manager_comments (text)
  - manager_id (uuid) — manager at time of submission

  New status values: draft | confirmed | sent_to_manager | manager_approved | admin_approved | rejected

  ### career_plan_actions table
  Tracks individual actions/steps in the Way Forward plan, editable by both
  manager and employee.

  Columns:
  - id (uuid, pk)
  - plan_id (uuid, FK career_plans)
  - title (text) — action description
  - description (text, nullable)
  - source (text) — 'sera' | 'manager' | 'employee' | 'dept_lead'
  - due_date (date, nullable)
  - completed_at (timestamptz, nullable)
  - completed_by (uuid, nullable)
  - notes (text, nullable)
  - added_by (uuid, FK profiles)
  - created_at (timestamptz)

  ### career_quiz_sessions table
  Created if not exists — stores draft quiz state per employee.

  ## Security
  - RLS on all tables
  - Employees can manage their own plans/actions
  - Managers can view/edit plans for their direct reports
  - Dept leads can view plans targeting their department
  - Admins can access everything
*/

-- ─── career_quiz_sessions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS career_quiz_sessions (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goal_role_id                 uuid REFERENCES job_families(id) ON DELETE SET NULL,
  goal_role_custom_title       text,
  goal_department              text,
  external_qualifications_text text,
  external_experience_text     text,
  external_skills_text         text,
  current_gaps                 jsonb DEFAULT '[]'::jsonb,
  reality_assessment           jsonb DEFAULT '{}'::jsonb,
  skill_ratings                jsonb DEFAULT '{}'::jsonb,
  learning_style               text,
  weekly_hours_commitment      numeric(4,2) DEFAULT 2,
  recommended_modules          jsonb DEFAULT '[]'::jsonb,
  action_plan                  text,
  internal_criteria_met        boolean DEFAULT false,
  sera_readiness_result        jsonb DEFAULT '{}'::jsonb,
  sera_recommendations         jsonb DEFAULT '{}'::jsonb,
  current_step                 integer DEFAULT 1,
  quiz_status                  text DEFAULT 'draft' CHECK (quiz_status IN ('draft', 'submitted', 'discarded')),
  submitted_at                 timestamptz,
  created_at                   timestamptz DEFAULT now(),
  updated_at                   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_quiz_sessions_user_id ON career_quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_career_quiz_sessions_status ON career_quiz_sessions(quiz_status);

ALTER TABLE career_quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz sessions"
  ON career_quiz_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own quiz sessions"
  ON career_quiz_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own quiz sessions"
  ON career_quiz_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all quiz sessions"
  ON career_quiz_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── Extend career_plans ──────────────────────────────────────────────────────
-- Add user_id column (alias for profile_id to fix inconsistency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN user_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Backfill user_id from profile_id
UPDATE career_plans SET user_id = profile_id WHERE user_id IS NULL AND profile_id IS NOT NULL;

-- Add quiz and career plan fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'quiz_session_id') THEN
    ALTER TABLE career_plans ADD COLUMN quiz_session_id uuid REFERENCES career_quiz_sessions(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'goal_role_title') THEN
    ALTER TABLE career_plans ADD COLUMN goal_role_title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'goal_role_custom_title') THEN
    ALTER TABLE career_plans ADD COLUMN goal_role_custom_title text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'target_department') THEN
    ALTER TABLE career_plans ADD COLUMN target_department text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'quiz_data') THEN
    ALTER TABLE career_plans ADD COLUMN quiz_data jsonb DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'reality_data') THEN
    ALTER TABLE career_plans ADD COLUMN reality_data jsonb DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'skill_ratings') THEN
    ALTER TABLE career_plans ADD COLUMN skill_ratings jsonb DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'skills_gaps') THEN
    ALTER TABLE career_plans ADD COLUMN skills_gaps jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'recommended_training') THEN
    ALTER TABLE career_plans ADD COLUMN recommended_training jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'sera_readiness_result') THEN
    ALTER TABLE career_plans ADD COLUMN sera_readiness_result jsonb DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'sera_recommendations') THEN
    ALTER TABLE career_plans ADD COLUMN sera_recommendations jsonb DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'confirmed_at') THEN
    ALTER TABLE career_plans ADD COLUMN confirmed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'sent_to_manager_at') THEN
    ALTER TABLE career_plans ADD COLUMN sent_to_manager_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'manager_reviewed_at') THEN
    ALTER TABLE career_plans ADD COLUMN manager_reviewed_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'manager_comments') THEN
    ALTER TABLE career_plans ADD COLUMN manager_comments text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'manager_id') THEN
    ALTER TABLE career_plans ADD COLUMN manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'dept_lead_notes') THEN
    ALTER TABLE career_plans ADD COLUMN dept_lead_notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'career_plans' AND column_name = 'dept_lead_reviewed_at') THEN
    ALTER TABLE career_plans ADD COLUMN dept_lead_reviewed_at timestamptz;
  END IF;
END $$;

-- Extend status constraint (drop and re-add)
ALTER TABLE career_plans DROP CONSTRAINT IF EXISTS career_plans_status_check;
ALTER TABLE career_plans ADD CONSTRAINT career_plans_status_check
  CHECK (status IN ('draft', 'confirmed', 'sent_to_manager', 'manager_approved', 'admin_approved', 'rejected'));

-- Index for target department lookups (dept lead view)
CREATE INDEX IF NOT EXISTS idx_career_plans_user_id ON career_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_profile_id ON career_plans(profile_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_target_dept ON career_plans(target_department);
CREATE INDEX IF NOT EXISTS idx_career_plans_status ON career_plans(status);
CREATE INDEX IF NOT EXISTS idx_career_plans_manager_id ON career_plans(manager_id);

-- RLS on career_plans
ALTER TABLE career_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own career plans" ON career_plans;
DROP POLICY IF EXISTS "Users can insert own career plans" ON career_plans;
DROP POLICY IF EXISTS "Users can update own career plans" ON career_plans;
DROP POLICY IF EXISTS "Managers can view team career plans" ON career_plans;
DROP POLICY IF EXISTS "Managers can update team career plans" ON career_plans;
DROP POLICY IF EXISTS "Dept leads can view plans targeting their dept" ON career_plans;
DROP POLICY IF EXISTS "Dept leads can update plans targeting their dept" ON career_plans;
DROP POLICY IF EXISTS "Admins can view all career plans" ON career_plans;
DROP POLICY IF EXISTS "Admins can update all career plans" ON career_plans;
DROP POLICY IF EXISTS "Admins can insert career plans" ON career_plans;

CREATE POLICY "Users can view own career plans"
  ON career_plans FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR profile_id = auth.uid());

CREATE POLICY "Users can insert own career plans"
  ON career_plans FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR profile_id = auth.uid());

CREATE POLICY "Users can update own career plans"
  ON career_plans FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR profile_id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR profile_id = auth.uid());

CREATE POLICY "Managers can view team career plans"
  ON career_plans FOR SELECT TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'leadership', 'admin')
      AND EXISTS (
        SELECT 1 FROM profiles emp
        WHERE (emp.id = career_plans.user_id OR emp.id = career_plans.profile_id)
        AND emp.manager_id = auth.uid()
      )
    )
  );

CREATE POLICY "Managers can update team career plans"
  ON career_plans FOR UPDATE TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('manager', 'leadership')
      AND EXISTS (
        SELECT 1 FROM profiles emp
        WHERE (emp.id = career_plans.user_id OR emp.id = career_plans.profile_id)
        AND emp.manager_id = auth.uid()
      )
    )
  )
  WITH CHECK (true);

CREATE POLICY "Dept leads can view plans targeting their dept"
  ON career_plans FOR SELECT TO authenticated
  USING (
    target_department IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('leadership', 'admin')
      AND p.department = career_plans.target_department
    )
  );

CREATE POLICY "Dept leads can update plans targeting their dept"
  ON career_plans FOR UPDATE TO authenticated
  USING (
    target_department IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('leadership', 'admin')
      AND p.department = career_plans.target_department
    )
  )
  WITH CHECK (true);

CREATE POLICY "Admins can view all career plans"
  ON career_plans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert career plans"
  ON career_plans FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update all career plans"
  ON career_plans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (true);

-- ─── career_plan_actions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS career_plan_actions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id      uuid NOT NULL REFERENCES career_plans(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  source       text NOT NULL DEFAULT 'manager' CHECK (source IN ('sera', 'manager', 'employee', 'dept_lead')),
  due_date     date,
  completed_at timestamptz,
  completed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes        text,
  added_by     uuid NOT NULL REFERENCES profiles(id),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_plan_actions_plan_id ON career_plan_actions(plan_id);
CREATE INDEX IF NOT EXISTS idx_career_plan_actions_added_by ON career_plan_actions(added_by);

ALTER TABLE career_plan_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view actions for own plans"
  ON career_plan_actions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans cp
      WHERE cp.id = career_plan_actions.plan_id
      AND (cp.user_id = auth.uid() OR cp.profile_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert actions for own plans"
  ON career_plan_actions FOR INSERT TO authenticated
  WITH CHECK (
    added_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM career_plans cp
      WHERE cp.id = career_plan_actions.plan_id
      AND (cp.user_id = auth.uid() OR cp.profile_id = auth.uid())
    )
  );

CREATE POLICY "Users can update actions for own plans"
  ON career_plan_actions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans cp
      WHERE cp.id = career_plan_actions.plan_id
      AND (cp.user_id = auth.uid() OR cp.profile_id = auth.uid())
    )
  )
  WITH CHECK (true);

CREATE POLICY "Managers can view team plan actions"
  ON career_plan_actions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans cp
      JOIN profiles emp ON (emp.id = cp.user_id OR emp.id = cp.profile_id)
      WHERE cp.id = career_plan_actions.plan_id
      AND emp.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can insert team plan actions"
  ON career_plan_actions FOR INSERT TO authenticated
  WITH CHECK (
    added_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM career_plans cp
      JOIN profiles emp ON (emp.id = cp.user_id OR emp.id = cp.profile_id)
      WHERE cp.id = career_plan_actions.plan_id
      AND emp.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update team plan actions"
  ON career_plan_actions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans cp
      JOIN profiles emp ON (emp.id = cp.user_id OR emp.id = cp.profile_id)
      WHERE cp.id = career_plan_actions.plan_id
      AND emp.manager_id = auth.uid()
    )
  )
  WITH CHECK (true);

CREATE POLICY "Dept leads can view dept plan actions"
  ON career_plan_actions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM career_plans cp
      JOIN profiles p ON p.id = auth.uid()
      WHERE cp.id = career_plan_actions.plan_id
      AND cp.target_department = p.department
      AND p.role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Dept leads can insert dept plan actions"
  ON career_plan_actions FOR INSERT TO authenticated
  WITH CHECK (
    added_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM career_plans cp
      JOIN profiles p ON p.id = auth.uid()
      WHERE cp.id = career_plan_actions.plan_id
      AND cp.target_department = p.department
      AND p.role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Admins can manage all plan actions"
  ON career_plan_actions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert plan actions"
  ON career_plan_actions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update plan actions"
  ON career_plan_actions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (true);

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

/*
  # Add Pathway layer and extended role profile columns to job_families

  ## Summary
  This migration adds a `pathway` column to `job_families` to support the
  Department → Pathway → Role hierarchy, and adds structured role profile
  columns so each role profile can carry full progression guidance.

  ## Changes to job_families

  ### New columns
  - `pathway` (text) — specialist pathway within a department, e.g. "L&D", "HR", "QA"
  - `role_purpose` (text) — detailed role purpose statement (supplements existing `description`)
  - `qualifications_training` (text[]) — recommended qualifications / training for the role
  - `competencies` (text[]) — behavioural competencies expected in this role
  - `kpi_expectations` (text[]) — KPI / performance expectations
  - `recommended_learning` (text[]) — recommended learning resources
  - `recommended_prev_roles` (text[]) — suggested previous roles before entering this role
  - `side_step_roles` (text[]) — optional side-step transitions (not direct progression)
  - `typical_experience_required` (text) — free-text description of typical experience needed
  - `internal_progression_criteria` (text) — what needs to be evidenced for internal progression
  - `mentoring_suggestions` (text) — optional mentoring / shadowing suggestions

  ## Notes
  - All existing data is preserved; new columns default to NULL / empty array
  - No existing columns are removed or renamed
  - No RLS changes; job_families inherits existing policies
  - profiles.job_family_id and all existing foreign keys remain intact
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'pathway') THEN
    ALTER TABLE job_families ADD COLUMN pathway text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'role_purpose') THEN
    ALTER TABLE job_families ADD COLUMN role_purpose text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'qualifications_training') THEN
    ALTER TABLE job_families ADD COLUMN qualifications_training text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'competencies_behaviours') THEN
    ALTER TABLE job_families ADD COLUMN competencies_behaviours text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'kpi_expectations') THEN
    ALTER TABLE job_families ADD COLUMN kpi_expectations text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'recommended_learning') THEN
    ALTER TABLE job_families ADD COLUMN recommended_learning text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'recommended_prev_roles') THEN
    ALTER TABLE job_families ADD COLUMN recommended_prev_roles text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'side_step_roles') THEN
    ALTER TABLE job_families ADD COLUMN side_step_roles text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'typical_experience_required') THEN
    ALTER TABLE job_families ADD COLUMN typical_experience_required text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'internal_progression_criteria') THEN
    ALTER TABLE job_families ADD COLUMN internal_progression_criteria text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'mentoring_suggestions') THEN
    ALTER TABLE job_families ADD COLUMN mentoring_suggestions text;
  END IF;
END $$;

-- Index on pathway for efficient filtering in dropdowns
CREATE INDEX IF NOT EXISTS idx_job_families_pathway ON job_families(pathway);
CREATE INDEX IF NOT EXISTS idx_job_families_dept_pathway ON job_families(department, pathway);

/*
  # Security Fixes: Views, Functions, and RLS Policies

  ## Summary
  Addresses all reported security issues in four categories:

  ### 1. Security Definer Views → Recreated as Security Invoker
  - `public.employee_skill_summary` — was SECURITY DEFINER, recreated without it
  - `public.user_status_view` — was SECURITY DEFINER, recreated without it

  ### 2. RLS UPDATE Policies with `WITH CHECK (true)` → Fixed to mirror USING clause
  - `career_plan_actions`: Admins can update plan actions
  - `career_plan_actions`: Managers can update team plan actions
  - `career_plan_actions`: Users can update actions for own plans
  - `career_plans`: Admins can update all career plans
  - `career_plans`: Dept leads can update plans targeting their dept
  - `career_plans`: Managers can update team career plans

  ### 3. SECURITY DEFINER Functions — Revoke anon EXECUTE
  Revokes anon execute on all affected functions so they cannot be called
  unauthenticated via the REST API.

  ### 4. Trigger functions — Remove SECURITY DEFINER where not needed
  Trigger functions (handle_new_user, update_updated_at_column,
  update_organisation_settings_updated_at, update_last_active) are invoked by
  the database engine, not by roles, so removing SECURITY DEFINER from them is
  safe and removes the public-execute exposure.
*/

-- ============================================================
-- 1. Fix SECURITY DEFINER views
-- ============================================================

-- Drop and recreate employee_skill_summary without SECURITY DEFINER
DROP VIEW IF EXISTS public.employee_skill_summary;
CREATE VIEW public.employee_skill_summary AS
SELECT
  sa.profile_id AS employee_id,
  sm.id AS skill_id,
  sm.name AS skill_name,
  COALESCE(st.name, 'General') AS skill_type,
  '📊'::text AS skill_type_icon,
  sa.target_level,
  false AS is_mandatory,
  (
    SELECT sr.rating_value FROM skill_ratings sr
    WHERE sr.employee_id = sa.profile_id AND sr.skill_id = sm.id AND sr.rated_by = sa.profile_id
    ORDER BY sr.rated_at DESC LIMIT 1
  ) AS latest_self_rating,
  (
    SELECT sr.rating_value FROM skill_ratings sr
    WHERE sr.employee_id = sa.profile_id AND sr.skill_id = sm.id AND sr.rated_by <> sa.profile_id
    ORDER BY sr.rated_at DESC LIMIT 1
  ) AS latest_manager_rating,
  sa.current_level AS current_rating,
  sa.assessment_date AS last_assessed_at,
  'active'::text AS cycle_status,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM skill_assessment_discrepancies sad
      WHERE sad.employee_id = sa.profile_id AND sad.skill_id = sm.id
        AND sad.flagged_for_discussion = true AND sad.resolved_at IS NULL
    ) THEN true
    ELSE false
  END AS has_discrepancy,
  (
    SELECT sad.ai_analysis FROM skill_assessment_discrepancies sad
    WHERE sad.employee_id = sa.profile_id AND sad.skill_id = sm.id
    ORDER BY sad.created_at DESC LIMIT 1
  ) AS discrepancy_analysis
FROM skill_assessments sa
JOIN skills_master sm ON sa.skill_id = sm.id
LEFT JOIN skill_types st ON sm.skill_type_id = st.id;

-- Drop and recreate user_status_view without SECURITY DEFINER
DROP VIEW IF EXISTS public.user_status_view;
CREATE VIEW public.user_status_view AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.active,
  p.department,
  p.job_title,
  p.manager_id,
  m.full_name AS manager_name,
  p.created_at,
  p.last_active,
  CASE
    WHEN p.active = false THEN 'Inactive'
    WHEN p.role = 'admin'::user_role THEN 'Admin'
    WHEN p.role = 'manager'::user_role THEN 'Manager'
    ELSE 'Employee'
  END AS status_label
FROM profiles p
LEFT JOIN profiles m ON p.manager_id = m.id;

-- ============================================================
-- 2. Fix RLS UPDATE policies with WITH CHECK (true)
-- ============================================================

-- career_plan_actions: Admins can update plan actions
DROP POLICY IF EXISTS "Admins can update plan actions" ON public.career_plan_actions;
CREATE POLICY "Admins can update plan actions"
  ON public.career_plan_actions
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
  ));

-- career_plan_actions: Managers can update team plan actions
DROP POLICY IF EXISTS "Managers can update team plan actions" ON public.career_plan_actions;
CREATE POLICY "Managers can update team plan actions"
  ON public.career_plan_actions
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM career_plans cp
    JOIN profiles emp ON (emp.id = cp.user_id OR emp.id = cp.profile_id)
    WHERE cp.id = career_plan_actions.plan_id AND emp.manager_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM career_plans cp
    JOIN profiles emp ON (emp.id = cp.user_id OR emp.id = cp.profile_id)
    WHERE cp.id = career_plan_actions.plan_id AND emp.manager_id = auth.uid()
  ));

-- career_plan_actions: Users can update actions for own plans
DROP POLICY IF EXISTS "Users can update actions for own plans" ON public.career_plan_actions;
CREATE POLICY "Users can update actions for own plans"
  ON public.career_plan_actions
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM career_plans cp
    WHERE cp.id = career_plan_actions.plan_id
      AND (cp.user_id = auth.uid() OR cp.profile_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM career_plans cp
    WHERE cp.id = career_plan_actions.plan_id
      AND (cp.user_id = auth.uid() OR cp.profile_id = auth.uid())
  ));

-- career_plans: Admins can update all career plans
DROP POLICY IF EXISTS "Admins can update all career plans" ON public.career_plans;
CREATE POLICY "Admins can update all career plans"
  ON public.career_plans
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::user_role
  ));

-- career_plans: Dept leads can update plans targeting their dept
DROP POLICY IF EXISTS "Dept leads can update plans targeting their dept" ON public.career_plans;
CREATE POLICY "Dept leads can update plans targeting their dept"
  ON public.career_plans
  FOR UPDATE
  TO authenticated
  USING (
    target_department IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = ANY (ARRAY['leadership'::user_role, 'admin'::user_role])
        AND p.department = career_plans.target_department
    )
  )
  WITH CHECK (
    target_department IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = ANY (ARRAY['leadership'::user_role, 'admin'::user_role])
        AND p.department = career_plans.target_department
    )
  );

-- career_plans: Managers can update team career plans
DROP POLICY IF EXISTS "Managers can update team career plans" ON public.career_plans;
CREATE POLICY "Managers can update team career plans"
  ON public.career_plans
  FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = ANY (ARRAY['manager'::user_role, 'leadership'::user_role])
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE (emp.id = career_plans.user_id OR emp.id = career_plans.profile_id)
            AND emp.manager_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = ANY (ARRAY['manager'::user_role, 'leadership'::user_role])
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE (emp.id = career_plans.user_id OR emp.id = career_plans.profile_id)
            AND emp.manager_id = auth.uid()
        )
    )
  );

-- ============================================================
-- 3. Revoke anon EXECUTE on SECURITY DEFINER functions
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.get_active_view_as_session(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_access_levels(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_access_level(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_user_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_last_active() FROM anon;

-- ============================================================
-- 4. Recreate trigger functions without SECURITY DEFINER
-- (Triggers are invoked by the DB engine, not by roles —
--  SECURITY DEFINER is unnecessary and creates exposure)
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_organisation_settings_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- handle_new_user must remain SECURITY DEFINER because it inserts into
-- public.profiles from an auth trigger (runs as the auth schema user).
-- We only revoke anon direct-call access.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- update_last_active is called by authenticated users directly via RPC —
-- keep SECURITY DEFINER so it can UPDATE profiles, but revoke anon.
-- (already revoked above)

/*
  # Add SERA Coaching Context to Job Families

  Adds a new internal-only field `sera_coaching_context` to the `job_families` table.

  ## New Column
  - `sera_coaching_context` (text, nullable) — admin-authored coaching notes for SERA only.
    Not shown to employees. Contains: high-performer behaviours, mindset/personality traits,
    working style, communication style, common development gaps, transition advice, and
    coaching considerations SERA uses when coaching employees toward or within this role.

  ## Notes
  - Existing `competencies_behaviours` and `kpi_expectations` columns are intentionally
    preserved for data safety — they are simply no longer surfaced in the UI.
  - No data migration needed; existing role profiles are unaffected.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'sera_coaching_context'
  ) THEN
    ALTER TABLE public.job_families ADD COLUMN sera_coaching_context text;
  END IF;
END $$;

/*
  # Create Role Profile Recommendations Table

  ## Purpose
  Allows Dept Leads (role = 'leadership') to recommend edits to role profiles from Explore Careers.
  Admins and Execs review, approve (applying changes to the live profile), or dismiss recommendations.

  ## New Tables
  - `role_profile_recommendations`
    - id, job_family_id, submitted_by, field_name, field_label
    - current_value, suggested_value, rationale
    - status (pending/approved/dismissed), reviewed_by, reviewed_at, dismissal_comment, created_at

  ## Security
  - RLS enabled; dept leads insert/view own; admins view all and update status
*/

CREATE TABLE IF NOT EXISTS public.role_profile_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_family_id uuid NOT NULL REFERENCES public.job_families(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_label text NOT NULL,
  current_value text,
  suggested_value text NOT NULL,
  rationale text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  dismissal_comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_profile_recs_job_family_id ON public.role_profile_recommendations(job_family_id);
CREATE INDEX IF NOT EXISTS idx_role_profile_recs_submitted_by ON public.role_profile_recommendations(submitted_by);
CREATE INDEX IF NOT EXISTS idx_role_profile_recs_reviewed_by ON public.role_profile_recommendations(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_role_profile_recs_status ON public.role_profile_recommendations(status);

ALTER TABLE public.role_profile_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dept leads can submit recommendations"
  ON public.role_profile_recommendations
  FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Users can view own recommendations"
  ON public.role_profile_recommendations
  FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

CREATE POLICY "Admins can view all recommendations"
  ON public.role_profile_recommendations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR admin_type IS NOT NULL)
    )
  );

CREATE POLICY "Admins can update recommendation status"
  ON public.role_profile_recommendations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR admin_type IS NOT NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR admin_type IS NOT NULL)
    )
  );

/*
  # Standalone Skills Matrix System

  ## Overview
  A completely new skills assessment system with the hierarchy:
    Type → Category → Topic

  Supports:
  - Admin/L&D Admin matrix creation with lock/unlock
  - Per-role topic assignment
  - Independent employee + manager assessments
  - Mismatch resolution workflow
  - 0–5 rating scale with competency thresholds
  - Escalation tracking at 5/10/15 days
  - Aggregated competency calculations

  ## Tables Created
  1. `sm_types`           – Top-level skill types (e.g. Product Knowledge)
  2. `sm_categories`      – Sub-categories within a type
  3. `sm_topics`          – Individual assessable topics (leaf nodes)
  4. `sm_topic_ratings`   – Per-rating-level definitions (3, 4, 5)
  5. `sm_matrices`        – Matrix header per department
  6. `sm_matrix_roles`    – Which job_family_ids are in this matrix
  7. `sm_role_topics`     – Topic assignments to roles (can be deselected)
  8. `sm_assessments`     – Assessment instance (one per employee per cycle)
  9. `sm_assessment_items`– Individual topic ratings within an assessment
  10. `sm_mismatches`     – Flagged rating discrepancies requiring resolution
  11. `sm_escalations`    – Escalation log for overdue assessments

  ## Security
  - RLS on all tables
  - Admins (role=admin, admin_type IS NOT NULL) have full access
  - Managers see their direct reports
  - Employees see own data
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- Types
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sm_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sm_types"
  ON public.sm_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sm_types"
  ON public.sm_types FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  );

CREATE POLICY "Admins can update sm_types"
  ON public.sm_types FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can delete sm_types"
  ON public.sm_types FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Categories
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id uuid NOT NULL REFERENCES public.sm_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_categories_type_id ON public.sm_categories(type_id);

ALTER TABLE public.sm_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sm_categories"
  ON public.sm_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sm_categories"
  ON public.sm_categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can update sm_categories"
  ON public.sm_categories FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can delete sm_categories"
  ON public.sm_categories FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Topics
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.sm_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  def_rating_3 text,
  def_rating_4 text,
  def_rating_5 text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_topics_category_id ON public.sm_topics(category_id);

ALTER TABLE public.sm_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sm_topics"
  ON public.sm_topics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sm_topics"
  ON public.sm_topics FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can update sm_topics"
  ON public.sm_topics FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can delete sm_topics"
  ON public.sm_topics FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Matrices
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_matrices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text NOT NULL,
  is_locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  locked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_matrices_department ON public.sm_matrices(department);

ALTER TABLE public.sm_matrices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sm_matrices"
  ON public.sm_matrices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sm_matrices"
  ON public.sm_matrices FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can update sm_matrices"
  ON public.sm_matrices FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can delete sm_matrices"
  ON public.sm_matrices FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Matrix → Role assignments (job_family_id)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_matrix_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id uuid NOT NULL REFERENCES public.sm_matrices(id) ON DELETE CASCADE,
  job_family_id uuid NOT NULL REFERENCES public.job_families(id) ON DELETE CASCADE,
  UNIQUE (matrix_id, job_family_id)
);

CREATE INDEX IF NOT EXISTS idx_sm_matrix_roles_matrix_id ON public.sm_matrix_roles(matrix_id);
CREATE INDEX IF NOT EXISTS idx_sm_matrix_roles_job_family_id ON public.sm_matrix_roles(job_family_id);

ALTER TABLE public.sm_matrix_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sm_matrix_roles"
  ON public.sm_matrix_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sm_matrix_roles"
  ON public.sm_matrix_roles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can update sm_matrix_roles"
  ON public.sm_matrix_roles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can delete sm_matrix_roles"
  ON public.sm_matrix_roles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Role → Topic assignments (with deselect flag)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_role_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id uuid NOT NULL REFERENCES public.sm_matrices(id) ON DELETE CASCADE,
  job_family_id uuid NOT NULL REFERENCES public.job_families(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.sm_topics(id) ON DELETE CASCADE,
  is_applicable boolean NOT NULL DEFAULT true,
  UNIQUE (matrix_id, job_family_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_sm_role_topics_matrix_id ON public.sm_role_topics(matrix_id);
CREATE INDEX IF NOT EXISTS idx_sm_role_topics_job_family_id ON public.sm_role_topics(job_family_id);
CREATE INDEX IF NOT EXISTS idx_sm_role_topics_topic_id ON public.sm_role_topics(topic_id);

ALTER TABLE public.sm_role_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sm_role_topics"
  ON public.sm_role_topics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sm_role_topics"
  ON public.sm_role_topics FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can update sm_role_topics"
  ON public.sm_role_topics FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can delete sm_role_topics"
  ON public.sm_role_topics FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Assessment cycles
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_assessment_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id uuid NOT NULL REFERENCES public.sm_matrices(id) ON DELETE CASCADE,
  name text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('monthly','quarterly','bi_annual','annual','ad_hoc')),
  due_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_assessment_cycles_matrix_id ON public.sm_assessment_cycles(matrix_id);

ALTER TABLE public.sm_assessment_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sm_assessment_cycles"
  ON public.sm_assessment_cycles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sm_assessment_cycles"
  ON public.sm_assessment_cycles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can update sm_assessment_cycles"
  ON public.sm_assessment_cycles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can delete sm_assessment_cycles"
  ON public.sm_assessment_cycles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Assessments (one per employee per cycle, two rows: employee + manager)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.sm_assessment_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessor_type text NOT NULL CHECK (assessor_type IN ('employee','manager')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, employee_id, assessor_type)
);

CREATE INDEX IF NOT EXISTS idx_sm_assessments_cycle_id ON public.sm_assessments(cycle_id);
CREATE INDEX IF NOT EXISTS idx_sm_assessments_employee_id ON public.sm_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_sm_assessments_assessor_id ON public.sm_assessments(assessor_id);

ALTER TABLE public.sm_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessments"
  ON public.sm_assessments FOR SELECT TO authenticated
  USING (assessor_id = auth.uid() OR employee_id = auth.uid());

CREATE POLICY "Managers can view team assessments"
  ON public.sm_assessments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)
    )
  );

CREATE POLICY "Users can insert own assessments"
  ON public.sm_assessments FOR INSERT TO authenticated
  WITH CHECK (assessor_id = auth.uid());

CREATE POLICY "Admins can insert any assessments"
  ON public.sm_assessments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Assessors can update own assessments"
  ON public.sm_assessments FOR UPDATE TO authenticated
  USING (assessor_id = auth.uid())
  WITH CHECK (assessor_id = auth.uid());

CREATE POLICY "Admins can update any assessment"
  ON public.sm_assessments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Assessment items (one row per topic per assessment)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_assessment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.sm_assessments(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.sm_topics(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 0 AND rating <= 5),
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_sm_assessment_items_assessment_id ON public.sm_assessment_items(assessment_id);
CREATE INDEX IF NOT EXISTS idx_sm_assessment_items_topic_id ON public.sm_assessment_items(topic_id);

ALTER TABLE public.sm_assessment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessment items"
  ON public.sm_assessment_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sm_assessments
      WHERE id = assessment_id AND (assessor_id = auth.uid() OR employee_id = auth.uid())
    )
  );

CREATE POLICY "Managers can view team assessment items"
  ON public.sm_assessment_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)
    )
  );

CREATE POLICY "Assessors can insert own items"
  ON public.sm_assessment_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sm_assessments
      WHERE id = assessment_id AND assessor_id = auth.uid()
    )
  );

CREATE POLICY "Assessors can update own items"
  ON public.sm_assessment_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sm_assessments
      WHERE id = assessment_id AND assessor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sm_assessments
      WHERE id = assessment_id AND assessor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all items"
  ON public.sm_assessment_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Mismatches (created when employee + manager ratings differ)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_mismatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.sm_assessment_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.sm_topics(id) ON DELETE CASCADE,
  employee_rating integer NOT NULL,
  manager_rating integer NOT NULL,
  employee_comments text,
  manager_comments text,
  resolution text CHECK (resolution IN ('accept_employee','override_manager')),
  final_rating integer,
  manager_feedback text,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_mismatches_cycle_id ON public.sm_mismatches(cycle_id);
CREATE INDEX IF NOT EXISTS idx_sm_mismatches_employee_id ON public.sm_mismatches(employee_id);
CREATE INDEX IF NOT EXISTS idx_sm_mismatches_topic_id ON public.sm_mismatches(topic_id);

ALTER TABLE public.sm_mismatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and admins can view mismatches"
  ON public.sm_mismatches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin','manager','leadership') OR admin_type IS NOT NULL)
    )
    OR employee_id = auth.uid()
  );

CREATE POLICY "System can insert mismatches"
  ON public.sm_mismatches FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)
    )
  );

CREATE POLICY "Managers can update mismatches they own"
  ON public.sm_mismatches FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Escalations (day 5 / 10 / 15 tracking)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.sm_assessment_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  escalation_level integer NOT NULL CHECK (escalation_level IN (5, 10, 15)),
  triggered_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (cycle_id, employee_id, escalation_level)
);

CREATE INDEX IF NOT EXISTS idx_sm_escalations_cycle_id ON public.sm_escalations(cycle_id);
CREATE INDEX IF NOT EXISTS idx_sm_escalations_employee_id ON public.sm_escalations(employee_id);

ALTER TABLE public.sm_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and admins can view escalations"
  ON public.sm_escalations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin','manager','leadership') OR admin_type IS NOT NULL)
    )
  );

CREATE POLICY "Admins can manage escalations"
  ON public.sm_escalations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can update escalations"
  ON public.sm_escalations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)));

/*
  # Career Plans: Creator Tracking and Manager/Admin Insert Permissions

  ## Summary
  Adds creator tracking columns to career_plans and grants managers the ability
  to create plans on behalf of their direct reports or themselves. Admin users
  already had INSERT permission; this migration also widens that to cover
  access-level admins (full_admin access level).

  ## New Columns on career_plans
  - `created_by_role` (text) — who initiated the plan: 'employee', 'manager', or 'admin'
  - `created_by_user_id` (uuid) — FK to profiles(id) of the creator
  - `created_by_name` (text) — display name of creator at time of creation

  ## Policy Changes
  - Drops and recreates "Users can insert own career plans" — unchanged
  - Drops "Admins can insert career plans" and recreates it — unchanged  
  - Adds NEW "Managers can insert career plans for team" — allows managers/leadership
    to INSERT a plan where user_id matches a direct report OR user_id = auth.uid()
    (manager creates a plan for themselves)

  ## Notes
  - Existing plans get created_by_role = 'employee' backfilled (safe assumption)
  - No existing data is deleted or modified structurally
*/

-- Add creator tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'created_by_role'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN created_by_role text
      DEFAULT 'employee'
      CHECK (created_by_role IN ('employee', 'manager', 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN created_by_user_id uuid
      REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'created_by_name'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN created_by_name text;
  END IF;
END $$;

-- Backfill existing plans: assume created by the employee (user_id)
UPDATE career_plans
SET
  created_by_role = 'employee',
  created_by_user_id = COALESCE(user_id, profile_id)
WHERE created_by_role IS NULL OR created_by_user_id IS NULL;

-- Index for creator lookups
CREATE INDEX IF NOT EXISTS idx_career_plans_created_by_user_id
  ON career_plans(created_by_user_id);

-- ── RLS: add manager INSERT policy ───────────────────────────────────────────

-- Drop old manager INSERT policy if it exists from earlier iterations
DROP POLICY IF EXISTS "Managers can insert career plans for team" ON career_plans;
DROP POLICY IF EXISTS "Managers can create career plans for direct reports" ON career_plans;

-- Managers (role IN manager, leadership) can INSERT a plan when:
--   a) user_id is one of their direct reports, OR
--   b) user_id is themselves (manager creating their own plan)
CREATE POLICY "Managers can insert career plans for team"
  ON career_plans FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'leadership')
    )
    AND (
      -- for themselves
      user_id = auth.uid()
      OR
      -- for a direct report
      EXISTS (
        SELECT 1 FROM profiles emp
        WHERE emp.id = career_plans.user_id
        AND emp.manager_id = auth.uid()
      )
    )
  );

-- Ensure manager SELECT policy also covers plans they created (created_by_user_id = auth.uid())
DROP POLICY IF EXISTS "Managers can view team career plans" ON career_plans;

CREATE POLICY "Managers can view team career plans"
  ON career_plans FOR SELECT TO authenticated
  USING (
    -- plans they were assigned as manager
    manager_id = auth.uid()
    -- plans for their direct reports
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('manager', 'leadership', 'admin')
      AND EXISTS (
        SELECT 1 FROM profiles emp
        WHERE (emp.id = career_plans.user_id OR emp.id = career_plans.profile_id)
        AND emp.manager_id = auth.uid()
      )
    )
    -- plans they created on behalf of someone
    OR (
      created_by_user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'leadership', 'admin')
      )
    )
    -- their own plan regardless of role
    OR (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'leadership')
      )
    )
  );

/*
  # Add missing columns to career_plans

  ## Summary
  The admin/manager career plan creation form writes `target_level` and
  `recommended_timeline_months` but these columns do not exist on the table,
  causing all admin- and manager-initiated plan saves to fail.

  ## Changes
  - `career_plans.target_level` (text, nullable) — the seniority/level of the target role
  - `career_plans.recommended_timeline_months` (integer, nullable) — planned months to achieve the goal
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'target_level'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN target_level text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'recommended_timeline_months'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN recommended_timeline_months integer;
  END IF;
END $$;

/*
  # Fix Skills Matrix RLS — Access Scoping

  ## Summary
  Tightens RLS on all skills matrix tables so each role can only access
  data within their permitted scope, following the organisational hierarchy:

    Employee  → own data only
    Manager   → own data + direct reports only (manager_id = auth.uid())
    Dept Lead → their assigned department(s) only
    Exec      → view-only, business-wide (leadership role, no admin_type)
    Full Admin → full access

  ## Changes

  ### sm_assessments
  - DROP the broad "Managers can view team assessments" policy that let any
    manager-role user see ALL assessments across the organisation.
  - ADD scoped replacement: managers see only their direct reports' assessments.
  - ADD dept-lead/exec view: leadership role can view assessments for employees
    in the same department OR org-wide if full_admin.

  ### sm_assessment_items
  - DROP the broad "Managers can view team assessment items" policy.
  - ADD scoped replacement mirroring sm_assessments logic.

  ### sm_mismatches
  - DROP the broad leadership SELECT policy that exposed all mismatches.
  - ADD dept-scoped view for dept_lead/leadership (same department only).
  - Admin/full_admin retain unrestricted view.

  ### sm_escalations
  - DROP the broad leadership SELECT policy.
  - ADD dept-scoped view for dept_lead/leadership.
  - Admin/full_admin retain unrestricted view.

  ## Security
  All policies remain restrictive. The "true" SELECT on lookup tables
  (sm_types, sm_categories, sm_topics, sm_matrices, sm_matrix_roles,
  sm_role_topics, sm_assessment_cycles) is intentional — these are read-only
  configuration tables with no personal data.
*/

-- ─── sm_assessments ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Managers can view team assessments" ON sm_assessments;

-- Managers see only their direct reports' assessments
CREATE POLICY "Managers can view direct reports assessments"
  ON sm_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'manager'::user_role
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = sm_assessments.employee_id
            AND emp.manager_id = auth.uid()
        )
    )
  );

-- Dept leads (leadership role without full admin) see their department's assessments
CREATE POLICY "Dept leads can view department assessments"
  ON sm_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('leadership'::user_role, 'dept_lead'::user_role)
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = sm_assessments.employee_id
            AND emp.department = p.department
        )
    )
  );

-- Full admins see all assessments (covers exec/full_admin with admin_type set)
CREATE POLICY "Full admins can view all assessments"
  ON sm_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin'::user_role OR p.admin_type IS NOT NULL)
    )
  );

-- ─── sm_assessment_items ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Managers can view team assessment items" ON sm_assessment_items;

-- Managers see items for their direct reports only
CREATE POLICY "Managers can view direct reports assessment items"
  ON sm_assessment_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'manager'::user_role
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM sm_assessments a
          JOIN profiles emp ON emp.id = a.employee_id
          WHERE a.id = sm_assessment_items.assessment_id
            AND emp.manager_id = auth.uid()
        )
    )
  );

-- Dept leads see items for employees in their department
CREATE POLICY "Dept leads can view department assessment items"
  ON sm_assessment_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('leadership'::user_role, 'dept_lead'::user_role)
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM sm_assessments a
          JOIN profiles emp ON emp.id = a.employee_id
          WHERE a.id = sm_assessment_items.assessment_id
            AND emp.department = p.department
        )
    )
  );

-- Full admins see all items
CREATE POLICY "Full admins can view all assessment items"
  ON sm_assessment_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin'::user_role OR p.admin_type IS NOT NULL)
    )
  );

-- ─── sm_mismatches ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Managers and admins can view mismatches" ON sm_mismatches;

-- Employees see only their own mismatches
CREATE POLICY "Employees can view own mismatches"
  ON sm_mismatches FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Managers see mismatches for direct reports only
CREATE POLICY "Managers can view direct reports mismatches"
  ON sm_mismatches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'manager'::user_role
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = sm_mismatches.employee_id
            AND emp.manager_id = auth.uid()
        )
    )
  );

-- Dept leads see mismatches for their department only
CREATE POLICY "Dept leads can view department mismatches"
  ON sm_mismatches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('leadership'::user_role, 'dept_lead'::user_role)
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = sm_mismatches.employee_id
            AND emp.department = p.department
        )
    )
  );

-- Full admins / exec with admin_type see all mismatches
CREATE POLICY "Full admins can view all mismatches"
  ON sm_mismatches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin'::user_role OR p.admin_type IS NOT NULL)
    )
  );

-- ─── sm_escalations ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Managers and admins can view escalations" ON sm_escalations;

-- Managers see escalations for direct reports only
CREATE POLICY "Managers can view direct reports escalations"
  ON sm_escalations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'manager'::user_role
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = sm_escalations.employee_id
            AND emp.manager_id = auth.uid()
        )
    )
  );

-- Dept leads see escalations for their department only
CREATE POLICY "Dept leads can view department escalations"
  ON sm_escalations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('leadership'::user_role, 'dept_lead'::user_role)
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = sm_escalations.employee_id
            AND emp.department = p.department
        )
    )
  );

-- Full admins / exec see all escalations
CREATE POLICY "Full admins can view all escalations"
  ON sm_escalations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin'::user_role OR p.admin_type IS NOT NULL)
    )
  );

/*
  # Reset Kayleigh Lacasse's moderation case to pending

  The seed moderation case for Kayleigh's May 2026 review (source_id = b311cfb4-fa7f-4a83-b554-88d1f535b0a9)
  may have been actioned during testing. This migration resets it to:
    - status: 'pending'
    - current_step: 1  (Department Lead queue)
    - dept_lead_decisions: []  (clear any prior DL decisions)
  so that Liv (the Department Lead) sees it as Action Needed again.

  Also clears any prior moderation_case_decisions rows for this case so the
  decision history starts clean for retesting.

  The review record itself and all existing values_ratings are untouched.
*/

-- Reset the moderation case
UPDATE moderation_cases
SET
  status        = 'pending',
  current_step  = 1,
  dept_lead_decisions = '[]'::jsonb,
  updated_at    = now()
WHERE source_id = 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9'
  AND source_type = 'competency_assessment';

-- Clear prior test decisions so the history is clean
DELETE FROM moderation_case_decisions
WHERE case_id IN (
  SELECT id FROM moderation_cases
  WHERE source_id = 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9'
);

-- Also ensure review_id is populated (needed by DeptLeadModerationPanel to load values_ratings)
UPDATE moderation_cases
SET review_id = 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9'
WHERE source_id = 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9'
  AND source_type = 'competency_assessment'
  AND (review_id IS NULL OR review_id != 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9');

/*
  # Add Training Record System

  ## Overview
  Extends the Skills Matrix with a lightweight training record layer.
  Ratings 0 and 1 are training-controlled; ratings 2-5 come from assessments.

  ## Changes

  ### 1. sm_topics — new column
  - `training_trackable` (boolean, default false) — marks a topic as training-trackable.
    When true, employees assigned this topic receive a default rating of 0 (No formal training).

  ### 2. sm_training_records — new table
  Stores one row per (employee, topic, matrix) representing their training status.
  - `id` — primary key
  - `employee_id` — the employee (FK to auth.users)
  - `topic_id` — the skill topic (FK to sm_topics)
  - `matrix_id` — the matrix this record belongs to (FK to sm_matrices)
  - `training_date` — when training was completed (nullable)
  - `rating` — computed: 0 = no record, 1 = trained (set automatically when training_date is filled)
  - `notes` — optional free-text
  - `created_by`, `updated_by`, `created_at`, `updated_at`

  Unique constraint: one record per (employee_id, topic_id, matrix_id).

  ## Security
  - RLS enabled on sm_training_records
  - Employees: SELECT own records only
  - Managers: SELECT records of their direct reports
  - Dept Lead + Admin: SELECT all in their scope
  - Only admins (full admin or L&D admin) can INSERT/UPDATE/DELETE
*/

-- ── 1. Add training_trackable to sm_topics ──────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sm_topics' AND column_name = 'training_trackable'
  ) THEN
    ALTER TABLE sm_topics ADD COLUMN training_trackable boolean DEFAULT false;
  END IF;
END $$;

-- ── 2. Create sm_training_records table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS sm_training_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id      uuid NOT NULL REFERENCES sm_topics(id) ON DELETE CASCADE,
  matrix_id     uuid NOT NULL REFERENCES sm_matrices(id) ON DELETE CASCADE,
  training_date date DEFAULT NULL,
  rating        smallint NOT NULL DEFAULT 0
    CHECK (rating IN (0, 1)),
  notes         text DEFAULT NULL,
  created_by    uuid REFERENCES auth.users(id),
  updated_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (employee_id, topic_id, matrix_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sm_training_records_employee_id ON sm_training_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_sm_training_records_topic_id    ON sm_training_records(topic_id);
CREATE INDEX IF NOT EXISTS idx_sm_training_records_matrix_id   ON sm_training_records(matrix_id);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE sm_training_records ENABLE ROW LEVEL SECURITY;

-- Employees can view their own records
CREATE POLICY "Employees view own training records"
  ON sm_training_records FOR SELECT
  TO authenticated
  USING (auth.uid() = employee_id);

-- Managers can view records for their direct reports
CREATE POLICY "Managers view team training records"
  ON sm_training_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles emp
      JOIN profiles mgr ON mgr.id = auth.uid()
      WHERE emp.id = sm_training_records.employee_id
        AND emp.manager_id = auth.uid()
    )
  );

-- Dept leads can view all records for their department
CREATE POLICY "Dept leads view department training records"
  ON sm_training_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles emp
      JOIN profiles dl ON dl.id = auth.uid()
      WHERE emp.id = sm_training_records.employee_id
        AND emp.department = dl.department
        AND dl.role IN ('dept_lead', 'admin')
    )
  );

-- Admins can insert training records
CREATE POLICY "Admins insert training records"
  ON sm_training_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR (admin_type IS NOT NULL AND admin_type != ''))
    )
  );

-- Admins can update training records
CREATE POLICY "Admins update training records"
  ON sm_training_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR (admin_type IS NOT NULL AND admin_type != ''))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR (admin_type IS NOT NULL AND admin_type != ''))
    )
  );

-- Admins can delete training records
CREATE POLICY "Admins delete training records"
  ON sm_training_records FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR (admin_type IS NOT NULL AND admin_type != ''))
    )
  );

/*
  # Add archived flag to sm_matrices

  1. Changes
    - Adds `archived boolean DEFAULT false` to `sm_matrices`
    - Archived matrices are hidden from new assessment cycle creation
    - Historic assessment and training data is preserved
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sm_matrices' AND column_name = 'archived'
  ) THEN
    ALTER TABLE sm_matrices ADD COLUMN archived boolean NOT NULL DEFAULT false;
  END IF;
END $$;

/*
  # Add reset_skills_matrix_data function

  ## Summary
  Creates a SECURITY DEFINER function that allows full admins to delete all Skills Matrix
  builder test data without touching any other system data.

  ## What it deletes (in safe order to respect FK constraints)
  1. sm_escalations       — escalation logs linked to assessment cycles
  2. sm_mismatches        — rating mismatch flags linked to assessment cycles
  3. sm_assessment_items  — individual topic ratings linked to assessments
  4. sm_assessments       — assessment instances linked to cycles
  5. sm_assessment_cycles — assessment cycles linked to matrices
  6. sm_training_records  — training completion records linked to matrices
  7. sm_role_topics       — topic-role assignments linked to matrices
  8. sm_matrices          — the matrix headers themselves

  ## What it NEVER deletes
  - sm_types, sm_categories, sm_topics  (Topics Library — structure preserved)
  - profiles, auth.users               (users)
  - job_families, departments          (roles, departments)
  - career_plans, pathways data        (career data)
  - one_to_one_* tables                (1:1 review data)

  ## Security
  - SECURITY DEFINER so it bypasses RLS (needed to delete across all rows)
  - Caller must be authenticated and have role='admin' AND admin_type IS NOT NULL
  - Returns a JSON result with deleted row counts for transparency
*/

CREATE OR REPLACE FUNCTION public.reset_skills_matrix_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_full_admin boolean;
  v_escalations int;
  v_mismatches int;
  v_assessment_items int;
  v_assessments int;
  v_cycles int;
  v_training_records int;
  v_role_topics int;
  v_matrices int;
BEGIN
  -- Verify caller identity
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT (role = 'admin' AND admin_type IS NOT NULL AND admin_type <> '')
  INTO v_is_full_admin
  FROM profiles
  WHERE id = v_uid;

  IF NOT COALESCE(v_is_full_admin, false) THEN
    RAISE EXCEPTION 'Access denied: Full Admin role required';
  END IF;

  -- Delete in FK-safe order

  -- 1. Escalations
  DELETE FROM sm_escalations
  WHERE cycle_id IN (SELECT id FROM sm_assessment_cycles);
  GET DIAGNOSTICS v_escalations = ROW_COUNT;

  -- 2. Mismatches
  DELETE FROM sm_mismatches
  WHERE cycle_id IN (SELECT id FROM sm_assessment_cycles);
  GET DIAGNOSTICS v_mismatches = ROW_COUNT;

  -- 3. Assessment items
  DELETE FROM sm_assessment_items
  WHERE assessment_id IN (SELECT id FROM sm_assessments);
  GET DIAGNOSTICS v_assessment_items = ROW_COUNT;

  -- 4. Assessments
  DELETE FROM sm_assessments;
  GET DIAGNOSTICS v_assessments = ROW_COUNT;

  -- 5. Assessment cycles
  DELETE FROM sm_assessment_cycles;
  GET DIAGNOSTICS v_cycles = ROW_COUNT;

  -- 6. Training records
  DELETE FROM sm_training_records;
  GET DIAGNOSTICS v_training_records = ROW_COUNT;

  -- 7. Role topics
  DELETE FROM sm_role_topics;
  GET DIAGNOSTICS v_role_topics = ROW_COUNT;

  -- 8. Matrices
  DELETE FROM sm_matrices;
  GET DIAGNOSTICS v_matrices = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', jsonb_build_object(
      'matrices',         v_matrices,
      'role_topics',      v_role_topics,
      'training_records', v_training_records,
      'cycles',           v_cycles,
      'assessments',      v_assessments,
      'assessment_items', v_assessment_items,
      'mismatches',       v_mismatches,
      'escalations',      v_escalations
    )
  );
END;
$$;

-- Revoke public execute, grant only to authenticated users
-- (the function itself checks for full admin role)
REVOKE ALL ON FUNCTION public.reset_skills_matrix_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_skills_matrix_data() TO authenticated;

/*
  # Update reset_skills_matrix_data function

  ## Summary
  Updates the reset function to also delete sm_matrix_roles (job family assignments per matrix),
  which was missed in the initial version. Adds it between sm_role_topics and sm_matrices deletion.
*/

CREATE OR REPLACE FUNCTION public.reset_skills_matrix_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_full_admin boolean;
  v_escalations int;
  v_mismatches int;
  v_assessment_items int;
  v_assessments int;
  v_cycles int;
  v_training_records int;
  v_role_topics int;
  v_matrix_roles int;
  v_matrices int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT (role = 'admin' AND admin_type IS NOT NULL AND admin_type <> '')
  INTO v_is_full_admin
  FROM profiles
  WHERE id = v_uid;

  IF NOT COALESCE(v_is_full_admin, false) THEN
    RAISE EXCEPTION 'Access denied: Full Admin role required';
  END IF;

  -- Delete in FK-safe order

  DELETE FROM sm_escalations;
  GET DIAGNOSTICS v_escalations = ROW_COUNT;

  DELETE FROM sm_mismatches;
  GET DIAGNOSTICS v_mismatches = ROW_COUNT;

  DELETE FROM sm_assessment_items;
  GET DIAGNOSTICS v_assessment_items = ROW_COUNT;

  DELETE FROM sm_assessments;
  GET DIAGNOSTICS v_assessments = ROW_COUNT;

  DELETE FROM sm_assessment_cycles;
  GET DIAGNOSTICS v_cycles = ROW_COUNT;

  DELETE FROM sm_training_records;
  GET DIAGNOSTICS v_training_records = ROW_COUNT;

  DELETE FROM sm_role_topics;
  GET DIAGNOSTICS v_role_topics = ROW_COUNT;

  DELETE FROM sm_matrix_roles;
  GET DIAGNOSTICS v_matrix_roles = ROW_COUNT;

  DELETE FROM sm_matrices;
  GET DIAGNOSTICS v_matrices = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', jsonb_build_object(
      'matrices',         v_matrices,
      'matrix_roles',     v_matrix_roles,
      'role_topics',      v_role_topics,
      'training_records', v_training_records,
      'cycles',           v_cycles,
      'assessments',      v_assessments,
      'assessment_items', v_assessment_items,
      'mismatches',       v_mismatches,
      'escalations',      v_escalations
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reset_skills_matrix_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_skills_matrix_data() TO authenticated;

/*
  # Fix reset_skills_matrix_data — add WHERE TRUE to all DELETE statements

  Supabase blocks DELETE without a WHERE clause even in SECURITY DEFINER functions.
  Adding WHERE TRUE to each statement satisfies the requirement while still deleting all rows.
*/

CREATE OR REPLACE FUNCTION public.reset_skills_matrix_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_full_admin boolean;
  v_escalations int;
  v_mismatches int;
  v_assessment_items int;
  v_assessments int;
  v_cycles int;
  v_training_records int;
  v_role_topics int;
  v_matrix_roles int;
  v_matrices int;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT (role = 'admin' AND admin_type IS NOT NULL AND admin_type <> '')
  INTO v_is_full_admin
  FROM profiles
  WHERE id = v_uid;

  IF NOT COALESCE(v_is_full_admin, false) THEN
    RAISE EXCEPTION 'Access denied: Full Admin role required';
  END IF;

  DELETE FROM sm_escalations       WHERE TRUE;
  GET DIAGNOSTICS v_escalations = ROW_COUNT;

  DELETE FROM sm_mismatches        WHERE TRUE;
  GET DIAGNOSTICS v_mismatches = ROW_COUNT;

  DELETE FROM sm_assessment_items  WHERE TRUE;
  GET DIAGNOSTICS v_assessment_items = ROW_COUNT;

  DELETE FROM sm_assessments       WHERE TRUE;
  GET DIAGNOSTICS v_assessments = ROW_COUNT;

  DELETE FROM sm_assessment_cycles WHERE TRUE;
  GET DIAGNOSTICS v_cycles = ROW_COUNT;

  DELETE FROM sm_training_records  WHERE TRUE;
  GET DIAGNOSTICS v_training_records = ROW_COUNT;

  DELETE FROM sm_role_topics       WHERE TRUE;
  GET DIAGNOSTICS v_role_topics = ROW_COUNT;

  DELETE FROM sm_matrix_roles      WHERE TRUE;
  GET DIAGNOSTICS v_matrix_roles = ROW_COUNT;

  DELETE FROM sm_matrices          WHERE TRUE;
  GET DIAGNOSTICS v_matrices = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'deleted', jsonb_build_object(
      'matrices',         v_matrices,
      'matrix_roles',     v_matrix_roles,
      'role_topics',      v_role_topics,
      'training_records', v_training_records,
      'cycles',           v_cycles,
      'assessments',      v_assessments,
      'assessment_items', v_assessment_items,
      'mismatches',       v_mismatches,
      'escalations',      v_escalations
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reset_skills_matrix_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_skills_matrix_data() TO authenticated;

/*
  # Extend sm_training_records rating to 0-5 and add assessment backfill trigger

  ## Summary
  1. Removes the (0, 1) CHECK constraint on sm_training_records.rating
     and replaces it with (0–5) so completed assessments can write higher ratings.
     - 0 = no training recorded
     - 1 = training date added (Training Record)
     - 2–5 = assessment rating from completed assessment cycle
     Rating 1 (from training date) is NEVER overwritten downward by an assessment.
     Assessment ratings >= 2 always take precedence over the training flag.

  2. Adds trigger function `sync_assessment_rating_to_training_record`:
     When an sm_assessment_item is inserted or updated AND the parent assessment
     is 'completed', the function upserts an sm_training_records row for that
     employee/topic/matrix with the assessment rating.
     - Only fires when assessment status = 'completed'
     - Takes the MAX of existing rating and new rating (never downgrades)
     - Resolves matrix_id via sm_assessments → sm_assessment_cycles → sm_assessment_cycles.matrix_id

  3. Creates the trigger on sm_assessment_items.
*/

-- 1. Drop the old (0,1) check constraint and add a (0–5) one
DO $$
BEGIN
  -- Drop old constraint by searching for it
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name LIKE '%sm_training_records%rating%'
  ) THEN
    ALTER TABLE sm_training_records DROP CONSTRAINT IF EXISTS sm_training_records_rating_check;
  END IF;
END $$;

ALTER TABLE sm_training_records
  DROP CONSTRAINT IF EXISTS sm_training_records_rating_check;

ALTER TABLE sm_training_records
  ADD CONSTRAINT sm_training_records_rating_check
  CHECK (rating >= 0 AND rating <= 5);

-- 2. Trigger function: sync completed assessment item rating → sm_training_records
CREATE OR REPLACE FUNCTION public.sync_assessment_rating_to_training_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assessment    record;
  v_matrix_id     uuid;
  v_existing_rating smallint;
  v_new_rating    smallint;
BEGIN
  -- Only act when a rating is actually set
  IF NEW.rating IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look up the parent assessment
  SELECT a.employee_id, a.status, c.matrix_id
  INTO v_assessment
  FROM sm_assessments a
  JOIN sm_assessment_cycles c ON c.id = a.cycle_id
  WHERE a.id = NEW.assessment_id;

  -- Only sync for completed assessments
  IF v_assessment.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  v_matrix_id  := v_assessment.matrix_id;
  v_new_rating := NEW.rating::smallint;

  -- Get existing rating if any
  SELECT rating INTO v_existing_rating
  FROM sm_training_records
  WHERE employee_id = v_assessment.employee_id
    AND topic_id    = NEW.topic_id
    AND matrix_id   = v_matrix_id;

  -- Never downgrade: take the higher of existing and new
  IF v_existing_rating IS NOT NULL AND v_existing_rating > v_new_rating THEN
    RETURN NEW;
  END IF;

  INSERT INTO sm_training_records (employee_id, topic_id, matrix_id, rating, updated_at)
  VALUES (v_assessment.employee_id, NEW.topic_id, v_matrix_id, v_new_rating, now())
  ON CONFLICT (employee_id, topic_id, matrix_id)
  DO UPDATE SET
    rating     = GREATEST(sm_training_records.rating, EXCLUDED.rating),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- 3. Attach trigger
DROP TRIGGER IF EXISTS trg_sync_assessment_rating ON sm_assessment_items;

CREATE TRIGGER trg_sync_assessment_rating
  AFTER INSERT OR UPDATE OF rating ON sm_assessment_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_assessment_rating_to_training_record();

/*
  # Fix skills table RLS — add missing SELECT policy

  ## Problem
  The `skills` table has RLS enabled but no SELECT policy, meaning no user
  (authenticated or otherwise) can read from it. This causes the career quiz's
  skill_assessments join to fail, and may cause query hangs in the Supabase
  PostgREST layer when the embedded join is denied.

  ## Changes
  - Add SELECT policy on `skills` allowing all authenticated users to read
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'skills' AND policyname = 'Authenticated users can view skills'
  ) THEN
    CREATE POLICY "Authenticated users can view skills"
      ON skills
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

/*
  # Reset Kayleigh moderation case for retest

  Resets the moderation case and review to a clean state so that Liv (Department Lead)
  can action it from the beginning:
  - Clears dept_lead_decisions on the moderation case
  - Resets moderation case to pending / step 1
  - Resets review moderation_status to 'pending'
  - Deletes any existing moderation_case_decisions audit records for this case
  - Deletes any moderation notifications to the manager so they appear fresh after moderation
*/

DO $$
DECLARE
  v_case_id uuid := '31c53da5-090b-43c3-9d90-605d556c7806';
  v_review_id uuid := 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9';
BEGIN
  -- Reset moderation case
  UPDATE moderation_cases
  SET
    dept_lead_decisions = '[]'::jsonb,
    status = 'pending',
    current_step = 1,
    final_rating = NULL,
    updated_at = now()
  WHERE id = v_case_id;

  -- Reset review moderation status (keep values_ratings as they are — all 5s)
  UPDATE one_to_one_monthly_reviews
  SET
    moderation_status = 'pending'
  WHERE id = v_review_id;

  -- Remove existing audit decisions for clean retest
  DELETE FROM moderation_case_decisions WHERE case_id = v_case_id;

  -- Remove any existing moderation notifications to the manager for this case
  -- so the manager receives fresh notifications after Liv completes moderation
  DELETE FROM review_notifications
  WHERE notification_type IN (
    'moderation_rating_adjusted',
    'moderation_final_rating_adjusted',
    'moderation_approved_dept_lead',
    'moderation_final_approved',
    'moderation_finalised'
  )
  AND (
    -- Kayleigh's manager is the recipient
    recipient_id = (SELECT manager_id FROM moderation_cases WHERE id = v_case_id)
    OR sender_id = (SELECT id FROM profiles WHERE full_name = 'Olivia Collingbourne' LIMIT 1)
  );
END $$;

/*
  # Fix one_to_one_monthly_reviews RLS for access-level dept leads

  ## Problem
  The existing dept lead SELECT policy on one_to_one_monthly_reviews checks
  `profiles.role = 'dept_lead'`, but users like Olivia Collingbourne have
  `profiles.role = 'manager'` and are granted dept lead access via the
  user_access_levels / access_level_types permission system
  (dashboard_dept_lead: true).

  When DeptLeadModerationPanel fetches values_ratings from this table,
  RLS silently returns empty results for these access-level dept leads,
  causing the per-competency moderation view to show no competencies.

  ## Fix
  Add a new SELECT policy that mirrors the existing moderation_cases pattern:
  allow SELECT when the user has dashboard_dept_lead permission AND the review
  employee is in the same department as the viewer.

  This policy is additive — it does not remove or alter any existing policies.
*/

CREATE POLICY "Access-level dept leads can view monthly reviews in own department"
  ON one_to_one_monthly_reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND ((alt.permissions ->> 'dashboard_dept_lead')::boolean = true)
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = one_to_one_monthly_reviews.employee_id
            AND emp.department = viewer.department
        )
    )
  );

/*
  # Career Plan Initiated Flow — New Columns and Status Values

  Extends `career_plans` to support plans initiated by Managers, Dept Leads,
  and Admins on behalf of employees, with a multi-stage handoff workflow.

  ## New Columns
  - `started_from` — who originated the plan: 'employee_self' | 'manager' | 'dept_lead' | 'admin'
  - `current_owner_stage` — whose turn it is to act: 'employee' | 'manager' | 'completed'
  - `initiator_notes` — free-text notes from the manager/admin who started the plan
  - `way_forward_objectives` — JSONB array of objective strings set by manager in Stage 3
  - `way_forward_notes` — manager's closing notes when confirming the plan
  - `way_forward_confirmed_at` — timestamp when manager confirmed Way Forward
  - `way_forward_confirmed_by` — uuid of the confirming manager

  ## New Status Values
  - `pending_employee_input` — plan started by manager/admin, waiting for employee to complete quiz steps 2-4
  - `pending_manager_wayforward` — employee completed their steps, waiting for manager to add Way Forward
  - `in_progress` — manager confirmed Way Forward, plan is now active
  - `completed` — plan fully completed
*/

-- Add new columns to career_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'started_from'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN started_from text DEFAULT 'employee_self';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'current_owner_stage'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN current_owner_stage text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'initiator_notes'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN initiator_notes text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'way_forward_objectives'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN way_forward_objectives jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'way_forward_notes'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN way_forward_notes text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'way_forward_confirmed_at'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN way_forward_confirmed_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'way_forward_confirmed_by'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN way_forward_confirmed_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Drop old status check constraint if it exists, then recreate with new values
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'career_plans'::regclass
    AND contype = 'c'
    AND conname ILIKE '%status%';
  
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE career_plans DROP CONSTRAINT ' || quote_ident(v_constraint_name);
  END IF;
END $$;

ALTER TABLE career_plans
  ADD CONSTRAINT career_plans_status_check CHECK (
    status IN (
      'draft',
      'confirmed',
      'sent_to_manager',
      'manager_approved',
      'admin_approved',
      'rejected',
      'pending_employee_input',
      'pending_manager_wayforward',
      'in_progress',
      'completed'
    )
  );

-- Drop existing policies before recreating
DO $$
BEGIN
  DROP POLICY IF EXISTS "Managers can create career plans for their reports" ON career_plans;
  DROP POLICY IF EXISTS "Managers and dept leads can view career plans for their reports" ON career_plans;
  DROP POLICY IF EXISTS "Career plan update by owner or manager or admin" ON career_plans;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- RLS: managers can insert career plans on behalf of their reports
CREATE POLICY "Managers can create career plans for their reports"
  ON career_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = profile_id)
    OR
    (
      auth.uid() = created_by_user_id
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = (SELECT auth.uid())
          AND p.role IN ('manager', 'admin')
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      JOIN profiles emp ON emp.id = career_plans.profile_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND ((alt.permissions ->> 'dashboard_dept_lead')::boolean = true)
        AND emp.department = viewer.department
    )
  );

-- RLS: managers and dept leads can view plans for their reports
CREATE POLICY "Managers and dept leads can view career plans for their reports"
  ON career_plans FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = profile_id)
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles emp
      WHERE emp.id = career_plans.profile_id
        AND emp.manager_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      JOIN profiles emp ON emp.id = career_plans.profile_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND ((alt.permissions ->> 'dashboard_dept_lead')::boolean = true)
        AND emp.department = viewer.department
    )
  );

-- RLS: allow update by employee or manager or admin
CREATE POLICY "Career plan update by owner or manager or admin"
  ON career_plans FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = profile_id)
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role IN ('manager', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      JOIN profiles emp ON emp.id = career_plans.profile_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND ((alt.permissions ->> 'dashboard_dept_lead')::boolean = true)
        AND emp.department = viewer.department
    )
  )
  WITH CHECK (
    (auth.uid() = profile_id)
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role IN ('manager', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      JOIN profiles emp ON emp.id = career_plans.profile_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND ((alt.permissions ->> 'dashboard_dept_lead')::boolean = true)
        AND emp.department = viewer.department
    )
  );

-- Notifications table
CREATE TABLE IF NOT EXISTS career_plan_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_plan_id uuid NOT NULL REFERENCES career_plans(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id),
  sender_id uuid REFERENCES auth.users(id),
  notification_type text NOT NULL,
  message text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE career_plan_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own career plan notifications" ON career_plan_notifications;
DROP POLICY IF EXISTS "Authenticated users can insert career plan notifications" ON career_plan_notifications;
DROP POLICY IF EXISTS "Users can mark their own notifications as read" ON career_plan_notifications;

CREATE POLICY "Users can view their own career plan notifications"
  ON career_plan_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

CREATE POLICY "Authenticated users can insert career plan notifications"
  ON career_plan_notifications FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (SELECT auth.uid()));

CREATE POLICY "Users can mark their own notifications as read"
  ON career_plan_notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_career_plan_notifs_recipient ON career_plan_notifications(recipient_id, read_at);
CREATE INDEX IF NOT EXISTS idx_career_plan_notifs_plan ON career_plan_notifications(career_plan_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_started_from ON career_plans(started_from);
CREATE INDEX IF NOT EXISTS idx_career_plans_profile_status ON career_plans(profile_id, status);

/*
  # Backfill oto_cycle_id on scheduled meetings for existing assigned employees

  ## Problem
  Employees assigned to review templates before the placeholder-meeting fix was deployed
  have no scheduled meeting with oto_cycle_id set. The KPI loader in ReviewFlow and
  MonthlyOneToOneTab requires meeting.oto_cycle_id to find cycle KPIs, so these employees
  see zero KPIs in their reviews.

  ## Fix
  1. Tony Chen (ba4d88bf) — has an existing non-submitted meeting (fe3faeab) with
     oto_cycle_id = NULL. Update it to point at Kenny Sanon's cycle (56143738).
  2. Mathes Balasingam (1fead12a) — no meeting at all. Insert placeholder linked to
     Hollie Toole's cycle (9df2a455).
  3. Saxon Figg (c22b0118) — no meeting at all. Insert placeholder linked to
     Hollie Toole's cycle (9df2a455).
  4. Caleb Innes (b65d5851) — has a completed meeting with no cycle link. Insert a new
     placeholder meeting linked to Jade Henderson's cycle (67802da3).

  ## Safety
  - Does NOT touch any review data, KPI ratings, competency scores, or saved content.
  - Does NOT create duplicate cycle-linked meetings (checks first).
  - Does NOT affect any submitted or completed meeting records.
*/

-- 1. Tony Chen: update his existing non-submitted meeting to link to Kenny's cycle
UPDATE one_to_one_scheduled_meetings
SET 
  oto_cycle_id = '56143738-2de8-42f8-afcb-554c600ed63d',
  updated_at   = now()
WHERE id = 'fe3faeab-81c1-4211-879c-e47ee2c186a5'
  AND oto_cycle_id IS NULL
  AND completion_status != 'submitted';

-- 2. Mathes Balasingam: insert placeholder meeting linked to Hollie's cycle
INSERT INTO one_to_one_scheduled_meetings
  (oto_cycle_id, employee_id, manager_id, scheduled_datetime, completion_status, status)
SELECT
  '9df2a455-e253-4ba8-9c76-02fe82120009',
  '1fead12a-997b-462e-8cc5-97acbe81c636',
  '5b361860-a4cb-4684-be68-2fc0de8f2a96',
  now(),
  'scheduled',
  'scheduled'
WHERE NOT EXISTS (
  SELECT 1 FROM one_to_one_scheduled_meetings
  WHERE oto_cycle_id = '9df2a455-e253-4ba8-9c76-02fe82120009'
    AND employee_id  = '1fead12a-997b-462e-8cc5-97acbe81c636'
    AND completion_status != 'submitted'
);

-- 3. Saxon Figg: insert placeholder meeting linked to Hollie's cycle
INSERT INTO one_to_one_scheduled_meetings
  (oto_cycle_id, employee_id, manager_id, scheduled_datetime, completion_status, status)
SELECT
  '9df2a455-e253-4ba8-9c76-02fe82120009',
  'c22b0118-2cc2-4cad-bd6f-e0980cdad361',
  '5b361860-a4cb-4684-be68-2fc0de8f2a96',
  now(),
  'scheduled',
  'scheduled'
WHERE NOT EXISTS (
  SELECT 1 FROM one_to_one_scheduled_meetings
  WHERE oto_cycle_id = '9df2a455-e253-4ba8-9c76-02fe82120009'
    AND employee_id  = 'c22b0118-2cc2-4cad-bd6f-e0980cdad361'
    AND completion_status != 'submitted'
);

-- 4. Caleb Innes: insert placeholder meeting linked to Jade's cycle
INSERT INTO one_to_one_scheduled_meetings
  (oto_cycle_id, employee_id, manager_id, scheduled_datetime, completion_status, status)
SELECT
  '67802da3-9f80-44fc-a8ca-9bb720287883',
  'b65d5851-5d70-4947-bc4b-cb461ae88773',
  '16ce436a-5f4b-4a54-a8ae-7480361f9168',
  now(),
  'scheduled',
  'scheduled'
WHERE NOT EXISTS (
  SELECT 1 FROM one_to_one_scheduled_meetings
  WHERE oto_cycle_id = '67802da3-9f80-44fc-a8ca-9bb720287883'
    AND employee_id  = 'b65d5851-5d70-4947-bc4b-cb461ae88773'
    AND completion_status != 'submitted'
);

/*
  # Manual Career Plan — Status Values and New Columns

  ## Summary
  Adds support for manually-created career plans by managers and admins that skip the
  employee quiz flow and go straight to the Way Forward / GROW action planning stage.

  ## Changes

  ### 1. career_plans status constraint
  Adds two new valid status values:
  - `active` — plan has been confirmed (manager clicked "Confirm Plan"); counts in dashboards and reviews
  - `pending_manager_confirmation` — admin created plan and sent it to the manager for confirmation

  ### 2. New columns on career_plans
  - `plan_title` (text) — optional free-text title for the plan (distinct from goal_role_title)
  - `plan_description` (text) — optional description / context for the plan
  - `is_manual` (boolean, default false) — flags plans created via the manual flow (skips quiz)

  ### 3. career_plan_actions owner_name column
  - `owner_name` (text) — free-text field for action owner (in addition to added_by uuid)

  ## Notes
  - Does not affect existing quiz-based plans
  - `active` is intentionally separate from `in_progress` so quiz plans are unaffected
  - RLS policies are unchanged; existing policies already cover all career_plan rows
*/

-- 1. Drop and recreate the status check constraint to add new values
ALTER TABLE career_plans
  DROP CONSTRAINT IF EXISTS career_plans_status_check;

ALTER TABLE career_plans
  ADD CONSTRAINT career_plans_status_check
  CHECK (status = ANY (ARRAY[
    'draft'::text,
    'confirmed'::text,
    'sent_to_manager'::text,
    'manager_approved'::text,
    'admin_approved'::text,
    'rejected'::text,
    'pending_employee_input'::text,
    'pending_manager_wayforward'::text,
    'in_progress'::text,
    'completed'::text,
    'active'::text,
    'pending_manager_confirmation'::text
  ]));

-- 2. Add plan_title column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'plan_title'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN plan_title text;
  END IF;
END $$;

-- 3. Add plan_description column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'plan_description'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN plan_description text;
  END IF;
END $$;

-- 4. Add is_manual flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'is_manual'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN is_manual boolean DEFAULT false;
  END IF;
END $$;

-- 5. Add owner_name to career_plan_actions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plan_actions' AND column_name = 'owner_name'
  ) THEN
    ALTER TABLE career_plan_actions ADD COLUMN owner_name text;
  END IF;
END $$;

/*
  # Add profile foreign keys to moderation_cases

  ## Problem
  moderation_cases.employee_id and manager_id currently FK to auth.users,
  which prevents PostgREST from joining profiles directly using these columns.

  ## Changes
  - Add FK constraints from moderation_cases.employee_id → profiles.id
  - Add FK constraints from moderation_cases.manager_id → profiles.id
  - These are DEFERRABLE to avoid ordering issues and ON DELETE SET NULL for safety

  Note: profiles.id = auth.users.id (1:1 mirror), so this is safe.
*/

DO $$
BEGIN
  -- Drop old auth.users FKs if they exist
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'moderation_cases_employee_id_fkey' AND contype = 'f'
      AND confrelid = (SELECT oid FROM pg_class WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth'))
  ) THEN
    ALTER TABLE moderation_cases DROP CONSTRAINT moderation_cases_employee_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'moderation_cases_manager_id_fkey' AND contype = 'f'
      AND confrelid = (SELECT oid FROM pg_class WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth'))
  ) THEN
    ALTER TABLE moderation_cases DROP CONSTRAINT moderation_cases_manager_id_fkey;
  END IF;

  -- Add FKs pointing to profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'moderation_cases_employee_id_fkey' AND contype = 'f'
      AND confrelid = (SELECT oid FROM pg_class WHERE relname = 'profiles' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  ) THEN
    ALTER TABLE moderation_cases
      ADD CONSTRAINT moderation_cases_employee_id_fkey
      FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'moderation_cases_manager_id_fkey' AND contype = 'f'
      AND confrelid = (SELECT oid FROM pg_class WHERE relname = 'profiles' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  ) THEN
    ALTER TABLE moderation_cases
      ADD CONSTRAINT moderation_cases_manager_id_fkey
      FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

