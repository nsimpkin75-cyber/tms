/*
  # Add Pathway layer and extended role profile columns to job_families

  ## Summary
  This migration adds a `pathway` column to `job_families` to support the
  Department → Pathway → Role hierarchy, and adds structured role profile
  columns so each role profile can carry full progression guidance.

  ## Changes to job_families

  ### New columns
  - `pathway` (text) — specialist pathway within a department, e.g. "L&D", "HR", "QA"
  - `role_purpose` (text) — detailed role purpose statement (supplements existing `description`)
  - `qualifications_training` (text[]) — recommended qualifications / training for the role
  - `competencies` (text[]) — behavioural competencies expected in this role
  - `kpi_expectations` (text[]) — KPI / performance expectations
  - `recommended_learning` (text[]) — recommended learning resources
  - `recommended_prev_roles` (text[]) — suggested previous roles before entering this role
  - `side_step_roles` (text[]) — optional side-step transitions (not direct progression)
  - `typical_experience_required` (text) — free-text description of typical experience needed
  - `internal_progression_criteria` (text) — what needs to be evidenced for internal progression
  - `mentoring_suggestions` (text) — optional mentoring / shadowing suggestions

  ## Notes
  - All existing data is preserved; new columns default to NULL / empty array
  - No existing columns are removed or renamed
  - No RLS changes; job_families inherits existing policies
  - profiles.job_family_id and all existing foreign keys remain intact
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'pathway') THEN
    ALTER TABLE job_families ADD COLUMN pathway text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'role_purpose') THEN
    ALTER TABLE job_families ADD COLUMN role_purpose text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'qualifications_training') THEN
    ALTER TABLE job_families ADD COLUMN qualifications_training text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'competencies_behaviours') THEN
    ALTER TABLE job_families ADD COLUMN competencies_behaviours text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'kpi_expectations') THEN
    ALTER TABLE job_families ADD COLUMN kpi_expectations text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'recommended_learning') THEN
    ALTER TABLE job_families ADD COLUMN recommended_learning text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'recommended_prev_roles') THEN
    ALTER TABLE job_families ADD COLUMN recommended_prev_roles text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'side_step_roles') THEN
    ALTER TABLE job_families ADD COLUMN side_step_roles text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'typical_experience_required') THEN
    ALTER TABLE job_families ADD COLUMN typical_experience_required text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'internal_progression_criteria') THEN
    ALTER TABLE job_families ADD COLUMN internal_progression_criteria text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_families' AND column_name = 'mentoring_suggestions') THEN
    ALTER TABLE job_families ADD COLUMN mentoring_suggestions text;
  END IF;
END $$;

-- Index on pathway for efficient filtering in dropdowns
CREATE INDEX IF NOT EXISTS idx_job_families_pathway ON job_families(pathway);
CREATE INDEX IF NOT EXISTS idx_job_families_dept_pathway ON job_families(department, pathway);
