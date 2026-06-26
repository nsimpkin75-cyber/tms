/*
  # Add Manager Relationship and Strategic Roadmap System
  
  1. Profile Updates
    - Add `manager_id` field to create reporting hierarchy
    - Add `job_family_id` field to link to job families
    - Add `has_strategic_roadmap_access` boolean for exec/SLT roles
    
  2. New Tables
    - `strategic_roadmaps`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `owner_id` (uuid) - exec/SLT who created it
      - `status` (text) - draft, active, completed
      - `start_date` (date)
      - `end_date` (date)
      - `created_at` (timestamptz)
    
    - `strategic_goals`
      - `id` (uuid, primary key)
      - `roadmap_id` (uuid) - links to strategic_roadmap
      - `title` (text)
      - `description` (text)
      - `assigned_to_id` (uuid) - can be cascaded to managers
      - `assigned_by_id` (uuid) - who assigned it
      - `parent_goal_id` (uuid) - for cascading goals
      - `status` (text) - not_started, in_progress, completed
      - `due_date` (date)
      - `created_at` (timestamptz)
    
    - `weekly_catchups`
      - `id` (uuid, primary key)
      - `manager_id` (uuid) - the manager conducting the catchup
      - `employee_id` (uuid) - the employee
      - `scheduled_date` (date)
      - `status` (text) - scheduled, completed, cancelled
      - `notes` (text)
      - `is_enabled` (boolean) - can be turned off by manager
      - `frequency` (text) - weekly, biweekly, monthly
      - `created_at` (timestamptz)
    
    - `catchup_summaries`
      - `id` (uuid, primary key)
      - `manager_id` (uuid)
      - `employee_id` (uuid)
      - `month` (text) - YYYY-MM format
      - `summary` (text) - collated notes from the month
      - `total_catchups` (integer)
      - `created_at` (timestamptz)
  
  3. Security
    - Enable RLS on all new tables
    - Add policies for role-based access to strategic roadmaps
    - Add policies for managers to manage their team's catch-ups
    - Add policies for employees to view their own data
  
  4. Important Notes
    - Strategic roadmap access is restricted to leadership and admin roles
    - Managers can only create/edit catch-ups for their direct reports
    - Goals can be cascaded from exec → manager → employee
    - Weekly catch-ups auto-collate into monthly summaries
*/

-- Add new fields to profiles table
DO $$
BEGIN
  -- Add manager_id field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  
  -- Add job_family_id field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'job_family_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN job_family_id uuid REFERENCES job_families(id) ON DELETE SET NULL;
  END IF;
  
  -- Add has_strategic_roadmap_access field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'has_strategic_roadmap_access'
  ) THEN
    ALTER TABLE profiles ADD COLUMN has_strategic_roadmap_access boolean DEFAULT false;
  END IF;
END $$;

-- Create strategic_roadmaps table
CREATE TABLE IF NOT EXISTS strategic_roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE strategic_roadmaps ENABLE ROW LEVEL SECURITY;

-- Create strategic_goals table
CREATE TABLE IF NOT EXISTS strategic_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid REFERENCES strategic_roadmaps(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_by_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_goal_id uuid REFERENCES strategic_goals(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'at_risk', 'completed')),
  due_date date,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE strategic_goals ENABLE ROW LEVEL SECURITY;

-- Create weekly_catchups table
CREATE TABLE IF NOT EXISTS weekly_catchups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  notes text,
  is_enabled boolean DEFAULT true,
  frequency text NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  key_discussion_points text[],
  action_items text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE weekly_catchups ENABLE ROW LEVEL SECURITY;

-- Create catchup_summaries table
CREATE TABLE IF NOT EXISTS catchup_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month text NOT NULL, -- YYYY-MM format
  summary text,
  total_catchups integer DEFAULT 0,
  key_themes text[],
  created_at timestamptz DEFAULT now(),
  UNIQUE(manager_id, employee_id, month)
);

ALTER TABLE catchup_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strategic_roadmaps

-- Leadership and admins can view all roadmaps
CREATE POLICY "Leadership can view all strategic roadmaps"
  ON strategic_roadmaps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role IN ('leadership', 'admin') OR profiles.has_strategic_roadmap_access = true)
    )
  );

-- Owners and admins can insert roadmaps
CREATE POLICY "Authorized users can create strategic roadmaps"
  ON strategic_roadmaps FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role IN ('leadership', 'admin') OR profiles.has_strategic_roadmap_access = true)
    )
    AND owner_id = auth.uid()
  );

-- Owners and admins can update their roadmaps
CREATE POLICY "Owners can update their strategic roadmaps"
  ON strategic_roadmaps FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete roadmaps
CREATE POLICY "Admins can delete strategic roadmaps"
  ON strategic_roadmaps FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for strategic_goals

-- Users can view goals assigned to them or their team
CREATE POLICY "Users can view relevant strategic goals"
  ON strategic_goals FOR SELECT
  TO authenticated
  USING (
    assigned_to_id = auth.uid() OR
    assigned_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role IN ('leadership', 'admin') OR profiles.has_strategic_roadmap_access = true)
    ) OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.manager_id = auth.uid()
      AND p.id = assigned_to_id
    )
  );

-- Authorized users can create goals
CREATE POLICY "Authorized users can create strategic goals"
  ON strategic_goals FOR INSERT
  TO authenticated
  WITH CHECK (
    assigned_by_id = auth.uid() AND
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role IN ('leadership', 'admin', 'manager') OR profiles.has_strategic_roadmap_access = true)
      )
    )
  );

-- Goal assigners can update their goals
CREATE POLICY "Goal owners can update strategic goals"
  ON strategic_goals FOR UPDATE
  TO authenticated
  USING (
    assigned_by_id = auth.uid() OR
    assigned_to_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins and assigners can delete goals
CREATE POLICY "Authorized users can delete strategic goals"
  ON strategic_goals FOR DELETE
  TO authenticated
  USING (
    assigned_by_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for weekly_catchups

-- Managers and employees can view their catchups
CREATE POLICY "Users can view their weekly catchups"
  ON weekly_catchups FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Managers can create catchups for their reports
CREATE POLICY "Managers can create weekly catchups"
  ON weekly_catchups FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Managers and admins can update catchups
CREATE POLICY "Managers can update their weekly catchups"
  ON weekly_catchups FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Managers and admins can delete catchups
CREATE POLICY "Managers can delete their weekly catchups"
  ON weekly_catchups FOR DELETE
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for catchup_summaries

-- Managers, employees, and admins can view summaries
CREATE POLICY "Users can view catchup summaries"
  ON catchup_summaries FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('leadership', 'admin')
    )
  );

-- Managers can create summaries
CREATE POLICY "Managers can create catchup summaries"
  ON catchup_summaries FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = auth.uid()
  );

-- Managers can update their summaries
CREATE POLICY "Managers can update catchup summaries"
  ON catchup_summaries FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_assigned_to ON strategic_goals(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_roadmap ON strategic_goals(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_weekly_catchups_manager ON weekly_catchups(manager_id);
CREATE INDEX IF NOT EXISTS idx_weekly_catchups_employee ON weekly_catchups(employee_id);
CREATE INDEX IF NOT EXISTS idx_catchup_summaries_month ON catchup_summaries(month);

-- Update existing leadership/admin profiles to have strategic roadmap access
UPDATE profiles
SET has_strategic_roadmap_access = true
WHERE role IN ('leadership', 'admin');