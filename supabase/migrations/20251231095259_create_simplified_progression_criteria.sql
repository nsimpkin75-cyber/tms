/*
  # Create Simplified Progression Criteria System

  1. New Tables
    - `general_progression_criteria`
      - `id` (uuid, primary key)
      - `title` (text) - The criteria category name (e.g., "Internal roles")
      - `criteria_items` (jsonb) - Array of selection items with name, description, and target
      - `is_active` (boolean) - Whether this criteria is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on table
    - Allow authenticated users to read all criteria
    - Only admins can insert, update, or delete criteria

  3. Sample Data
    - Add example "Internal roles" criteria
*/

-- Create the general progression criteria table
CREATE TABLE IF NOT EXISTS general_progression_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  criteria_items jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE general_progression_criteria ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read criteria
CREATE POLICY "Authenticated users can view progression criteria"
  ON general_progression_criteria
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert criteria
CREATE POLICY "Only admins can insert progression criteria"
  ON general_progression_criteria
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update criteria
CREATE POLICY "Only admins can update progression criteria"
  ON general_progression_criteria
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

-- Only admins can delete criteria
CREATE POLICY "Only admins can delete progression criteria"
  ON general_progression_criteria
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert sample data
INSERT INTO general_progression_criteria (title, criteria_items) VALUES
('Internal Roles', '[
  {
    "name": "Length of Service",
    "description": "How long you have been in your current role",
    "target": "9+ months"
  }
]'::jsonb);
