/*
  # Migrate previous_roles from text to JSONB array on profiles

  Changes previous_roles column from plain text to a JSONB array of structured entries.
  Each entry: { department, role, job_family_id, start_date, end_date, reason }
  Existing text values are discarded safely (were 'N/A' or freeform text with no data value).
  Defaults to empty array [].
*/

DO $$
BEGIN
  -- Drop the existing text column and recreate as jsonb
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'previous_roles'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE profiles DROP COLUMN previous_roles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'previous_roles'
  ) THEN
    ALTER TABLE profiles ADD COLUMN previous_roles jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;
