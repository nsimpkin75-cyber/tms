/*
  # Add SERA Coaching Context to Job Families

  Adds a new internal-only field `sera_coaching_context` to the `job_families` table.

  ## New Column
  - `sera_coaching_context` (text, nullable) — admin-authored coaching notes for SERA only.
    Not shown to employees. Contains: high-performer behaviours, mindset/personality traits,
    working style, communication style, common development gaps, transition advice, and
    coaching considerations SERA uses when coaching employees toward or within this role.

  ## Notes
  - Existing `competencies_behaviours` and `kpi_expectations` columns are intentionally
    preserved for data safety — they are simply no longer surfaced in the UI.
  - No data migration needed; existing role profiles are unaffected.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'sera_coaching_context'
  ) THEN
    ALTER TABLE public.job_families ADD COLUMN sera_coaching_context text;
  END IF;
END $$;
