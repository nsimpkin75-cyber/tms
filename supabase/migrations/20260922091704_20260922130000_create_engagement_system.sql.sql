/*
# Engagement Hub — Surveys, Outcomes & Action Planning

## Overview
Creates a complete engagement system for employee surveys, transparent
"You Said, We Did" outcomes, and role-based action planning.

## New Tables
1. engagement_surveys — Survey definitions
2. engagement_survey_questions — Questions within a survey
3. engagement_responses — Individual survey responses
4. engagement_response_answers — Answers to individual questions
5. engagement_outcomes — "You Said, We Did" entries
6. engagement_action_items — Departmental action plans

## Security (RLS)
- Surveys/questions: SELECT all authenticated; write for admins/leadership
- Responses: SELECT — employees own, managers/leadership/admins all; INSERT — own only
- Answers: SELECT via response ownership; INSERT — own response only
- Outcomes: SELECT all authenticated; write for admins/leadership
- Action items: SELECT — assigned/created or same dept or managers+; write for managers+
*/

CREATE TABLE IF NOT EXISTS engagement_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE engagement_surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_engagement_surveys" ON engagement_surveys;
CREATE POLICY "select_engagement_surveys" ON engagement_surveys FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_engagement_surveys_admin" ON engagement_surveys;
CREATE POLICY "insert_engagement_surveys_admin" ON engagement_surveys FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL OR role = 'leadership'))
  );

DROP POLICY IF EXISTS "update_engagement_surveys_admin" ON engagement_surveys;
CREATE POLICY "update_engagement_surveys_admin" ON engagement_surveys FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL OR role = 'leadership'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL OR role = 'leadership'))
  );

DROP POLICY IF EXISTS "delete_engagement_surveys_admin" ON engagement_surveys;
CREATE POLICY "delete_engagement_surveys_admin" ON engagement_surveys FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL OR role = 'leadership'))
  );

CREATE TABLE IF NOT EXISTS engagement_survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES engagement_surveys(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'scale_1_5' CHECK (question_type IN ('scale_1_5','yes_no','open_text','multiple_choice')),
  options jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE engagement_survey_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_engagement_questions" ON engagement_survey_questions;
CREATE POLICY "select_engagement_questions" ON engagement_survey_questions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_engagement_questions_admin" ON engagement_survey_questions;
CREATE POLICY "insert_engagement_questions_admin" ON engagement_survey_questions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL OR role = 'leadership'))
  );

DROP POLICY IF EXISTS "update_engagement_questions_admin" ON engagement_survey_questions;
CREATE POLICY "update_engagement_questions_admin" ON engagement_survey_questions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL OR role = 'leadership'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL OR role = 'leadership'))
  );

DROP POLICY IF EXISTS "delete_engagement_questions_admin" ON engagement_survey_questions;
CREATE POLICY "delete_engagement_questions_admin" ON engagement_survey_questions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL OR role = 'leadership'))
  );

CREATE TABLE IF NOT EXISTS engagement_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES engagement_surveys(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(survey_id, profile_id)
);

ALTER TABLE engagement_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_engagement_responses" ON engagement_responses;
CREATE POLICY "select_engagement_responses" ON engagement_responses FOR SELECT
  TO authenticated USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','leadership','senior','manager','dept_lead'))
  );

DROP POLICY IF EXISTS "insert_engagement_responses" ON engagement_responses;
CREATE POLICY "insert_engagement_responses" ON engagement_responses FOR INSERT
  TO authenticated WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "delete_engagement_responses_admin" ON engagement_responses;
CREATE POLICY "delete_engagement_responses_admin" ON engagement_responses FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  );

CREATE TABLE IF NOT EXISTS engagement_response_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES engagement_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES engagement_survey_questions(id) ON DELETE CASCADE,
  numeric_value numeric,
  text_value text,
  selected_options jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE engagement_response_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_engagement_answers" ON engagement_response_answers;
CREATE POLICY "select_engagement_answers" ON engagement_response_answers FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM engagement_responses WHERE id = response_id AND (
      profile_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','leadership','senior','manager','dept_lead'))
    ))
  );

DROP POLICY IF EXISTS "insert_engagement_answers" ON engagement_response_answers;
CREATE POLICY "insert_engagement_answers" ON engagement_response_answers FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM engagement_responses WHERE id = response_id AND profile_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS engagement_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES engagement_surveys(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'general',
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE engagement_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_engagement_outcomes" ON engagement_outcomes;
CREATE POLICY "select_engagement_outcomes" ON engagement_outcomes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_engagement_outcomes_admin" ON engagement_outcomes;
CREATE POLICY "insert_engagement_outcomes_admin" ON engagement_outcomes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL OR role = 'leadership'))
  );

DROP POLICY IF EXISTS "update_engagement_outcomes_admin" ON engagement_outcomes;
CREATE POLICY "update_engagement_outcomes_admin" ON engagement_outcomes FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL OR role = 'leadership'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL OR role = 'leadership'))
  );

DROP POLICY IF EXISTS "delete_engagement_outcomes_admin" ON engagement_outcomes;
CREATE POLICY "delete_engagement_outcomes_admin" ON engagement_outcomes FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL OR role = 'leadership'))
  );

CREATE TABLE IF NOT EXISTS engagement_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES engagement_surveys(id) ON DELETE SET NULL,
  department text,
  title text NOT NULL,
  description text DEFAULT '',
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed')),
  due_date date,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE engagement_action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_engagement_actions" ON engagement_action_items;
CREATE POLICY "select_engagement_actions" ON engagement_action_items FOR SELECT
  TO authenticated USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','leadership','senior','manager','dept_lead'))
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.department = engagement_action_items.department
    )
  );

DROP POLICY IF EXISTS "insert_engagement_actions" ON engagement_action_items;
CREATE POLICY "insert_engagement_actions" ON engagement_action_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','leadership','senior','manager','dept_lead'))
  );

DROP POLICY IF EXISTS "update_engagement_actions" ON engagement_action_items;
CREATE POLICY "update_engagement_actions" ON engagement_action_items FOR UPDATE
  TO authenticated USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','leadership','senior','manager','dept_lead'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','leadership','senior','manager','dept_lead'))
  );

DROP POLICY IF EXISTS "delete_engagement_actions_admin" ON engagement_action_items;
CREATE POLICY "delete_engagement_actions_admin" ON engagement_action_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL OR role = 'leadership'))
  );

CREATE INDEX IF NOT EXISTS idx_eng_surveys_status ON engagement_surveys(status);
CREATE INDEX IF NOT EXISTS idx_eng_questions_survey ON engagement_survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_eng_responses_survey ON engagement_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_eng_responses_profile ON engagement_responses(profile_id);
CREATE INDEX IF NOT EXISTS idx_eng_answers_response ON engagement_response_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_eng_outcomes_survey ON engagement_outcomes(survey_id);
CREATE INDEX IF NOT EXISTS idx_eng_actions_dept ON engagement_action_items(department);
CREATE INDEX IF NOT EXISTS idx_eng_actions_assigned ON engagement_action_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_eng_actions_status ON engagement_action_items(status);

-- Seed a sample active survey
INSERT INTO engagement_surveys (title, description, status)
VALUES ('Annual Colleague Engagement Survey 2026', 'Help us understand what matters most to you and how we can improve.', 'active')
ON CONFLICT DO NOTHING;
