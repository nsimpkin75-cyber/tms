/*
  # Fix Competency Levels Table Structure

  1. Changes
    - Drop and recreate competency_levels table with correct structure
    - Add competency_id foreign key to competencies table
    - Update RLS policies
    
  2. Notes
    - This table stores the levels for each competency (e.g., Level 1, Level 2, etc.)
    - Each competency can have multiple levels
    - Levels have a statement describing what that level means
*/

-- Drop the existing competency_levels table and recreate with correct structure
DROP TABLE IF EXISTS competency_levels CASCADE;

CREATE TABLE competency_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id uuid NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  level_number integer NOT NULL,
  level_name text NOT NULL,
  statement text NOT NULL,
  negative_statement text,
  target_behaviour_detail text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(competency_id, level_number)
);

ALTER TABLE competency_levels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competency_levels
CREATE POLICY "Users can view competency levels"
  ON competency_levels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM competencies
      WHERE competencies.id = competency_levels.competency_id
      AND (competencies.is_active = true OR 
           auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
    )
  );

CREATE POLICY "Admins can create competency levels"
  ON competency_levels FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Admins can update competency levels"
  ON competency_levels FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Admins can delete competency levels"
  ON competency_levels FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_competency_levels_competency ON competency_levels(competency_id, level_number);