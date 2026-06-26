/*
  # Create Competency Framework System

  1. New Tables
    - `values`
      - `id` (uuid, primary key)
      - `title` (text) - Value name (e.g., "Integrity", "Innovation")
      - `statement` (text) - Value statement/description
      - `sort_order` (integer) - Display order
      - `is_active` (boolean) - Whether this value is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `competencies`
      - `id` (uuid, primary key)
      - `value_id` (uuid) - References values table
      - `title` (text) - Competency name
      - `description` (text) - Competency description
      - `sort_order` (integer) - Display order within value
      - `is_active` (boolean) - Whether this competency is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `competency_levels`
      - `id` (uuid, primary key)
      - `competency_id` (uuid) - References competencies table
      - `level_number` (integer) - Level number (1, 2, 3, 4, etc.)
      - `level_name` (text) - Level name (e.g., "Developing", "Proficient", "Expert")
      - `statement` (text) - What this level means for this competency
      - `created_at` (timestamptz)

    - `job_family_competencies`
      - `id` (uuid, primary key)
      - `job_family_id` (uuid) - References job_families table
      - `competency_id` (uuid) - References competencies table
      - `required_level_id` (uuid) - References competency_levels table
      - `sort_order` (integer) - Display order (1-6 for the 6 competencies)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Admins can manage all competency framework data
    - All authenticated users can view active values, competencies, and levels
    - Users can view job family competencies

  3. Important Notes
    - Values represent organizational values
    - Each value can have multiple competencies
    - Each competency can have multiple levels (typically 4-5 levels)
    - Each job family should have exactly 6 competencies assigned
    - Competencies and levels flow through to reviews based on job title
*/

-- Create values table
CREATE TABLE IF NOT EXISTS values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  statement text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE values ENABLE ROW LEVEL SECURITY;

-- Create competencies table
CREATE TABLE IF NOT EXISTS competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value_id uuid NOT NULL REFERENCES values(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;

-- Create competency_levels table
CREATE TABLE IF NOT EXISTS competency_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id uuid NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  level_number integer NOT NULL,
  level_name text NOT NULL,
  statement text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(competency_id, level_number)
);

ALTER TABLE competency_levels ENABLE ROW LEVEL SECURITY;

-- Create job_family_competencies table
CREATE TABLE IF NOT EXISTS job_family_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_family_id uuid NOT NULL REFERENCES job_families(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  required_level_id uuid NOT NULL REFERENCES competency_levels(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_family_id, competency_id)
);

ALTER TABLE job_family_competencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for values table

-- All authenticated users can view active values
CREATE POLICY "Users can view active values"
  ON values FOR SELECT
  TO authenticated
  USING (is_active = true OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Admins can manage values
CREATE POLICY "Admins can create values"
  ON values FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update values"
  ON values FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete values"
  ON values FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for competencies table

-- Users can view competencies of active values
CREATE POLICY "Users can view competencies"
  ON competencies FOR SELECT
  TO authenticated
  USING (
    is_active = true OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can manage competencies
CREATE POLICY "Admins can create competencies"
  ON competencies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update competencies"
  ON competencies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete competencies"
  ON competencies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for competency_levels table

-- Users can view competency levels
CREATE POLICY "Users can view competency levels"
  ON competency_levels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM competencies
      WHERE competencies.id = competency_levels.competency_id
      AND (competencies.is_active = true OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      ))
    )
  );

-- Admins can manage competency levels
CREATE POLICY "Admins can create competency levels"
  ON competency_levels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update competency levels"
  ON competency_levels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete competency levels"
  ON competency_levels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for job_family_competencies table

-- Users can view job family competencies
CREATE POLICY "Users can view job family competencies"
  ON job_family_competencies FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage job family competencies
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

