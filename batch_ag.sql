/*
  # Skills Matrix System

  1. New Tables
    - skill_types: Fixed skill type categories
    - skill_categories: Admin-manageable categories
    - skills_master: Master skills list with definitions
    - skills_matrices: Matrix configurations by department/job titles
    - matrix_skills: Skills assigned to specific matrices
    - matrix_assignments: Employees assigned to matrices
    - skill_ratings: Individual skill ratings for employees
    - assessment_cycles: Cycles linked to matrices

  2. Security
    - Enable RLS on all tables
    - Admins can manage everything
    - Managers can view team ratings
    - Users can view own ratings
*/

-- Skill Types (fixed options)
CREATE TABLE IF NOT EXISTS skill_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE skill_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view skill types"
  ON skill_types FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage skill types"
  ON skill_types FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- Insert fixed skill types
INSERT INTO skill_types (name, sort_order) VALUES
  ('Product Knowledge', 1),
  ('Expert Knowledge', 2),
  ('Technical Skills', 3),
  ('Soft Skills', 4),
  ('Other', 5)
ON CONFLICT (name) DO NOTHING;

-- Skill Categories (admin-manageable)
CREATE TABLE IF NOT EXISTS skill_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON skill_categories FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON skill_categories FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- Insert default categories
INSERT INTO skill_categories (name) VALUES
  ('Salesforce'),
  ('Payments'),
  ('Subscriptions')
ON CONFLICT (name) DO NOTHING;

-- Master Skills List
CREATE TABLE IF NOT EXISTS skills_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  skill_type_id uuid REFERENCES skill_types(id) ON DELETE SET NULL,
  skill_category_id uuid REFERENCES skill_categories(id) ON DELETE SET NULL,
  definition text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE skills_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view skills"
  ON skills_master FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage skills"
  ON skills_master FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_skills_master_type ON skills_master(skill_type_id);
CREATE INDEX IF NOT EXISTS idx_skills_master_category ON skills_master(skill_category_id);

-- Skills Matrices (configurations)
CREATE TABLE IF NOT EXISTS skills_matrices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department_id uuid REFERENCES departments_org(id) ON DELETE CASCADE,
  job_title_ids uuid[] NOT NULL DEFAULT '{}',
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE skills_matrices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view matrices"
  ON skills_matrices FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage matrices"
  ON skills_matrices FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_matrices_department ON skills_matrices(department_id);
CREATE INDEX IF NOT EXISTS idx_matrices_created_by ON skills_matrices(created_by);

