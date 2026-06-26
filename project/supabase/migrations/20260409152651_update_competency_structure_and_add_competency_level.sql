/*
  # Update Competency Structure and Add competency_level to Profiles

  ## Summary
  This migration replaces the old competency level structure (positive/negative statements, 
  job family dependencies) with a new role-aware structure tied directly to values.

  ## Changes

  ### 1. competencies table
  - Drop old `competency_levels` table dependencies (levels table renamed to new structure)
  - Add new fields directly to `competencies`:
    - `competency_statement` — the overall competency statement
    - `employee_evidence_prompt` — prompt shown to employees
    - `employee_what_good_looks_like` — good performance description for employees
    - `employee_what_great_looks_like` — great performance description for employees
    - `manager_evidence_prompt` — prompt shown to managers
    - `manager_what_good_looks_like` — good performance description for managers
    - `manager_what_great_looks_like` — great performance description for managers
    - `senior_leader_evidence_prompt` — prompt shown to senior leaders
    - `senior_leader_what_good_looks_like` — good performance description for senior leaders
    - `senior_leader_what_great_looks_like` — great performance description for senior leaders

  ### 2. profiles table
  - Add `competency_level` column: text, values 'Employee' | 'Manager' | 'Senior Leader', default 'Employee'

  ### 3. Backfill
  - Set competency_level = 'Employee' for all profiles where null

  ### Notes
  - The old competency_levels table and job_family_competencies table are NOT dropped
    to preserve existing data (role profiles remain intact)
  - New fields allow null so existing competency records don't break
  - The review forms will use competency_level on the user profile to determine 
    which prompt/description to display
*/

-- Add new fields to competencies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'competency_statement'
  ) THEN
    ALTER TABLE competencies ADD COLUMN competency_statement text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'employee_evidence_prompt'
  ) THEN
    ALTER TABLE competencies ADD COLUMN employee_evidence_prompt text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'employee_what_good_looks_like'
  ) THEN
    ALTER TABLE competencies ADD COLUMN employee_what_good_looks_like text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'employee_what_great_looks_like'
  ) THEN
    ALTER TABLE competencies ADD COLUMN employee_what_great_looks_like text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'manager_evidence_prompt'
  ) THEN
    ALTER TABLE competencies ADD COLUMN manager_evidence_prompt text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'manager_what_good_looks_like'
  ) THEN
    ALTER TABLE competencies ADD COLUMN manager_what_good_looks_like text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'manager_what_great_looks_like'
  ) THEN
    ALTER TABLE competencies ADD COLUMN manager_what_great_looks_like text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'senior_leader_evidence_prompt'
  ) THEN
    ALTER TABLE competencies ADD COLUMN senior_leader_evidence_prompt text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'senior_leader_what_good_looks_like'
  ) THEN
    ALTER TABLE competencies ADD COLUMN senior_leader_what_good_looks_like text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'senior_leader_what_great_looks_like'
  ) THEN
    ALTER TABLE competencies ADD COLUMN senior_leader_what_great_looks_like text;
  END IF;
END $$;

-- Add competency_level to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'competency_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN competency_level text DEFAULT 'Employee';
  END IF;
END $$;

-- Backfill: set competency_level = 'Employee' for all existing users where null
UPDATE profiles
SET competency_level = 'Employee'
WHERE competency_level IS NULL;

-- Add check constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_competency_level_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_competency_level_check
      CHECK (competency_level IN ('Employee', 'Manager', 'Senior Leader'));
  END IF;
END $$;