CREATE POLICY "Admins can update job family competencies"
  ON job_family_competencies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

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
CREATE INDEX IF NOT EXISTS idx_values_active ON values(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_competencies_value ON competencies(value_id);
CREATE INDEX IF NOT EXISTS idx_competencies_active ON competencies(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_competency_levels_competency ON competency_levels(competency_id, level_number);
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_job_family ON job_family_competencies(job_family_id);
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_competency ON job_family_competencies(competency_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_values_updated_at
  BEFORE UPDATE ON values
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competencies_updated_at
  BEFORE UPDATE ON competencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for demonstration
INSERT INTO values (title, statement, sort_order) VALUES
('Integrity', 'We act with honesty and transparency in all our dealings', 1),
('Innovation', 'We embrace creativity and continuous improvement', 2),
('Customer Focus', 'We put our customers at the heart of everything we do', 3),
('Teamwork', 'We collaborate effectively and support each other', 4),
('Excellence', 'We strive for the highest standards in our work', 5)
ON CONFLICT DO NOTHING;

-- Insert sample competencies
DO $$
DECLARE
  v_integrity_id uuid;
  v_innovation_id uuid;
  v_customer_id uuid;
  v_teamwork_id uuid;
  v_excellence_id uuid;
  c_communication_id uuid;
  c_problem_solving_id uuid;
  c_customer_service_id uuid;
  c_collaboration_id uuid;
  c_quality_id uuid;
BEGIN
  -- Get value IDs
  SELECT id INTO v_integrity_id FROM values WHERE title = 'Integrity' LIMIT 1;
  SELECT id INTO v_innovation_id FROM values WHERE title = 'Innovation' LIMIT 1;
  SELECT id INTO v_customer_id FROM values WHERE title = 'Customer Focus' LIMIT 1;
  SELECT id INTO v_teamwork_id FROM values WHERE title = 'Teamwork' LIMIT 1;
  SELECT id INTO v_excellence_id FROM values WHERE title = 'Excellence' LIMIT 1;

  -- Insert competencies
  IF v_integrity_id IS NOT NULL THEN
    INSERT INTO competencies (value_id, title, description, sort_order)
    VALUES (v_integrity_id, 'Ethical Decision Making', 'Makes decisions based on ethical principles and organizational values', 1)
    RETURNING id INTO c_communication_id;
    
    -- Insert levels for Ethical Decision Making
    INSERT INTO competency_levels (competency_id, level_number, level_name, statement) VALUES
    (c_communication_id, 1, 'Developing', 'Recognizes ethical issues and seeks guidance when making decisions'),
    (c_communication_id, 2, 'Proficient', 'Consistently makes ethical decisions and explains reasoning to others'),
    (c_communication_id, 3, 'Advanced', 'Guides others in ethical decision-making and addresses complex ethical dilemmas'),
    (c_communication_id, 4, 'Expert', 'Sets ethical standards for the organization and influences ethical culture');
  END IF;

  IF v_innovation_id IS NOT NULL THEN
    INSERT INTO competencies (value_id, title, description, sort_order)
    VALUES (v_innovation_id, 'Problem Solving', 'Identifies and resolves problems through creative and analytical thinking', 1)
    RETURNING id INTO c_problem_solving_id;
    
    INSERT INTO competency_levels (competency_id, level_number, level_name, statement) VALUES
    (c_problem_solving_id, 1, 'Developing', 'Identifies problems and contributes to solutions with support'),
    (c_problem_solving_id, 2, 'Proficient', 'Independently analyzes and solves routine problems effectively'),
    (c_problem_solving_id, 3, 'Advanced', 'Solves complex problems and develops innovative solutions'),
    (c_problem_solving_id, 4, 'Expert', 'Tackles strategic challenges and creates breakthrough solutions');
  END IF;

  IF v_customer_id IS NOT NULL THEN
    INSERT INTO competencies (value_id, title, description, sort_order)
    VALUES (v_customer_id, 'Customer Service', 'Delivers excellent service and builds strong customer relationships', 1)
    RETURNING id INTO c_customer_service_id;
    
    INSERT INTO competency_levels (competency_id, level_number, level_name, statement) VALUES
    (c_customer_service_id, 1, 'Developing', 'Responds to customer needs with guidance and support'),
    (c_customer_service_id, 2, 'Proficient', 'Consistently delivers excellent customer service independently'),
    (c_customer_service_id, 3, 'Advanced', 'Anticipates customer needs and handles complex customer situations'),
    (c_customer_service_id, 4, 'Expert', 'Shapes customer service strategy and drives customer excellence');
  END IF;

  IF v_teamwork_id IS NOT NULL THEN
    INSERT INTO competencies (value_id, title, description, sort_order)
    VALUES (v_teamwork_id, 'Collaboration', 'Works effectively with others to achieve shared goals', 1)
    RETURNING id INTO c_collaboration_id;
    
    INSERT INTO competency_levels (competency_id, level_number, level_name, statement) VALUES
    (c_collaboration_id, 1, 'Developing', 'Participates actively in team activities and supports team goals'),
    (c_collaboration_id, 2, 'Proficient', 'Collaborates effectively and helps team members succeed'),
    (c_collaboration_id, 3, 'Advanced', 'Facilitates cross-functional collaboration and builds high-performing teams'),
    (c_collaboration_id, 4, 'Expert', 'Creates collaborative culture and enables organization-wide teamwork');
  END IF;

  IF v_excellence_id IS NOT NULL THEN
    INSERT INTO competencies (value_id, title, description, sort_order)
    VALUES (v_excellence_id, 'Quality Focus', 'Maintains high standards and attention to detail in all work', 1)
    RETURNING id INTO c_quality_id;
    
    INSERT INTO competency_levels (competency_id, level_number, level_name, statement) VALUES
    (c_quality_id, 1, 'Developing', 'Follows quality standards and checks own work for accuracy'),
    (c_quality_id, 2, 'Proficient', 'Consistently produces high-quality work and identifies improvements'),
    (c_quality_id, 3, 'Advanced', 'Sets quality standards and drives continuous quality improvement'),
    (c_quality_id, 4, 'Expert', 'Defines organizational quality strategy and excellence standards');
  END IF;
END $$;
