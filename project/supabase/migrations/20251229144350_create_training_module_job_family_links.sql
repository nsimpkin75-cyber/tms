/*
  # Create Training Module to Job Family Linking System

  1. New Tables
    - `training_module_links`
      - `id` (uuid, primary key)
      - `training_course_id` (uuid, foreign key to training_courses)
      - `job_family_id` (uuid, foreign key to job_families)
      - `is_mandatory` (boolean) - Whether this module is required for the role
      - `created_at` (timestamptz)
  
  2. Changes to Existing Tables
    - Add `module_url` column to training_courses for external links
  
  3. Security
    - Enable RLS on training_module_links table
    - Add policies for authenticated users to read links
    - Add policies for admin users to manage links
  
  4. Notes
    - This allows training modules to be linked to multiple job families
    - Each link can specify if the module is mandatory for progression
    - Modules can have external URLs (e.g., LinkedIn Learning, Udemy)
*/

-- Create the linking table
CREATE TABLE IF NOT EXISTS training_module_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_course_id uuid REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  job_family_id uuid REFERENCES job_families(id) ON DELETE CASCADE NOT NULL,
  is_mandatory boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(training_course_id, job_family_id)
);

-- Add module_url column to training_courses if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_courses' AND column_name = 'module_url'
  ) THEN
    ALTER TABLE training_courses ADD COLUMN module_url text;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE training_module_links ENABLE ROW LEVEL SECURITY;

-- Policies for reading links (all authenticated users)
CREATE POLICY "Authenticated users can view training module links"
  ON training_module_links
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for managing links (admin only)
CREATE POLICY "Admin users can insert training module links"
  ON training_module_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update training module links"
  ON training_module_links
  FOR UPDATE
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

CREATE POLICY "Admin users can delete training module links"
  ON training_module_links
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );