/*
  # Add Job Family Details Fields

  1. Changes
    - Add `responsibilities` column (text array) - List of key responsibilities for the role
    - Add `experience_required` column (text) - Description of required experience (e.g., "2-3 years in implementation")
    - Add `typical_time_in_role` column (text) - Expected duration in role before progression (e.g., "18-24 months")
  
  2. Notes
    - All fields are nullable to maintain backward compatibility
    - responsibilities stored as array for structured data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'responsibilities'
  ) THEN
    ALTER TABLE job_families ADD COLUMN responsibilities text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'experience_required'
  ) THEN
    ALTER TABLE job_families ADD COLUMN experience_required text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'typical_time_in_role'
  ) THEN
    ALTER TABLE job_families ADD COLUMN typical_time_in_role text;
  END IF;
END $$;