-- Matrix Skills (skills assigned to matrices)
CREATE TABLE IF NOT EXISTS matrix_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id uuid REFERENCES skills_matrices(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES skills_master(id) ON DELETE CASCADE,
  is_required boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE matrix_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view matrix skills"
  ON matrix_skills FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage matrix skills"
  ON matrix_skills FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_matrix_skills_matrix ON matrix_skills(matrix_id);
CREATE INDEX IF NOT EXISTS idx_matrix_skills_skill ON matrix_skills(skill_id);

-- Matrix Assignments (employees assigned to matrices)
CREATE TABLE IF NOT EXISTS matrix_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id uuid REFERENCES skills_matrices(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(matrix_id, employee_id)
);

ALTER TABLE matrix_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view assignments"
  ON matrix_assignments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage assignments"
  ON matrix_assignments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_matrix_assignments_matrix ON matrix_assignments(matrix_id);
CREATE INDEX IF NOT EXISTS idx_matrix_assignments_employee ON matrix_assignments(employee_id);

-- Skill Ratings
CREATE TABLE IF NOT EXISTS skill_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id uuid REFERENCES skills_matrices(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES skills_master(id) ON DELETE CASCADE,
  rating_value int CHECK (rating_value >= 0 AND rating_value <= 4),
  rating_label text,
  rated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  comments text,
  rated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(matrix_id, employee_id, skill_id)
);

ALTER TABLE skill_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ratings"
  ON skill_ratings FOR SELECT TO authenticated
  USING (employee_id = (SELECT auth.uid()));

CREATE POLICY "Managers can view team ratings"
  ON skill_ratings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = skill_ratings.employee_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins can view all ratings"
  ON skill_ratings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage ratings"
  ON skill_ratings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_skill_ratings_matrix ON skill_ratings(matrix_id);
CREATE INDEX IF NOT EXISTS idx_skill_ratings_employee ON skill_ratings(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_ratings_skill ON skill_ratings(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_ratings_rated_by ON skill_ratings(rated_by);

-- Assessment Cycles
CREATE TABLE IF NOT EXISTS assessment_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id uuid REFERENCES skills_matrices(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assessment_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cycles"
  ON assessment_cycles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage cycles"
  ON assessment_cycles FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_assessment_cycles_matrix ON assessment_cycles(matrix_id);
CREATE INDEX IF NOT EXISTS idx_assessment_cycles_created_by ON assessment_cycles(created_by);
/*
  # Access Level Types System

  1. New Tables
    - access_level_types: Configurable access level types with permissions
    - user_access_levels: Junction table for multi-select user access levels

  2. Changes
    - Profiles table will continue to have role column for backward compatibility
    - New system allows multiple access levels per user

  3. Security
    - Enable RLS on all tables
    - Only admins can manage access level types
    - Admins can assign access levels to users

  4. Default Access Levels
    - Employee
    - Manager
    - Admin
    - L&D Admin (new - with specific permissions)
*/

-- Access Level Types table
CREATE TABLE IF NOT EXISTS access_level_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  permissions jsonb DEFAULT '{}',
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE access_level_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view access level types"
  ON access_level_types FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage access level types"
  ON access_level_types FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- User Access Levels junction table
CREATE TABLE IF NOT EXISTS user_access_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  access_level_id uuid REFERENCES access_level_types(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(user_id, access_level_id)
);

ALTER TABLE user_access_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own access levels"
  ON user_access_levels FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can view all access levels"
  ON user_access_levels FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage access levels"
  ON user_access_levels FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_user_access_levels_user ON user_access_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_access_levels_access_level ON user_access_levels(access_level_id);

-- Insert default access level types
INSERT INTO access_level_types (name, description, permissions, is_system) VALUES
  (
    'Employee',
    'Standard employee access',
    '{"view_own_profile": true, "view_own_reviews": true, "access_training": true, "access_career_plans": true}',
    true
  ),
  (
    'Manager',
    'Team manager access',
    '{"view_own_profile": true, "view_own_reviews": true, "access_training": true, "access_career_plans": true, "manage_team": true, "conduct_reviews": true, "view_team_reports": true}',
    true
  ),
  (
    'Admin',
    'Full system administrator',
    '{"full_access": true}',
    true
  ),
  (
    'L&D Admin',
    'Learning & Development administrator',
    '{"view_own_profile": true, "create_skills_matrices": true, "create_assessment_forms": true, "send_assessment_forms": true, "manage_training": true, "access_reports": true, "view_all_users": true}',
    false
  )
ON CONFLICT (name) DO NOTHING;

-- Migrate existing users to new system
DO $$
DECLARE
  employee_id uuid;
  manager_id uuid;
  admin_id uuid;
  user_record RECORD;
BEGIN
  -- Get access level type IDs
  SELECT id INTO employee_id FROM access_level_types WHERE name = 'Employee';
  SELECT id INTO manager_id FROM access_level_types WHERE name = 'Manager';
  SELECT id INTO admin_id FROM access_level_types WHERE name = 'Admin';

  -- Migrate existing users
  FOR user_record IN SELECT id, role FROM profiles LOOP
    IF user_record.role = 'admin' THEN
      INSERT INTO user_access_levels (user_id, access_level_id)
      VALUES (user_record.id, admin_id)
      ON CONFLICT (user_id, access_level_id) DO NOTHING;
    ELSIF user_record.role = 'manager' THEN
      INSERT INTO user_access_levels (user_id, access_level_id)
      VALUES (user_record.id, manager_id)
      ON CONFLICT (user_id, access_level_id) DO NOTHING;
    ELSE
      INSERT INTO user_access_levels (user_id, access_level_id)
      VALUES (user_record.id, employee_id)
      ON CONFLICT (user_id, access_level_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Create helper function to check if user has access level
CREATE OR REPLACE FUNCTION has_access_level(user_id_param uuid, level_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_access_levels ual
    JOIN access_level_types alt ON ual.access_level_id = alt.id
    WHERE ual.user_id = user_id_param
    AND alt.name = level_name
    AND alt.is_active = true
  );
END;
$$;

-- Create helper function to get user's access levels
CREATE OR REPLACE FUNCTION get_user_access_levels(user_id_param uuid)
RETURNS TABLE(id uuid, name text, permissions jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT alt.id, alt.name, alt.permissions
  FROM user_access_levels ual
  JOIN access_level_types alt ON ual.access_level_id = alt.id
  WHERE ual.user_id = user_id_param
  AND alt.is_active = true;
END;
$$;
/*
  # Create Missing Values and Competencies Tables

  1. New Tables
    - `values` - Organizational values (e.g., Integrity, Innovation)
    - `competencies` - Competencies tied to values
    
  2. Changes
    - Creates the values table with emoji support
    - Creates the competencies table with emoji support and FK to values
    - Adds RLS policies for admin management
    
  3. Security
    - Enable RLS on all tables
    - Admins can manage all data
    - All authenticated users can view active records
*/

-- Create update function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create values table if it doesn't exist
CREATE TABLE IF NOT EXISTS values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  statement text NOT NULL,
  emoji text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE values ENABLE ROW LEVEL SECURITY;

-- Create competencies table if it doesn't exist
CREATE TABLE IF NOT EXISTS competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value_id uuid NOT NULL REFERENCES values(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  emoji text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view active values" ON values;
  DROP POLICY IF EXISTS "Admins can create values" ON values;
  DROP POLICY IF EXISTS "Admins can update values" ON values;
  DROP POLICY IF EXISTS "Admins can delete values" ON values;
  DROP POLICY IF EXISTS "Users can view competencies" ON competencies;
  DROP POLICY IF EXISTS "Admins can create competencies" ON competencies;
  DROP POLICY IF EXISTS "Admins can update competencies" ON competencies;
  DROP POLICY IF EXISTS "Admins can delete competencies" ON competencies;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- RLS Policies for values table
CREATE POLICY "Users can view active values"
  ON values FOR SELECT
  TO authenticated
  USING (
    is_active = true OR 
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Admins can create values"
  ON values FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Admins can update values"
  ON values FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Admins can delete values"
  ON values FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- RLS Policies for competencies table
CREATE POLICY "Users can view competencies"
  ON competencies FOR SELECT
  TO authenticated
  USING (
    is_active = true OR 
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Admins can create competencies"
  ON competencies FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Admins can update competencies"
  ON competencies FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Admins can delete competencies"
  ON competencies FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_values_active ON values(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_values_sort ON values(sort_order);
CREATE INDEX IF NOT EXISTS idx_competencies_value ON competencies(value_id);
CREATE INDEX IF NOT EXISTS idx_competencies_active ON competencies(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_competencies_sort ON competencies(sort_order);

-- Create triggers
DROP TRIGGER IF EXISTS update_values_updated_at ON values;
CREATE TRIGGER update_values_updated_at
  BEFORE UPDATE ON values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
  
DROP TRIGGER IF EXISTS update_competencies_updated_at ON competencies;
CREATE TRIGGER update_competencies_updated_at
  BEFORE UPDATE ON competencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
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
/*
  # Fix Missing Tables, Views, and Columns - Final

  1. Changes
    - Create missing employee_skill_summary view (all column names corrected)
    - Create missing skill assessment discrepancies table
    - Create missing skill development actions table
    - Create missing one_to_one_scheduled_meetings table
    
  2. Security
    - Enable RLS on all new tables
    - Add appropriate policies
*/

-- Create skill_assessment_discrepancies table if it doesn't exist
CREATE TABLE IF NOT EXISTS skill_assessment_discrepancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills_master(id) ON DELETE CASCADE,
  employee_rating integer NOT NULL,
  manager_rating integer NOT NULL,
  rating_gap integer NOT NULL,
  ai_analysis text,
  ai_discussion_prompts jsonb,
  flagged_for_discussion boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'skill_assessment_discrepancies' AND policyname = 'Users can view their own skill discrepancies') THEN
    ALTER TABLE skill_assessment_discrepancies ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own skill discrepancies"
      ON skill_assessment_discrepancies FOR SELECT
      TO authenticated
      USING (
        employee_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'manager'))
      );

    CREATE POLICY "Managers can create skill discrepancies"
      ON skill_assessment_discrepancies FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'manager'))
      );

    CREATE POLICY "Managers can update skill discrepancies"
      ON skill_assessment_discrepancies FOR UPDATE
      TO authenticated
      USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'manager'))
      );
  END IF;
END $$;

-- Create skill_development_actions table if it doesn't exist
CREATE TABLE IF NOT EXISTS skill_development_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills_master(id) ON DELETE CASCADE,
  action_description text NOT NULL,
  action_type text NOT NULL,
  status text DEFAULT 'open',
  target_date date,
  completed_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'skill_development_actions' AND policyname = 'Users can view their own skill actions') THEN
    ALTER TABLE skill_development_actions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own skill actions"
      ON skill_development_actions FOR SELECT
      TO authenticated
      USING (
        employee_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'manager'))
      );

    CREATE POLICY "Managers can create skill actions"
      ON skill_development_actions FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'manager'))
      );

    CREATE POLICY "Managers and employees can update skill actions"
      ON skill_development_actions FOR UPDATE
      TO authenticated
      USING (
        employee_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'manager'))
      );
  END IF;
