/*
  # Add previous_roles to profiles table

  Adds a previous_roles column to store a simple text field of prior roles.
  Defaults to 'N/A' when blank. Used for progression history display only —
  does not affect current job_title, department, or job_family_id.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'previous_roles'
  ) THEN
    ALTER TABLE profiles ADD COLUMN previous_roles text DEFAULT 'N/A';
  END IF;
END $$;
