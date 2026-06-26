/*
  # Update Review System for Weekly Check-ins and Multiple Review Types

  1. Updates to review_meetings table
    - Add review_type enum with expanded options
    - Add week_number for weekly check-ins
    - Add is_averaged_from_weeklies flag for monthly reviews

  2. New Table: weekly_performance_scores
    - Stores weekly check-in KPI scores
    - Used to calculate monthly averages
    
  3. New Table: half_year_review_summaries
    - Stores aggregated data from previous 6 months
    - Links to half-year review meeting

  4. Updates
    - Review meeting types expanded
    - Support for weekly KPI tracking
    - Monthly averages from weekly scores
*/

-- Drop existing review type constraint if it exists
DO $$
BEGIN
  ALTER TABLE review_meetings DROP CONSTRAINT IF EXISTS review_meetings_meeting_type_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add new columns to review_meetings
ALTER TABLE review_meetings 
  ADD COLUMN IF NOT EXISTS review_type text DEFAULT 'monthly_one_to_one',
  ADD COLUMN IF NOT EXISTS week_number integer,
  ADD COLUMN IF NOT EXISTS is_averaged_from_weeklies boolean DEFAULT false;

-- Add constraint for review types
ALTER TABLE review_meetings 
  ADD CONSTRAINT review_meetings_review_type_check 
  CHECK (review_type IN ('weekly_check_in', 'monthly_one_to_one', 'probation_review', 'half_year_review'));

-- Create weekly_performance_scores table
CREATE TABLE IF NOT EXISTS weekly_performance_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES review_meetings(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  month_date date NOT NULL,
  kpi_scores jsonb DEFAULT '[]'::jsonb,
  average_score numeric(3,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, month_date, week_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_weekly_scores_employee ON weekly_performance_scores(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_scores_month ON weekly_performance_scores(month_date);
CREATE INDEX IF NOT EXISTS idx_review_meetings_type ON review_meetings(review_type);
CREATE INDEX IF NOT EXISTS idx_review_meetings_week ON review_meetings(week_number);

-- Enable RLS
ALTER TABLE weekly_performance_scores ENABLE ROW LEVEL SECURITY;

-- Policies for weekly_performance_scores
CREATE POLICY "Employees can read own weekly scores"
  ON weekly_performance_scores
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can read team weekly scores"
  ON weekly_performance_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = weekly_performance_scores.employee_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can insert weekly scores"
  ON weekly_performance_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = weekly_performance_scores.employee_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update weekly scores"
  ON weekly_performance_scores
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = weekly_performance_scores.employee_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Create half_year_review_summaries table
CREATE TABLE IF NOT EXISTS half_year_review_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES review_meetings(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  avg_competency_score numeric(3,2),
  avg_performance_score numeric(3,2),
  avg_overall_rating numeric(3,2),
  monthly_ratings jsonb DEFAULT '[]'::jsonb,
  performance_trend text,
  key_achievements text,
  development_areas text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, review_period_end)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_half_year_summaries_employee ON half_year_review_summaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_half_year_summaries_period ON half_year_review_summaries(review_period_end);

-- Enable RLS
ALTER TABLE half_year_review_summaries ENABLE ROW LEVEL SECURITY;

-- Policies for half_year_review_summaries
CREATE POLICY "Employees can read own half year summaries"
  ON half_year_review_summaries
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can read team half year summaries"
  ON half_year_review_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = half_year_review_summaries.employee_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "System can insert half year summaries"
  ON half_year_review_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to calculate monthly average from weekly scores
CREATE OR REPLACE FUNCTION calculate_monthly_kpi_average(
  employee_id_param uuid,
  month_date_param date
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  monthly_avg numeric;
BEGIN
  SELECT AVG(average_score)
  INTO monthly_avg
  FROM weekly_performance_scores
  WHERE employee_id = employee_id_param
  AND month_date = month_date_param;
  
  RETURN COALESCE(monthly_avg, 0);
END;
$$;

-- Function to generate half-year summary
CREATE OR REPLACE FUNCTION generate_half_year_summary(
  employee_id_param uuid,
  end_date_param date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_date date;
  summary jsonb;
  monthly_data jsonb;
BEGIN
  start_date := end_date_param - INTERVAL '6 months';
  
  -- Get all monthly ratings from the period
  SELECT jsonb_agg(
    jsonb_build_object(
      'period', review_period,
      'overall_rating', overall_rating,
      'competency_score', competency_score,
      'performance_score', performance_score,
      'rating_category', rating_category
    )
    ORDER BY review_period
  )
  INTO monthly_data
  FROM performance_ratings
  WHERE employee_id = employee_id_param
  AND review_period >= start_date
  AND review_period <= end_date_param;
  
  -- Calculate averages
  SELECT jsonb_build_object(
    'avg_competency', AVG(competency_score),
    'avg_performance', AVG(performance_score),
    'avg_overall', AVG(overall_rating),
    'monthly_data', COALESCE(monthly_data, '[]'::jsonb)
  )
  INTO summary
  FROM performance_ratings
  WHERE employee_id = employee_id_param
  AND review_period >= start_date
  AND review_period <= end_date_param;
  
  RETURN summary;
END;
$$;

-- Update the meeting_type column data for existing records
UPDATE review_meetings 
SET review_type = 'monthly_one_to_one' 
WHERE review_type IS NULL OR meeting_type = 'monthly_review';

UPDATE review_meetings 
SET review_type = 'weekly_check_in' 
WHERE meeting_type = 'weekly_1_1';

UPDATE review_meetings 
SET review_type = 'probation_review' 
WHERE meeting_type = 'probation';