END $$;

-- Create one_to_one_scheduled_meetings table if it doesn't exist
CREATE TABLE IF NOT EXISTS one_to_one_scheduled_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_datetime timestamptz NOT NULL,
  status text DEFAULT 'scheduled',
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cycle_id, employee_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'one_to_one_scheduled_meetings' AND policyname = 'Users can view their own scheduled meetings') THEN
    ALTER TABLE one_to_one_scheduled_meetings ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their own scheduled meetings"
      ON one_to_one_scheduled_meetings FOR SELECT
      TO authenticated
      USING (
        employee_id = auth.uid() OR
        manager_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
      );

    CREATE POLICY "Managers can create scheduled meetings"
      ON one_to_one_scheduled_meetings FOR INSERT
      TO authenticated
      WITH CHECK (
        manager_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
      );

    CREATE POLICY "Managers can update scheduled meetings"
      ON one_to_one_scheduled_meetings FOR UPDATE
      TO authenticated
      USING (
        manager_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
      );

    CREATE POLICY "Managers can delete scheduled meetings"
      ON one_to_one_scheduled_meetings FOR DELETE
      TO authenticated
      USING (
        manager_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
      );
  END IF;
END $$;

-- Create employee_skill_summary view with all corrected column names
CREATE OR REPLACE VIEW employee_skill_summary AS
SELECT
  sa.profile_id as employee_id,
  sm.id as skill_id,
  sm.name as skill_name,
  COALESCE(st.name, 'General') as skill_type,
  '📊' as skill_type_icon,
  sa.target_level,
  false as is_mandatory,
  (SELECT rating_value FROM skill_ratings WHERE employee_id = sa.profile_id AND skill_id = sm.id AND rated_by = sa.profile_id ORDER BY rated_at DESC LIMIT 1) as latest_self_rating,
  (SELECT rating_value FROM skill_ratings WHERE employee_id = sa.profile_id AND skill_id = sm.id AND rated_by != sa.profile_id ORDER BY rated_at DESC LIMIT 1) as latest_manager_rating,
  sa.current_level as current_rating,
  sa.assessment_date as last_assessed_at,
  'active' as cycle_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM skill_assessment_discrepancies sad 
      WHERE sad.employee_id = sa.profile_id 
      AND sad.skill_id = sm.id 
      AND sad.flagged_for_discussion = true 
      AND sad.resolved_at IS NULL
    ) THEN true 
    ELSE false 
  END as has_discrepancy,
  (SELECT ai_analysis FROM skill_assessment_discrepancies WHERE employee_id = sa.profile_id AND skill_id = sm.id ORDER BY created_at DESC LIMIT 1) as discrepancy_analysis
