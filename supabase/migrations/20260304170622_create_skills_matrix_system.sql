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