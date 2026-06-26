/*
  # Add Career Progression to Job Families

  ## Changes
  
  1. Schema Updates
    - Add `progression_to` column to job_families table to track next role in career path
    - Add `alternative_paths` column to store other possible career transitions
  
  ## Notes
  - progression_to stores the primary next role (can be null for terminal roles)
  - alternative_paths stores array of other possible career moves (e.g., moving to different departments)
*/

-- Add progression_to column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'progression_to'
  ) THEN
    ALTER TABLE job_families ADD COLUMN progression_to text;
  END IF;
END $$;

-- Add alternative_paths column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'alternative_paths'
  ) THEN
    ALTER TABLE job_families ADD COLUMN alternative_paths text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;