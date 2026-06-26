/*
  # Create Performance Ratings Tracking System

  1. New Table: `performance_ratings`
    - `id` (uuid, primary key)
    - `employee_id` (uuid, references profiles) - The employee being rated
    - `review_period` (date) - Month/period of the rating (first day of month)
    - `competency_score` (numeric) - Average of all competency ratings (1-4)
    - `performance_score` (numeric) - Average of all KPI ratings (1-5)
    - `overall_rating` (numeric) - Weighted overall rating
    - `rating_category` (text) - Text category (Needs Improvement, Developing, Meets Expectations, Exceeds Expectations, Outstanding)
    - `review_meeting_id` (uuid, references review_meetings) - Source review
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Function: Calculate performance ratings automatically
    - Triggered when review is completed
    - Calculates competency average from assessments
    - Calculates performance average from KPIs
    - Creates overall rating (60% performance, 40% competency)
    - Assigns rating category

  3. Security
    - Enable RLS on performance_ratings table
    - Employees can read their own ratings
    - Managers can read their team's ratings
    - Admins and senior leadership can read all ratings
*/

-- Create performance_ratings table
CREATE TABLE IF NOT EXISTS performance_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_period date NOT NULL,
  competency_score numeric(3,2) CHECK (competency_score >= 1 AND competency_score <= 4),
  performance_score numeric(3,2) CHECK (performance_score >= 1 AND performance_score <= 5),
  overall_rating numeric(3,2) CHECK (overall_rating >= 1 AND overall_rating <= 5),
  rating_category text CHECK (rating_category IN ('Needs Improvement', 'Developing', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding')),
  review_meeting_id uuid REFERENCES review_meetings(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, review_period)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_ratings_employee ON performance_ratings(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_ratings_period ON performance_ratings(review_period);
CREATE INDEX IF NOT EXISTS idx_performance_ratings_category ON performance_ratings(rating_category);

-- Enable RLS
ALTER TABLE performance_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can read their own ratings
CREATE POLICY "Employees can read own ratings"
  ON performance_ratings
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Policy: Managers can read their team's ratings
CREATE POLICY "Managers can read team ratings"
  ON performance_ratings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = performance_ratings.employee_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Policy: Admins can read all ratings
CREATE POLICY "Admins can read all ratings"
  ON performance_ratings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: System can insert ratings (for automated calculation)
CREATE POLICY "System can insert ratings"
  ON performance_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: System can update ratings
CREATE POLICY "System can update ratings"
  ON performance_ratings
  FOR UPDATE
  TO authenticated
  USING (true);

-- Function to calculate rating category
CREATE OR REPLACE FUNCTION calculate_rating_category(score numeric)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF score < 2.0 THEN
    RETURN 'Needs Improvement';
  ELSIF score < 3.0 THEN
    RETURN 'Developing';
  ELSIF score < 3.5 THEN
    RETURN 'Meets Expectations';
  ELSIF score < 4.5 THEN
    RETURN 'Exceeds Expectations';
  ELSE
    RETURN 'Outstanding';
  END IF;
END;
$$;

-- Function to create performance rating from completed review
CREATE OR REPLACE FUNCTION create_performance_rating(meeting_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
  v_review_date date;
  v_competency_avg numeric;
  v_performance_avg numeric;
  v_overall_rating numeric;
  v_rating_category text;
BEGIN
  -- Get meeting details
  SELECT employee_id, DATE_TRUNC('month', scheduled_date)::date
  INTO v_employee_id, v_review_date
  FROM review_meetings
  WHERE id = meeting_id_param;

  -- Calculate competency average (1-4 scale)
  SELECT AVG(manager_rating)
  INTO v_competency_avg
  FROM review_competency_assessments
  WHERE meeting_id = meeting_id_param
  AND manager_rating IS NOT NULL;

  -- Calculate performance average from KPIs (1-5 scale)
  SELECT AVG(rating)
  INTO v_performance_avg
  FROM review_kpi_ratings
  WHERE meeting_id = meeting_id_param
  AND rating IS NOT NULL;

  -- Normalize and calculate overall rating (convert to 1-5 scale)
  -- Competency: normalize from 1-4 to 1-5 scale (multiply by 1.25)
  -- Overall = 60% performance + 40% competency
  IF v_performance_avg IS NOT NULL AND v_competency_avg IS NOT NULL THEN
    v_overall_rating := (v_performance_avg * 0.6) + ((v_competency_avg * 1.25) * 0.4);
  ELSIF v_performance_avg IS NOT NULL THEN
    v_overall_rating := v_performance_avg;
  ELSIF v_competency_avg IS NOT NULL THEN
    v_overall_rating := v_competency_avg * 1.25;
  ELSE
    RETURN;
  END IF;

  -- Get rating category
  v_rating_category := calculate_rating_category(v_overall_rating);

  -- Insert or update performance rating
  INSERT INTO performance_ratings (
    employee_id,
    review_period,
    competency_score,
    performance_score,
    overall_rating,
    rating_category,
    review_meeting_id
  )
  VALUES (
    v_employee_id,
    v_review_date,
    v_competency_avg,
    v_performance_avg,
    v_overall_rating,
    v_rating_category,
    meeting_id_param
  )
  ON CONFLICT (employee_id, review_period)
  DO UPDATE SET
    competency_score = EXCLUDED.competency_score,
    performance_score = EXCLUDED.performance_score,
    overall_rating = EXCLUDED.overall_rating,
    rating_category = EXCLUDED.rating_category,
    review_meeting_id = EXCLUDED.review_meeting_id,
    updated_at = now();
END;
$$;
