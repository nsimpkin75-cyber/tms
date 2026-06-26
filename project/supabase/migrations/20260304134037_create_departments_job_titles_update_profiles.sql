/*
  # Create Departments and Job Titles Tables

  1. New Tables
    - `departments_org`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Department name
      - `description` (text) - Department description
      - `active` (boolean) - Whether this department is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `job_titles_org`
      - `id` (uuid, primary key)
      - `title` (text, unique) - Job title name
      - `description` (text) - Job title description
      - `active` (boolean) - Whether this title is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes to `profiles` table
    - Add `start_date` column (date) - Employee's start date with the organization
    - Add `active` column (boolean) - Whether the user is active
    - Keep `job_title` column (will now be a free-text field)
    - Keep `tenure` for backward compatibility

  3. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read
    - Add policies for admins to manage

  4. Data
    - Seed common departments and job titles
*/

-- Create departments_org table
CREATE TABLE IF NOT EXISTS departments_org (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create job_titles_org table
CREATE TABLE IF NOT EXISTS job_titles_org (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text UNIQUE NOT NULL,
  description text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add start_date and active to profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN start_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN active boolean DEFAULT true;
  END IF;
END $$;

-- Enable RLS on both tables
ALTER TABLE departments_org ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_titles_org ENABLE ROW LEVEL SECURITY;

-- Departments policies
CREATE POLICY "Authenticated users can read departments"
  ON departments_org FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert departments"
  ON departments_org FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update departments"
  ON departments_org FOR UPDATE
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

CREATE POLICY "Admins can delete departments"
  ON departments_org FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Job titles policies
CREATE POLICY "Authenticated users can read job titles"
  ON job_titles_org FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert job titles"
  ON job_titles_org FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update job titles"
  ON job_titles_org FOR UPDATE
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

CREATE POLICY "Admins can delete job titles"
  ON job_titles_org FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_departments_org_active ON departments_org(active);
CREATE INDEX IF NOT EXISTS idx_job_titles_org_active ON job_titles_org(active);
CREATE INDEX IF NOT EXISTS idx_profiles_start_date ON profiles(start_date);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(active);

-- Seed departments from existing job families data
INSERT INTO departments_org (name, description, active)
SELECT DISTINCT
  department,
  'Department from job families',
  true
FROM job_families
WHERE department IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Add more common departments
INSERT INTO departments_org (name, description, active) VALUES
  ('Engineering', 'Software engineering and development', true),
  ('Product', 'Product management and strategy', true),
  ('Design', 'User experience and visual design', true),
  ('Marketing', 'Marketing and communications', true),
  ('Sales', 'Sales and business development', true),
  ('Customer Success', 'Customer support and success', true),
  ('Human Resources', 'HR and people operations', true),
  ('Finance', 'Finance and accounting', true),
  ('Operations', 'Business operations', true),
  ('Executive', 'Executive leadership', true)
ON CONFLICT (name) DO NOTHING;

-- Seed job titles from existing job families
INSERT INTO job_titles_org (title, description, active)
SELECT DISTINCT
  title,
  description,
  true
FROM job_families
WHERE title IS NOT NULL
ON CONFLICT (title) DO NOTHING;

-- Add additional common job titles
INSERT INTO job_titles_org (title, description, active) VALUES
  ('Junior Developer', 'Entry-level software developer', true),
  ('Developer', 'Mid-level software developer', true),
  ('Senior Developer', 'Senior-level software developer', true),
  ('Lead Developer', 'Technical lead for development team', true),
  ('Engineering Manager', 'Manager of engineering team', true),
  ('Product Manager', 'Product management role', true),
  ('Designer', 'Design professional', true),
  ('Senior Designer', 'Senior design professional', true),
  ('Marketing Specialist', 'Marketing team member', true),
  ('Sales Representative', 'Sales team member', true),
  ('Customer Success Manager', 'Customer success role', true),
  ('HR Manager', 'Human resources manager', true),
  ('Operations Manager', 'Operations management role', true),
  ('Finance Manager', 'Finance management role', true),
  ('Executive Assistant', 'Executive support role', true),
  ('Chief Executive Officer', 'CEO - Executive leader', true),
  ('Chief Technology Officer', 'CTO - Technology leader', true),
  ('Chief Financial Officer', 'CFO - Finance leader', true)
ON CONFLICT (title) DO NOTHING;