/*
  # Add Sort Order to Job Families

  1. Changes
    - Add `sort_order` column (integer) - Defines the display order within a department
    - Defaults to 0 for backward compatibility
  
  2. Notes
    - Lower numbers appear first (e.g., Entry level = 1, Mid = 2, etc.)
    - This allows explicit control over progression visualization
    - Jobs within same department will be ordered by sort_order, then by level
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE job_families ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;

-- Set initial sort_order based on level hierarchy for existing records
UPDATE job_families
SET sort_order = CASE level
  WHEN 'Entry' THEN 1
  WHEN 'Mid' THEN 2
  WHEN 'Senior' THEN 3
  WHEN 'Lead' THEN 4
  WHEN 'Principal' THEN 5
  ELSE 0
END
WHERE sort_order = 0;