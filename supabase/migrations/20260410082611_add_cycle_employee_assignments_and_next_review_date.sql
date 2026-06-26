/*
  # Cycle employee assignments and scheduling fields

  ## New Tables
  - `one_to_one_cycle_employee_assignments`
    - Links employees to review cycles (one active cycle per employee per manager)
    - Stores assignment date, removed date, and whether active
    - History is preserved; removing from a cycle only sets removed_at, never deletes

  ## Modified Tables
  - `one_to_one_review_cycles`
    - `next_review_date` - date of next scheduled review
    - `cycle_type` - e.g. 'probation', 'standard', 'performance_support'

  ## Security
  - RLS enabled on new table
  - Managers can manage their own assignments
  - Admins have full access
*/

CREATE TABLE IF NOT EXISTS one_to_one_cycle_employee_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES one_to_one_review_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  removed_at timestamptz,
  is_active boolean DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_cycle_employee_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage their cycle assignments"
  ON one_to_one_cycle_employee_assignments
  FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')
    )
  );

CREATE POLICY "Managers can insert cycle assignments"
  ON one_to_one_cycle_employee_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Managers can update cycle assignments"
  ON one_to_one_cycle_employee_assignments
  FOR UPDATE
  TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'next_review_date'
  ) THEN
    ALTER TABLE one_to_one_review_cycles ADD COLUMN next_review_date date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'cycle_type'
  ) THEN
    ALTER TABLE one_to_one_review_cycles ADD COLUMN cycle_type text DEFAULT 'standard';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cycle_employee_assignments_cycle_id
  ON one_to_one_cycle_employee_assignments(cycle_id);

CREATE INDEX IF NOT EXISTS idx_cycle_employee_assignments_employee_id
  ON one_to_one_cycle_employee_assignments(employee_id);

CREATE INDEX IF NOT EXISTS idx_cycle_employee_assignments_manager_id
  ON one_to_one_cycle_employee_assignments(manager_id);