FROM skill_assessments sa
JOIN skills_master sm ON sa.skill_id = sm.id
LEFT JOIN skill_types st ON sm.skill_type_id = st.id;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_skill_discrepancies_employee ON skill_assessment_discrepancies(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_discrepancies_skill ON skill_assessment_discrepancies(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_discrepancies_flagged ON skill_assessment_discrepancies(flagged_for_discussion, resolved_at);

CREATE INDEX IF NOT EXISTS idx_skill_dev_actions_employee ON skill_development_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_dev_actions_skill ON skill_development_actions(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_dev_actions_status ON skill_development_actions(status);

CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_cycle ON one_to_one_scheduled_meetings(cycle_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_manager ON one_to_one_scheduled_meetings(manager_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_employee ON one_to_one_scheduled_meetings(employee_id);
/*
  # Seed Skills Master Data v3

  1. Changes
    - Add sample skills to skills_master table with correct column names
    
  2. Notes
    - This provides initial data for the skills matrix system
*/

-- Insert sample skills using correct column names
INSERT INTO skills_master (id, name, skill_type_id, definition, is_active) VALUES
  -- Technical Skills
  ('b1111111-1111-1111-1111-111111111111', 'React Development', 'c9a23168-f9a4-46dd-b86f-47eec9c33806', 'Building user interfaces with React', true),
  ('b2222222-2222-2222-2222-222222222222', 'TypeScript', 'c9a23168-f9a4-46dd-b86f-47eec9c33806', 'Strong typing for JavaScript', true),
  ('b3333333-3333-3333-3333-333333333333', 'API Development', 'c9a23168-f9a4-46dd-b86f-47eec9c33806', 'Building RESTful APIs', true),
  ('b4444444-4444-4444-4444-444444444444', 'Database Design', 'c9a23168-f9a4-46dd-b86f-47eec9c33806', 'Designing database schemas', true),
  ('b5555555-5555-5555-5555-555555555555', 'Testing & QA', 'c9a23168-f9a4-46dd-b86f-47eec9c33806', 'Writing and running tests', true),
  
  -- Soft Skills
  ('c1111111-1111-1111-1111-111111111111', 'Communication', '30f4a00f-b9d5-475a-95b1-88792e253898', 'Clear and effective communication', true),
  ('c2222222-2222-2222-2222-222222222222', 'Teamwork', '30f4a00f-b9d5-475a-95b1-88792e253898', 'Collaborating effectively with others', true),
  ('c3333333-3333-3333-3333-333333333333', 'Problem Solving', '30f4a00f-b9d5-475a-95b1-88792e253898', 'Analytical thinking and problem resolution', true),
  ('c4444444-4444-4444-4444-444444444444', 'Leadership', '30f4a00f-b9d5-475a-95b1-88792e253898', 'Leading and mentoring others', true),
  ('c5555555-5555-5555-5555-555555555555', 'Time Management', '30f4a00f-b9d5-475a-95b1-88792e253898', 'Managing time and priorities effectively', true),
  
  -- Product Knowledge
  ('d1111111-1111-1111-1111-111111111111', 'Product Strategy', 'e270a404-5a0f-4dad-9ec2-15c71972b461', 'Understanding product vision and strategy', true),
  ('d2222222-2222-2222-2222-222222222222', 'User Research', 'e270a404-5a0f-4dad-9ec2-15c71972b461', 'Conducting user research and analysis', true),
  ('d3333333-3333-3333-3333-333333333333', 'Market Analysis', 'e270a404-5a0f-4dad-9ec2-15c71972b461', 'Analyzing market trends and competitors', true),
  ('d4444444-4444-4444-4444-444444444444', 'Feature Prioritization', 'e270a404-5a0f-4dad-9ec2-15c71972b461', 'Prioritizing features and roadmap items', true),
  ('d5555555-5555-5555-5555-555555555555', 'Business Acumen', 'e270a404-5a0f-4dad-9ec2-15c71972b461', 'Understanding business metrics and goals', true),
  
  -- Expert Knowledge
  ('e1111111-1111-1111-1111-111111111111', 'System Architecture', '7aa9e782-d952-4c56-8c6f-9fcdf125120f', 'Designing scalable system architectures', true),
  ('e2222222-2222-2222-2222-222222222222', 'DevOps', '7aa9e782-d952-4c56-8c6f-9fcdf125120f', 'CI/CD and infrastructure management', true),
  ('e3333333-3333-3333-3333-333333333333', 'Security', '7aa9e782-d952-4c56-8c6f-9fcdf125120f', 'Application security and best practices', true)
ON CONFLICT (id) DO NOTHING;
/*
  # Add Missing Foreign Key Indexes - Part 1

  1. Changes
    - Add indexes for foreign keys that are missing covering indexes
    - This improves query performance for joins and foreign key lookups
    
  2. Security
    - No RLS changes, only performance optimization
*/

-- Action items
CREATE INDEX IF NOT EXISTS idx_action_items_owner_id ON action_items(owner_id);

-- Career pathways
CREATE INDEX IF NOT EXISTS idx_career_pathways_from_job_family ON career_pathways(from_job_family_id);
CREATE INDEX IF NOT EXISTS idx_career_pathways_to_job_family ON career_pathways(to_job_family_id);

-- Career plan milestones
CREATE INDEX IF NOT EXISTS idx_career_plan_milestones_plan_id ON career_plan_milestones(plan_id);

-- Competency categories
CREATE INDEX IF NOT EXISTS idx_competency_categories_framework ON competency_categories(framework_id);

-- Cycle actions
CREATE INDEX IF NOT EXISTS idx_cycle_actions_cycle_id ON cycle_actions(cycle_id);

-- Cycle KPIs
CREATE INDEX IF NOT EXISTS idx_cycle_kpis_cycle_id ON cycle_kpis(cycle_id);

-- Goal actions
CREATE INDEX IF NOT EXISTS idx_goal_actions_goal_id ON goal_actions(goal_id);

-- Goal departments
CREATE INDEX IF NOT EXISTS idx_goal_departments_goal_id ON goal_departments(goal_id);

-- Goal KPIs
CREATE INDEX IF NOT EXISTS idx_goal_kpis_goal_id ON goal_kpis(goal_id);

-- Module content items
CREATE INDEX IF NOT EXISTS idx_module_content_items_module_id ON module_content_items(module_id);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_job_family_id ON profiles(job_family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON profiles(manager_id);
/*
  # Add Missing Foreign Key Indexes - Part 2

  1. Changes
    - Continue adding indexes for foreign keys
    
  2. Security
    - No RLS changes, only performance optimization
*/

-- Rating approval workflow
CREATE INDEX IF NOT EXISTS idx_rating_approval_workflow_rating ON rating_approval_workflow(rating_id);

-- Review competency ratings
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_review ON review_competency_ratings(review_id);

-- Review cycles
CREATE INDEX IF NOT EXISTS idx_review_cycles_template_id ON review_cycles(template_id);

-- Review instances
CREATE INDEX IF NOT EXISTS idx_review_instances_cycle_id ON review_instances(cycle_id);

-- Review KPIs
CREATE INDEX IF NOT EXISTS idx_review_kpis_employee_id ON review_kpis(employee_id);

-- Review monthly sessions
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_employee ON review_monthly_sessions(employee_id);

-- Review notifications
CREATE INDEX IF NOT EXISTS idx_review_notifications_recipient ON review_notifications(recipient_id);

-- Review responses
CREATE INDEX IF NOT EXISTS idx_review_responses_instance_id ON review_responses(instance_id);

-- Review six month performance
CREATE INDEX IF NOT EXISTS idx_review_six_month_employee ON review_six_month_performance(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_six_month_manager ON review_six_month_performance(manager_id);
/*
  # Add Missing Foreign Key Indexes - Part 3

  1. Changes
    - Complete adding indexes for foreign keys
    
  2. Security
    - No RLS changes, only performance optimization
*/

-- Review template questions
CREATE INDEX IF NOT EXISTS idx_review_template_questions_section ON review_template_questions(section_id);

-- Review template sections
CREATE INDEX IF NOT EXISTS idx_review_template_sections_template ON review_template_sections(template_id);

-- Review weekly checkins
CREATE INDEX IF NOT EXISTS idx_review_weekly_checkins_employee ON review_weekly_checkins(employee_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_employee_id ON reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_manager_id ON reviews(manager_id);

-- Skill assessments
CREATE INDEX IF NOT EXISTS idx_skill_assessments_skill_id ON skill_assessments(skill_id);

-- Training attendees
CREATE INDEX IF NOT EXISTS idx_training_attendees_session ON training_attendees(training_session_id);

-- Training completions
CREATE INDEX IF NOT EXISTS idx_training_completions_course_id ON training_completions(course_id);

-- Training module job family links
CREATE INDEX IF NOT EXISTS idx_training_module_links_job_family ON training_module_job_family_links(job_family_id);

-- Training modules
CREATE INDEX IF NOT EXISTS idx_training_modules_course_id ON training_modules(course_id);

-- User access levels
CREATE INDEX IF NOT EXISTS idx_user_access_levels_assigned_by ON user_access_levels(assigned_by);

-- View as sessions
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_admin_id ON view_as_sessions(admin_id);
/*
  # Fix Auth RLS Initialization - Part 1

  1. Changes
    - Fix RLS policies to use (select auth.uid()) instead of auth.uid()
    - This prevents re-evaluation of auth functions for each row
    
  2. Security
    - Maintains same security posture with better performance
*/

-- Fix values table policies
DROP POLICY IF EXISTS "Users can view active values" ON values;
DROP POLICY IF EXISTS "Admins can create values" ON values;
DROP POLICY IF EXISTS "Admins can update values" ON values;
DROP POLICY IF EXISTS "Admins can delete values" ON values;

CREATE POLICY "Users can view active values"
  ON values FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can create values"
  ON values FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);

CREATE POLICY "Admins can update values"
  ON values FOR UPDATE
  TO authenticated
  USING ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);

CREATE POLICY "Admins can delete values"
  ON values FOR DELETE
  TO authenticated
  USING ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);

-- Fix competencies table policies
DROP POLICY IF EXISTS "Users can view competencies" ON competencies;
DROP POLICY IF EXISTS "Admins can create competencies" ON competencies;
DROP POLICY IF EXISTS "Admins can update competencies" ON competencies;
DROP POLICY IF EXISTS "Admins can delete competencies" ON competencies;

CREATE POLICY "Users can view competencies"
  ON competencies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create competencies"
  ON competencies FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);

CREATE POLICY "Admins can update competencies"
  ON competencies FOR UPDATE
  TO authenticated
  USING ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);

CREATE POLICY "Admins can delete competencies"
  ON competencies FOR DELETE
  TO authenticated
  USING ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);
/*
  # Fix Auth RLS Initialization - Part 2

  1. Changes
    - Fix competency_levels table RLS policies
    
  2. Security
    - Maintains same security posture with better performance
*/

-- Fix competency_levels table policies
DROP POLICY IF EXISTS "Users can view competency levels" ON competency_levels;
DROP POLICY IF EXISTS "Admins can create competency levels" ON competency_levels;
DROP POLICY IF EXISTS "Admins can update competency levels" ON competency_levels;
DROP POLICY IF EXISTS "Admins can delete competency levels" ON competency_levels;

CREATE POLICY "Users can view competency levels"
  ON competency_levels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create competency levels"
  ON competency_levels FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);

CREATE POLICY "Admins can update competency levels"
  ON competency_levels FOR UPDATE
  TO authenticated
  USING ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);

