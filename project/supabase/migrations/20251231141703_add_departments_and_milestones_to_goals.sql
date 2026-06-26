/*
  # Add Departments and Milestones System for Strategic Goals

  1. New Tables
    - `departments`
      - `id` (uuid, primary key)
      - `name` (text) - Department name (e.g., "Engineering", "Sales", "Marketing")
      - `description` (text) - Optional description
      - `created_at` (timestamptz)
    
    - `goal_milestones`
      - `id` (uuid, primary key)
      - `goal_id` (uuid) - Links to strategic_goals
      - `title` (text) - Milestone title
      - `description` (text) - Milestone description
      - `assigned_to_id` (uuid) - Individual assigned (optional)
      - `success_criteria` (text) - What success looks like
      - `target_value` (text) - Target metric value
      - `current_value` (text) - Current progress value
      - `measurement_unit` (text) - Unit of measurement
      - `due_date` (date)
      - `status` (text) - not_started, in_progress, completed
      - `sort_order` (integer) - Order in which milestones appear
      - `created_at` (timestamptz)

  2. Updates to strategic_goals
    - Add `department_id` (uuid) - Can assign to department instead of/with person
    - Remove `target_value`, `current_value`, `measurement_unit`, `success_criteria`
    - Keep `progress_percentage` for overall goal progress

  3. Security
    - Enable RLS on departments and goal_milestones
    - Add appropriate policies for viewing and managing

  4. Important Notes
    - Goals can be assigned to a person, department, or both
    - If assigned to individual, all milestones auto-assign to that person
    - If assigned to department, milestones can be individually assigned
    - Success measures are tracked at milestone level
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Create goal_milestones table
CREATE TABLE IF NOT EXISTS goal_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES strategic_goals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  success_criteria text,
  target_value text,
  current_value text,
  measurement_unit text,
  due_date date,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;

-- Update strategic_goals table
DO $$
BEGIN
  -- Add department_id field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE strategic_goals ADD COLUMN department_id uuid REFERENCES departments(id) ON DELETE SET NULL;
  END IF;
  
  -- Remove fields that moved to milestones
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'success_criteria'
  ) THEN
    ALTER TABLE strategic_goals DROP COLUMN success_criteria;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'target_value'
  ) THEN
    ALTER TABLE strategic_goals DROP COLUMN target_value;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'current_value'
  ) THEN
    ALTER TABLE strategic_goals DROP COLUMN current_value;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'measurement_unit'
  ) THEN
    ALTER TABLE strategic_goals DROP COLUMN measurement_unit;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'kpi_metrics'
  ) THEN
    ALTER TABLE strategic_goals DROP COLUMN kpi_metrics;
  END IF;
END $$;

-- RLS Policies for departments

-- All authenticated users can view departments
CREATE POLICY "Authenticated users can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create departments
CREATE POLICY "Admins can create departments"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update departments
CREATE POLICY "Admins can update departments"
  ON departments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete departments
CREATE POLICY "Admins can delete departments"
  ON departments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for goal_milestones

-- Users can view milestones for goals they can see
CREATE POLICY "Users can view relevant goal milestones"
  ON goal_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM strategic_goals
      WHERE strategic_goals.id = goal_milestones.goal_id
      AND (
        strategic_goals.assigned_to_id = auth.uid() OR
        strategic_goals.assigned_by_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (profiles.role IN ('leadership', 'admin') OR profiles.has_strategic_roadmap_access = true)
        ) OR
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.manager_id = auth.uid()
          AND p.id = strategic_goals.assigned_to_id
        )
      )
    ) OR
    assigned_to_id = auth.uid()
  );

-- Authorized users can create milestones
CREATE POLICY "Authorized users can create goal milestones"
  ON goal_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM strategic_goals
      WHERE strategic_goals.id = goal_milestones.goal_id
      AND (
        strategic_goals.assigned_by_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (profiles.role IN ('leadership', 'admin', 'manager') OR profiles.has_strategic_roadmap_access = true)
        )
      )
    )
  );

-- Goal creators and assignees can update milestones
CREATE POLICY "Authorized users can update goal milestones"
  ON goal_milestones FOR UPDATE
  TO authenticated
  USING (
    assigned_to_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM strategic_goals
      WHERE strategic_goals.id = goal_milestones.goal_id
      AND (
        strategic_goals.assigned_by_id = auth.uid() OR
        strategic_goals.assigned_to_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Authorized users can delete milestones
CREATE POLICY "Authorized users can delete goal milestones"
  ON goal_milestones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM strategic_goals
      WHERE strategic_goals.id = goal_milestones.goal_id
      AND strategic_goals.assigned_by_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_strategic_goals_department ON strategic_goals(department_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_assigned_to ON goal_milestones(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_sort_order ON goal_milestones(goal_id, sort_order);

-- Insert common departments
INSERT INTO departments (name, description) VALUES
  ('Engineering', 'Software development and technical operations'),
  ('Sales', 'Sales and business development'),
  ('Marketing', 'Marketing and brand management'),
  ('Customer Success', 'Customer support and success'),
  ('Product', 'Product management and design'),
  ('Finance', 'Finance and accounting'),
  ('Human Resources', 'HR and talent management'),
  ('Operations', 'Business operations and administration')
ON CONFLICT (name) DO NOTHING;
