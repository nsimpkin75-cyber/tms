/*
  # Add quarter and summary fields to one_to_one_review_cycles

  1. Changes
    - Add `quarter` column (e.g., "Q1 2025") to identify the cycle period
    - Add `summary` column for the cycle-level summary/objectives text

  These fields support the manager setting a cycle for the entire team with a quarter label and overall summary.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'quarter'
  ) THEN
    ALTER TABLE one_to_one_review_cycles ADD COLUMN quarter text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'summary'
  ) THEN
    ALTER TABLE one_to_one_review_cycles ADD COLUMN summary text;
  END IF;
END $$;