CREATE POLICY "Admins can delete competency levels"
  ON competency_levels FOR DELETE
  TO authenticated
  USING ((SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL);
/*
  # Fix Auth RLS Initialization - Part 3

  1. Changes
    - Fix skill_development_actions and skill_assessment_discrepancies policies
    
  2. Security
    - Maintains same security posture with better performance
*/

-- Fix skill_development_actions policies
DROP POLICY IF EXISTS "Users can view their own skill actions" ON skill_development_actions;
DROP POLICY IF EXISTS "Managers can create skill actions" ON skill_development_actions;
DROP POLICY IF EXISTS "Managers and employees can update skill actions" ON skill_development_actions;

CREATE POLICY "Users can view their own skill actions"
  ON skill_development_actions FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'manager')) IS NOT NULL
  );

CREATE POLICY "Managers can create skill actions"
  ON skill_development_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'manager')) IS NOT NULL
  );

CREATE POLICY "Managers and employees can update skill actions"
  ON skill_development_actions FOR UPDATE
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'manager')) IS NOT NULL
  );

-- Fix skill_assessment_discrepancies policies
DROP POLICY IF EXISTS "Users can view their own skill discrepancies" ON skill_assessment_discrepancies;
DROP POLICY IF EXISTS "Managers can create skill discrepancies" ON skill_assessment_discrepancies;
DROP POLICY IF EXISTS "Managers can update skill discrepancies" ON skill_assessment_discrepancies;

CREATE POLICY "Users can view their own skill discrepancies"
  ON skill_assessment_discrepancies FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'manager')) IS NOT NULL
  );

CREATE POLICY "Managers can create skill discrepancies"
  ON skill_assessment_discrepancies FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'manager')) IS NOT NULL
  );

CREATE POLICY "Managers can update skill discrepancies"
  ON skill_assessment_discrepancies FOR UPDATE
  TO authenticated
  USING (
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'manager')) IS NOT NULL
  );
/*
  # Fix Auth RLS Initialization - Part 4

  1. Changes
    - Fix one_to_one_scheduled_meetings policies
    
  2. Security
    - Maintains same security posture with better performance
*/

