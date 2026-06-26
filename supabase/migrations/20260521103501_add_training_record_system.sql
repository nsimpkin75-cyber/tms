/*
  # Add Training Record System

  ## Overview
  Extends the Skills Matrix with a lightweight training record layer.
  Ratings 0 and 1 are training-controlled; ratings 2-5 come from assessments.

  ## Changes

  ### 1. sm_topics — new column
  - `training_trackable` (boolean, default false) — marks a topic as training-trackable.
    When true, employees assigned this topic receive a default rating of 0 (No formal training).

  ### 2. sm_training_records — new table
  Stores one row per (employee, topic, matrix) representing their training status.
  - `id` — primary key
  - `employee_id` — the employee (FK to auth.users)
  - `topic_id` — the skill topic (FK to sm_topics)
  - `matrix_id` — the matrix this record belongs to (FK to sm_matrices)
  - `training_date` — when training was completed (nullable)
  - `rating` — computed: 0 = no record, 1 = trained (set automatically when training_date is filled)
  - `notes` — optional free-text
  - `created_by`, `updated_by`, `created_at`, `updated_at`

  Unique constraint: one record per (employee_id, topic_id, matrix_id).

  ## Security
  - RLS enabled on sm_training_records
  - Employees: SELECT own records only
  - Managers: SELECT records of their direct reports
  - Dept Lead + Admin: SELECT all in their scope
  - Only admins (full admin or L&D admin) can INSERT/UPDATE/DELETE
*/

-- ── 1. Add training_trackable to sm_topics ──────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sm_topics' AND column_name = 'training_trackable'
  ) THEN
    ALTER TABLE sm_topics ADD COLUMN training_trackable boolean DEFAULT false;
  END IF;
END $$;

-- ── 2. Create sm_training_records table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS sm_training_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id      uuid NOT NULL REFERENCES sm_topics(id) ON DELETE CASCADE,
  matrix_id     uuid NOT NULL REFERENCES sm_matrices(id) ON DELETE CASCADE,
  training_date date DEFAULT NULL,
  rating        smallint NOT NULL DEFAULT 0
    CHECK (rating IN (0, 1)),
  notes         text DEFAULT NULL,
  created_by    uuid REFERENCES auth.users(id),
  updated_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (employee_id, topic_id, matrix_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sm_training_records_employee_id ON sm_training_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_sm_training_records_topic_id    ON sm_training_records(topic_id);
CREATE INDEX IF NOT EXISTS idx_sm_training_records_matrix_id   ON sm_training_records(matrix_id);

-- ── 3. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE sm_training_records ENABLE ROW LEVEL SECURITY;

-- Employees can view their own records
CREATE POLICY "Employees view own training records"
  ON sm_training_records FOR SELECT
  TO authenticated
  USING (auth.uid() = employee_id);

-- Managers can view records for their direct reports
CREATE POLICY "Managers view team training records"
  ON sm_training_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles emp
      JOIN profiles mgr ON mgr.id = auth.uid()
      WHERE emp.id = sm_training_records.employee_id
        AND emp.manager_id = auth.uid()
    )
  );

-- Dept leads can view all records for their department
CREATE POLICY "Dept leads view department training records"
  ON sm_training_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles emp
      JOIN profiles dl ON dl.id = auth.uid()
      WHERE emp.id = sm_training_records.employee_id
        AND emp.department = dl.department
        AND dl.role IN ('dept_lead', 'admin')
    )
  );

-- Admins can insert training records
CREATE POLICY "Admins insert training records"
  ON sm_training_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR (admin_type IS NOT NULL AND admin_type != ''))
    )
  );

-- Admins can update training records
CREATE POLICY "Admins update training records"
  ON sm_training_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR (admin_type IS NOT NULL AND admin_type != ''))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR (admin_type IS NOT NULL AND admin_type != ''))
    )
  );

-- Admins can delete training records
CREATE POLICY "Admins delete training records"
  ON sm_training_records FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND (role = 'admin' OR (admin_type IS NOT NULL AND admin_type != ''))
    )
  );
