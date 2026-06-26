/*
  # Add archived flag to sm_matrices

  1. Changes
    - Adds `archived boolean DEFAULT false` to `sm_matrices`
    - Archived matrices are hidden from new assessment cycle creation
    - Historic assessment and training data is preserved
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sm_matrices' AND column_name = 'archived'
  ) THEN
    ALTER TABLE sm_matrices ADD COLUMN archived boolean NOT NULL DEFAULT false;
  END IF;
END $$;