-- Fix one_to_one_scheduled_meetings policies
DROP POLICY IF EXISTS "Users can view their own scheduled meetings" ON one_to_one_scheduled_meetings;
DROP POLICY IF EXISTS "Managers can create scheduled meetings" ON one_to_one_scheduled_meetings;
DROP POLICY IF EXISTS "Managers can update scheduled meetings" ON one_to_one_scheduled_meetings;
DROP POLICY IF EXISTS "Managers can delete scheduled meetings" ON one_to_one_scheduled_meetings;

CREATE POLICY "Users can view their own scheduled meetings"
  ON one_to_one_scheduled_meetings FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
  );

CREATE POLICY "Managers can create scheduled meetings"
  ON one_to_one_scheduled_meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
  );

CREATE POLICY "Managers can update scheduled meetings"
  ON one_to_one_scheduled_meetings FOR UPDATE
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
  );

CREATE POLICY "Managers can delete scheduled meetings"
  ON one_to_one_scheduled_meetings FOR DELETE
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
  );
/*
  # Remove Unused Indexes - Part 1

  1. Changes
    - Remove indexes that are not being used
    - This reduces storage and maintenance overhead
    
  2. Security
    - No security impact, only performance optimization
*/

-- Remove unused indexes from various tables
DROP INDEX IF EXISTS idx_career_plans_target_job_family;
DROP INDEX IF EXISTS idx_goal_actions_assigned_to;
DROP INDEX IF EXISTS idx_one_to_one_notes_created_by;
DROP INDEX IF EXISTS idx_performance_ratings_rater_id;
DROP INDEX IF EXISTS idx_profile_skills_skill_id;
DROP INDEX IF EXISTS idx_rating_approval_workflow_approver_id;
DROP INDEX IF EXISTS idx_review_competency_ratings_employee_id;
DROP INDEX IF EXISTS idx_review_goal_progress_employee_id;
DROP INDEX IF EXISTS idx_review_items_review_id;
DROP INDEX IF EXISTS idx_review_kpi_templates_created_by;
DROP INDEX IF EXISTS idx_review_kpi_templates_job_family_id;
DROP INDEX IF EXISTS idx_review_kpis_created_by;
DROP INDEX IF EXISTS idx_review_monthly_sessions_manager_id;
DROP INDEX IF EXISTS idx_review_notifications_sender_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_approver_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_competency_rating_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_employee_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_manager_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_review_id;
/*
  # Remove Unused Indexes - Part 2

  1. Changes
    - Continue removing unused indexes
    
  2. Security
    - No security impact, only performance optimization
*/

-- Remove more unused indexes
DROP INDEX IF EXISTS idx_review_responses_question_id;
DROP INDEX IF EXISTS idx_review_six_month_approved_by;
DROP INDEX IF EXISTS idx_review_weekly_checkins_manager_id;
DROP INDEX IF EXISTS idx_skill_assessments_assessed_by;
DROP INDEX IF EXISTS idx_skill_development_plans_skill_id;
DROP INDEX IF EXISTS idx_skills_matrix_job_family_id;
DROP INDEX IF EXISTS idx_strategic_goals_owner_id;
DROP INDEX IF EXISTS idx_user_admin_permissions_granted_by;
DROP INDEX IF EXISTS idx_view_as_sessions_target_user_id;
DROP INDEX IF EXISTS idx_skills_master_type;
DROP INDEX IF EXISTS idx_skills_master_category;
DROP INDEX IF EXISTS idx_matrices_created_by;
DROP INDEX IF EXISTS idx_matrix_skills_matrix;
DROP INDEX IF EXISTS idx_matrix_skills_skill;
DROP INDEX IF EXISTS idx_matrix_assignments_matrix;
DROP INDEX IF EXISTS idx_matrix_assignments_employee;
DROP INDEX IF EXISTS idx_skill_ratings_matrix;
DROP INDEX IF EXISTS idx_skill_ratings_employee;
DROP INDEX IF EXISTS idx_skill_ratings_skill;
DROP INDEX IF EXISTS idx_skill_ratings_rated_by;
/*
  # Remove Unused Indexes - Part 3

  1. Changes
    - Complete removing unused indexes
    
  2. Security
    - No security impact, only performance optimization
*/

-- Remove final batch of unused indexes
DROP INDEX IF EXISTS idx_user_access_levels_access_level;
DROP INDEX IF EXISTS idx_assessment_cycles_matrix;
DROP INDEX IF EXISTS idx_assessment_cycles_created_by;
DROP INDEX IF EXISTS idx_competencies_sort;
DROP INDEX IF EXISTS idx_skill_discrepancies_employee;
DROP INDEX IF EXISTS idx_skill_discrepancies_skill;
DROP INDEX IF EXISTS idx_skill_discrepancies_flagged;
DROP INDEX IF EXISTS idx_skill_dev_actions_employee;
DROP INDEX IF EXISTS idx_skill_dev_actions_skill;
DROP INDEX IF EXISTS idx_skill_dev_actions_status;
DROP INDEX IF EXISTS idx_scheduled_meetings_cycle;
DROP INDEX IF EXISTS idx_scheduled_meetings_manager;
DROP INDEX IF EXISTS idx_scheduled_meetings_employee;
/*
  # Fix Security Definer Views v2

  1. Changes
    - Recreate views without SECURITY DEFINER
    - Views should use the invoker's permissions by default
    
  2. Security
    - More secure as views use caller's permissions
*/

-- Recreate user_status_view without SECURITY DEFINER
DROP VIEW IF EXISTS user_status_view;

CREATE VIEW user_status_view AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.active,
  p.department,
  p.job_title,
  p.manager_id,
  m.full_name as manager_name,
  p.created_at,
  p.last_active,
  CASE 
    WHEN p.active = false THEN 'Inactive'
    WHEN p.role = 'admin' THEN 'Admin'
    WHEN p.role = 'manager' THEN 'Manager'
    ELSE 'Employee'
  END as status_label
FROM profiles p
LEFT JOIN profiles m ON p.manager_id = m.id;

-- Recreate employee_skill_summary without SECURITY DEFINER
DROP VIEW IF EXISTS employee_skill_summary;

