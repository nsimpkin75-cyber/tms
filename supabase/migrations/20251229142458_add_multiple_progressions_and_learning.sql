/*
  # Add Multiple Progression Options and Learning Resources

  ## Changes
  
  1. Schema Updates
    - Replace `progression_to` with `progression_options` array to support multiple next roles
    - Add `learning_resources` text field to store development and training information
    - Migrate existing progression_to data to progression_options array
  
  ## Notes
  - progression_options stores multiple possible next roles (array of strings)
  - learning_resources stores training courses, certifications, and skills to develop
  - Existing single progression_to values are migrated to the new array format
*/

-- Add progression_options column as an array
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'progression_options'
  ) THEN
    ALTER TABLE job_families ADD COLUMN progression_options text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;

-- Add learning_resources column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'learning_resources'
  ) THEN
    ALTER TABLE job_families ADD COLUMN learning_resources text;
  END IF;
END $$;

-- Migrate existing progression_to data to progression_options
DO $$
BEGIN
  UPDATE job_families 
  SET progression_options = ARRAY[progression_to]::text[]
  WHERE progression_to IS NOT NULL 
    AND progression_to != ''
    AND (progression_options IS NULL OR array_length(progression_options, 1) IS NULL);
END $$;

-- Drop the old progression_to column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'progression_to'
  ) THEN
    ALTER TABLE job_families DROP COLUMN progression_to;
  END IF;
END $$;