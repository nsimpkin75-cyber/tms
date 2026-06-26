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