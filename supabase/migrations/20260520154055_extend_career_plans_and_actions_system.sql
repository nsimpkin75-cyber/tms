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