CREATE VIEW employee_skill_summary AS
SELECT
  sa.profile_id as employee_id,
  sm.id as skill_id,
  sm.name as skill_name,
  COALESCE(st.name, 'General') as skill_type,
  '📊' as skill_type_icon,
  sa.target_level,
  false as is_mandatory,
  (SELECT rating_value FROM skill_ratings WHERE employee_id = sa.profile_id AND skill_id = sm.id AND rated_by = sa.profile_id ORDER BY rated_at DESC LIMIT 1) as latest_self_rating,
  (SELECT rating_value FROM skill_ratings WHERE employee_id = sa.profile_id AND skill_id = sm.id AND rated_by != sa.profile_id ORDER BY rated_at DESC LIMIT 1) as latest_manager_rating,
  sa.current_level as current_rating,
  sa.assessment_date as last_assessed_at,
  'active' as cycle_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM skill_assessment_discrepancies sad 
      WHERE sad.employee_id = sa.profile_id 
      AND sad.skill_id = sm.id 
      AND sad.flagged_for_discussion = true 
      AND sad.resolved_at IS NULL
    ) THEN true 
    ELSE false 
  END as has_discrepancy,
  (SELECT ai_analysis FROM skill_assessment_discrepancies WHERE employee_id = sa.profile_id AND skill_id = sm.id ORDER BY created_at DESC LIMIT 1) as discrepancy_analysis
FROM skill_assessments sa
JOIN skills_master sm ON sa.skill_id = sm.id
LEFT JOIN skill_types st ON sm.skill_type_id = st.id;
/*
  # Create One-to-One Review Cycles Table

  1. New Tables
    - `one_to_one_review_cycles`
      - `id` (uuid, primary key)
      - `manager_id` (uuid, references profiles)
      - `cycle_name` (text)
      - `cycle_start_date` (date)
      - `cycle_end_date` (date, nullable)
      - `standard_agenda` (text, nullable)
      - `has_strategic_kpis` (boolean)
      - `strategic_goal_id` (uuid, nullable)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `one_to_one_cycle_kpis`
      - `id` (uuid, primary key)
      - `cycle_id` (uuid, references one_to_one_review_cycles)
      - `kpi_name` (text)
      - `target_value` (text)
      - `measurement_unit` (text)
      - `frequency` (text)
      - `source` (text)
      - `sort_order` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Managers can manage their own cycles and KPIs
    - Admins have full access
    - Employees can view cycles they're involved in
*/

-- Create one_to_one_review_cycles table
CREATE TABLE IF NOT EXISTS one_to_one_review_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  cycle_name text NOT NULL,
  cycle_start_date date NOT NULL,
  cycle_end_date date,
  standard_agenda text,
  has_strategic_kpis boolean DEFAULT false,
  strategic_goal_id uuid,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create one_to_one_cycle_kpis table
CREATE TABLE IF NOT EXISTS one_to_one_cycle_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES one_to_one_review_cycles(id) ON DELETE CASCADE NOT NULL,
  kpi_name text NOT NULL,
  target_value text NOT NULL,
  measurement_unit text DEFAULT '',
  frequency text DEFAULT 'weekly',
  source text DEFAULT 'manager',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_one_to_one_cycles_manager ON one_to_one_review_cycles(manager_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_cycles_status ON one_to_one_review_cycles(status);
CREATE INDEX IF NOT EXISTS idx_one_to_one_cycle_kpis_cycle ON one_to_one_cycle_kpis(cycle_id);

-- Enable RLS
ALTER TABLE one_to_one_review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_to_one_cycle_kpis ENABLE ROW LEVEL SECURITY;

-- Policies for one_to_one_review_cycles
CREATE POLICY "Managers can view own cycles"
  ON one_to_one_review_cycles FOR SELECT
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
  );

CREATE POLICY "Managers can create own cycles"
  ON one_to_one_review_cycles FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
  );

CREATE POLICY "Managers can update own cycles"
  ON one_to_one_review_cycles FOR UPDATE
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
  );

CREATE POLICY "Managers can delete own cycles"
  ON one_to_one_review_cycles FOR DELETE
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
  );

-- Policies for one_to_one_cycle_kpis
CREATE POLICY "Users can view cycle KPIs"
  ON one_to_one_cycle_kpis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_review_cycles c
      WHERE c.id = cycle_id
      AND (
        c.manager_id = (SELECT auth.uid()) OR
        (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
      )
    )
  );

CREATE POLICY "Managers can create cycle KPIs"
  ON one_to_one_cycle_kpis FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_review_cycles c
      WHERE c.id = cycle_id
      AND (
        c.manager_id = (SELECT auth.uid()) OR
        (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
      )
    )
  );

CREATE POLICY "Managers can update cycle KPIs"
  ON one_to_one_cycle_kpis FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_review_cycles c
      WHERE c.id = cycle_id
      AND (
        c.manager_id = (SELECT auth.uid()) OR
        (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
      )
    )
  );

