/*
  # Add profile foreign keys to moderation_cases

  ## Problem
  moderation_cases.employee_id and manager_id currently FK to auth.users,
  which prevents PostgREST from joining profiles directly using these columns.

  ## Changes
  - Add FK constraints from moderation_cases.employee_id → profiles.id
  - Add FK constraints from moderation_cases.manager_id → profiles.id
  - These are DEFERRABLE to avoid ordering issues and ON DELETE SET NULL for safety

  Note: profiles.id = auth.users.id (1:1 mirror), so this is safe.
*/

DO $$
BEGIN
  -- Drop old auth.users FKs if they exist
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'moderation_cases_employee_id_fkey' AND contype = 'f'
      AND confrelid = (SELECT oid FROM pg_class WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth'))
  ) THEN
    ALTER TABLE moderation_cases DROP CONSTRAINT moderation_cases_employee_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'moderation_cases_manager_id_fkey' AND contype = 'f'
      AND confrelid = (SELECT oid FROM pg_class WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth'))
  ) THEN
    ALTER TABLE moderation_cases DROP CONSTRAINT moderation_cases_manager_id_fkey;
  END IF;

  -- Add FKs pointing to profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'moderation_cases_employee_id_fkey' AND contype = 'f'
      AND confrelid = (SELECT oid FROM pg_class WHERE relname = 'profiles' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  ) THEN
    ALTER TABLE moderation_cases
      ADD CONSTRAINT moderation_cases_employee_id_fkey
      FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'moderation_cases_manager_id_fkey' AND contype = 'f'
      AND confrelid = (SELECT oid FROM pg_class WHERE relname = 'profiles' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  ) THEN
    ALTER TABLE moderation_cases
      ADD CONSTRAINT moderation_cases_manager_id_fkey
      FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
