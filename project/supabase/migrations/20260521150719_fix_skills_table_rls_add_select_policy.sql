/*
  # Fix skills table RLS — add missing SELECT policy

  ## Problem
  The `skills` table has RLS enabled but no SELECT policy, meaning no user
  (authenticated or otherwise) can read from it. This causes the career quiz's
  skill_assessments join to fail, and may cause query hangs in the Supabase
  PostgREST layer when the embedded join is denied.

  ## Changes
  - Add SELECT policy on `skills` allowing all authenticated users to read
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'skills' AND policyname = 'Authenticated users can view skills'
  ) THEN
    CREATE POLICY "Authenticated users can view skills"
      ON skills
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
