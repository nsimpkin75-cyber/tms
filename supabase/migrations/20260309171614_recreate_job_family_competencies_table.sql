/*
  # Recreate job_family_competencies Table

  1. New Tables
    - `job_family_competencies`
      - `id` (uuid, primary key)
      - `job_family_id` (uuid) - References job_families table
      - `competency_id` (uuid) - References competencies table
      - `required_level_id` (uuid) - References competency_levels table
      - `sort_order` (integer) - Display order (1-6 for the 6 competencies)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on the table
    - All authenticated users can view job family competencies
    - Only admins can manage job family competencies

  3. Important Notes
    - This table links job families to their required competencies
    - Each job family should have exactly 6 competencies assigned
    - The required_level_id indicates the minimum level expected for that job family
*/

-- Drop the table if it exists (for clean recreation)
DROP TABLE IF EXISTS job_family_competencies CASCADE;

-- Create job_family_competencies table
CREATE TABLE job_family_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_family_id uuid NOT NULL REFERENCES job_families(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  required_level_id uuid NOT NULL REFERENCES competency_levels(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_family_id, competency_id)
);

ALTER TABLE job_family_competencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_family_competencies table

-- All authenticated users can view job family competencies
CREATE POLICY "Users can view job family competencies"
  ON job_family_competencies FOR SELECT
  TO authenticated
  USING (true);

-- Admins can create job family competencies
CREATE POLICY "Admins can create job family competencies"
  ON job_family_competencies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update job family competencies
CREATE POLICY "Admins can update job family competencies"
  ON job_family_competencies FOR UPDATE
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

-- Admins can delete job family competencies
CREATE POLICY "Admins can delete job family competencies"
  ON job_family_competencies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_job_family ON job_family_competencies(job_family_id);
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_competency ON job_family_competencies(competency_id);
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_level ON job_family_competencies(required_level_id);
