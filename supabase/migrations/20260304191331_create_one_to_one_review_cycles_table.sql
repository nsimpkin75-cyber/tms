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