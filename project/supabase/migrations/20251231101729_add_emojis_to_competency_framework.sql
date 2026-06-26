/*
  # Add Emoji Support to Competency Framework

  1. Changes
    - Add `emoji` column to `values` table
    - Add `emoji` column to `competencies` table
    - Set default emojis for existing records

  2. Notes
    - Emoji fields are optional (can be null)
    - Users can select emojis when creating/editing values and competencies
*/

-- Add emoji column to values table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'values' AND column_name = 'emoji'
  ) THEN
    ALTER TABLE values ADD COLUMN emoji text;
  END IF;
END $$;

-- Add emoji column to competencies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'emoji'
  ) THEN
    ALTER TABLE competencies ADD COLUMN emoji text;
  END IF;
END $$;