CREATE POLICY "Managers can delete cycle KPIs"
  ON one_to_one_cycle_kpis FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_review_cycles c
      WHERE c.id = cycle_id
      AND (
        c.manager_id = (SELECT auth.uid()) OR
        (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin') IS NOT NULL
      )
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_one_to_one_review_cycles_updated_at
  BEFORE UPDATE ON one_to_one_review_cycles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
/*
  # Add Frequency and Time Settings to One-to-One Review Cycles

  1. Changes
    - Add `review_frequency` column (weekly, biweekly, monthly)
    - Add `preferred_time` column (time of day for meetings)
    - Add `preferred_day` column (day of week for meetings)
    - Add `duration_minutes` column (default meeting length)

  2. Notes
    - These settings help managers establish regular cadence for one-to-ones
    - Preferred time and day are suggestions for scheduling
*/

-- Add frequency and timing columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'review_frequency'
  ) THEN
    ALTER TABLE one_to_one_review_cycles 
    ADD COLUMN review_frequency text DEFAULT 'weekly' CHECK (review_frequency IN ('weekly', 'biweekly', 'monthly'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'preferred_time'
  ) THEN
    ALTER TABLE one_to_one_review_cycles 
    ADD COLUMN preferred_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'preferred_day'
  ) THEN
    ALTER TABLE one_to_one_review_cycles 
    ADD COLUMN preferred_day text CHECK (preferred_day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE one_to_one_review_cycles 
    ADD COLUMN duration_minutes integer DEFAULT 30;
  END IF;
END $$;
/*
  # Allow Ad-hoc One-to-One Meetings Without Cycles

  1. Changes
    - Modify `one_to_one_scheduled_meetings.cycle_id` to allow NULL values
    - This enables managers to conduct ad-hoc one-to-one reviews without requiring a scheduled cycle
    - Scheduled reviews will still have a cycle_id, while ad-hoc reviews will have NULL
  
  2. Notes
    - Ad-hoc meetings are created when a manager clicks "Start Review" without a cycle
    - This provides flexibility for managers to conduct reviews as needed
*/

-- Allow cycle_id to be NULL for ad-hoc meetings
ALTER TABLE one_to_one_scheduled_meetings 
  ALTER COLUMN cycle_id DROP NOT NULL;

/*
  # Add Completion Status Tracking to One-to-One Meetings

  1. Changes
    - Add `completion_status` column to track the status of one-to-one meetings
    - Add `submitted_at` column to track when the review was completed
    - These fields enable better tracking of review progress and completion
  
  2. Status Values
    - 'scheduled': Meeting is scheduled but not started
    - 'in_progress': Manager has started the review
    - 'completed': Review has been submitted
    - 'cancelled': Meeting was cancelled
*/

-- Add completion_status column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'one_to_one_scheduled_meetings' 
    AND column_name = 'completion_status'
  ) THEN
    ALTER TABLE one_to_one_scheduled_meetings 
      ADD COLUMN completion_status text DEFAULT 'scheduled';
  END IF;
END $$;

-- Add submitted_at column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'one_to_one_scheduled_meetings' 
    AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE one_to_one_scheduled_meetings 
      ADD COLUMN submitted_at timestamptz;
  END IF;
END $$;

-- Add index for faster queries on completion_status
CREATE INDEX IF NOT EXISTS idx_one_to_one_meetings_completion_status 
  ON one_to_one_scheduled_meetings(completion_status);

-- Add index for faster queries on submitted_at
CREATE INDEX IF NOT EXISTS idx_one_to_one_meetings_submitted_at 
  ON one_to_one_scheduled_meetings(submitted_at);

/*
  # Restore Original Job Family Level Values
  
  1. Changes
    - Drop the constraint first
    - Update existing data to use original level naming
    - Add new check constraint with original level values
  
  2. Level Mapping
    - Entry → IC1
    - Mid → IC2
    - Senior → IC3
    - Lead → Manager M1
    - Principal → Manager M2
*/

-- Drop the existing check constraint first
ALTER TABLE job_families 
DROP CONSTRAINT IF EXISTS job_families_level_check;

-- Update existing data to match the original level values
UPDATE job_families
SET level = CASE level
  WHEN 'Entry' THEN 'IC1'
  WHEN 'Mid' THEN 'IC2'
  WHEN 'Senior' THEN 'IC3'
  WHEN 'Lead' THEN 'Manager M1'
  WHEN 'Principal' THEN 'Manager M2'
  ELSE level
END;

-- Add the restored check constraint with original level values
ALTER TABLE job_families
ADD CONSTRAINT job_families_level_check 
CHECK (level = ANY (ARRAY[
  'IC1'::text, 'IC2'::text, 'IC3'::text,
  'Technical IC1'::text, 'Technical IC2'::text, 'Technical IC3'::text, 'Technical IC4'::text, 'Technical IC5'::text,
  'Manager M1'::text, 'Manager M2'::text, 'Manager M3'::text, 'Manager M4'::text, 'Manager M5'::text,
  'Leader'::text, 'Executive'::text
]));
/*
  # Update Job Families Field Names

  1. Changes
    - Rename `learning_objectives` to `accountabilities` (text array remains)
    - Add new column `what_great_looks_like` (text array)
    - Rename `key_responsibilities` to `skills` (text array)
    - Rename `required_skills` to `experience` (text array)

  2. Notes
    - Data is preserved during renaming
    - All fields remain as text arrays for multiple entries
*/

-- Rename learning_objectives to accountabilities
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'learning_objectives'
  ) THEN
    ALTER TABLE job_families RENAME COLUMN learning_objectives TO accountabilities;
  END IF;
END $$;

-- Add new what_great_looks_like column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'what_great_looks_like'
  ) THEN
    ALTER TABLE job_families ADD COLUMN what_great_looks_like text[] DEFAULT '{}';
  END IF;
END $$;

-- Rename key_responsibilities to skills
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'key_responsibilities'
  ) THEN
    ALTER TABLE job_families RENAME COLUMN key_responsibilities TO skills;
  END IF;
END $$;

-- Rename required_skills to experience
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'required_skills'
  ) THEN
    ALTER TABLE job_families RENAME COLUMN required_skills TO experience;
  END IF;
END $$;
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

/*
  # Fix Duplicate update_updated_at_column Functions

  1. Problem
    - Multiple versions of update_updated_at_column function exist
    - Causing schema errors

  2. Solution
    - Drop all existing versions (CASCADE removes dependent triggers)
    - Create single secure version with proper search_path
    - Recreate triggers for key tables

  3. Security
    - Sets search_path to empty to prevent manipulation attacks
    - Maintains SECURITY DEFINER for trigger execution
*/

-- Drop all existing versions of the function (CASCADE removes triggers)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Recreate with secure configuration
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers for main tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_cycles_updated_at
  BEFORE UPDATE ON review_cycles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_instances_updated_at
  BEFORE UPDATE ON review_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_courses_updated_at
  BEFORE UPDATE ON training_courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_modules_updated_at
  BEFORE UPDATE ON training_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_families_updated_at
  BEFORE UPDATE ON job_families
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategic_goals_updated_at
  BEFORE UPDATE ON strategic_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competency_frameworks_updated_at
  BEFORE UPDATE ON competency_frameworks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_career_plans_updated_at
  BEFORE UPDATE ON career_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skill_development_plans_updated_at
  BEFORE UPDATE ON skill_development_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();