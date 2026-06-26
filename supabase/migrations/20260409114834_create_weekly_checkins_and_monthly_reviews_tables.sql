/*
  # Create Weekly Check-ins and Monthly Reviews Tables

  ## Summary
  Creates the core tables needed for the one-to-one review workflow:
  weekly check-ins (with KPI scoring per check-in) and monthly reviews
  (with aggregated KPI scores and role-based competency/values ratings).

  ## New Tables

  ### one_to_one_weekly_checkins
  - Links to one_to_one_scheduled_meetings
  - Stores per-KPI manager scores (0-5) and comments via kpi_discussion JSONB
  - Tracks short-term actions and overall weekly summary
  - performance_score uses 0-5 scale globally

  ### one_to_one_monthly_reviews
  - Links to one_to_one_scheduled_meetings
  - Aggregates average KPI score from weekly check-ins
  - Stores competency ratings (role-based, from job_family_competencies)
  - Stores values ratings (org-wide values with 0-5 scale)

  ## Scoring Scale (applied globally)
  0 = New to role, 1 = Development needed, 2 = Requires guidance,
  3 = On target, 4 = Exceeding, 5 = Exceptional

  ## Security
  - RLS enabled on all tables
  - Managers can manage their team's records
  - Employees can view their own records
*/

CREATE TABLE IF NOT EXISTS one_to_one_weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES one_to_one_scheduled_meetings(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  week_starting date NOT NULL,
  week_number integer,
  kpi_discussion jsonb DEFAULT '{}'::jsonb,
  previous_actions_review jsonb DEFAULT '{}'::jsonb,
  short_term_actions text[] DEFAULT '{}',
  summary text DEFAULT '',
  performance_score integer DEFAULT 3 CHECK (performance_score >= 0 AND performance_score <= 5),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (meeting_id, employee_id, week_starting)
);

ALTER TABLE one_to_one_weekly_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage team weekly checkins"
  ON one_to_one_weekly_checkins FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

CREATE POLICY "Employees can view own weekly checkins"
  ON one_to_one_weekly_checkins FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_weekly_checkins_meeting_id ON one_to_one_weekly_checkins(meeting_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_employee_id ON one_to_one_weekly_checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_week_starting ON one_to_one_weekly_checkins(week_starting);

CREATE TABLE IF NOT EXISTS one_to_one_monthly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES one_to_one_scheduled_meetings(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  review_month date NOT NULL,
  average_weekly_performance numeric,
  average_kpi_score numeric,
  kpi_ratings jsonb DEFAULT '{}'::jsonb,
  overall_competency_score numeric,
  competency_ratings jsonb DEFAULT '[]'::jsonb,
  values_ratings jsonb DEFAULT '[]'::jsonb,
  manager_summary text DEFAULT '',
  previous_agenda_items text[] DEFAULT '{}',
  requires_moderation boolean DEFAULT false,
  moderation_status text DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (meeting_id, employee_id, review_month)
);

ALTER TABLE one_to_one_monthly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage team monthly reviews"
  ON one_to_one_monthly_reviews FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

CREATE POLICY "Employees can view own monthly reviews"
  ON one_to_one_monthly_reviews FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_monthly_reviews_meeting_id ON one_to_one_monthly_reviews(meeting_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reviews_employee_id ON one_to_one_monthly_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reviews_review_month ON one_to_one_monthly_reviews(review_month);
