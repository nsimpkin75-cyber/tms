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