/*
# Value Behavioral Examples — Role-Tiered Indicators

## Overview
Adds a dedicated table for per-value behavioral examples across two rating
levels (Level 3 = Good/Proficient, Level 4 = Excellent/Exemplary) and three
organizational role personas (Employee, Manager, Senior Leader).

This complements the existing per-competency guidance fields
(employee_what_good_looks_like, etc.) by allowing behavioral indicators at
the Value level itself — giving a high-level behavioral framework for each
value before drilling into specific competencies.

## New Table
**value_behavioral_examples**
- id (uuid PK)
- value_id (uuid FK → values, ON DELETE CASCADE)
- role_level (enum: 'employee', 'manager', 'senior_leader')
- rating_level (integer: 3 = Good/Proficient, 4 = Excellent/Exemplary)
- behavioral_text (text — multi-line behavioral indicators)
- created_by (uuid, references auth.users)
- created_at, updated_at (timestamps)
- UNIQUE(value_id, role_level, rating_level)
*/

DO $$ BEGIN
  CREATE TYPE behavioral_role_level AS ENUM ('employee', 'manager', 'senior_leader');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS value_behavioral_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value_id uuid NOT NULL REFERENCES values(id) ON DELETE CASCADE,
  role_level behavioral_role_level NOT NULL,
  rating_level integer NOT NULL CHECK (rating_level IN (3, 4)),
  behavioral_text text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(value_id, role_level, rating_level)
);

ALTER TABLE value_behavioral_examples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_value_behavioral_examples" ON value_behavioral_examples;
CREATE POLICY "select_value_behavioral_examples" ON value_behavioral_examples FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_value_behavioral_examples_admin" ON value_behavioral_examples;
CREATE POLICY "insert_value_behavioral_examples_admin" ON value_behavioral_examples FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  );

DROP POLICY IF EXISTS "update_value_behavioral_examples_admin" ON value_behavioral_examples;
CREATE POLICY "update_value_behavioral_examples_admin" ON value_behavioral_examples FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  );

DROP POLICY IF EXISTS "delete_value_behavioral_examples_admin" ON value_behavioral_examples;
CREATE POLICY "delete_value_behavioral_examples_admin" ON value_behavioral_examples FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  );

CREATE INDEX IF NOT EXISTS idx_value_behavioral_value ON value_behavioral_examples(value_id);
CREATE INDEX IF NOT EXISTS idx_value_behavioral_role ON value_behavioral_examples(role_level);
CREATE INDEX IF NOT EXISTS idx_value_behavioral_rating ON value_behavioral_examples(rating_level);
