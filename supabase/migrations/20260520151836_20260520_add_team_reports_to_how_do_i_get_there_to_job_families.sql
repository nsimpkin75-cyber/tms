/*
  # Add team, reports_to, and how_do_i_get_there to job_families

  ## Summary
  Extends role profiles (job_families) with three new fields:

  1. New Columns
    - `team` (text, nullable): Sub-group within a department, e.g. "Money", "Data", "Outreach"
    - `reports_to` (text, nullable): Title of the role this role reports into; references an existing role profile by title
    - `how_do_i_get_there` (text, nullable): Free-text coaching content — actions, learning, experience or preparation an employee can take to progress into this role. Used by SERA and the career pathway quiz for coaching and recommendations.

  2. No data is removed or renamed. Existing rows retain all their current values.

  ## Notes
  - `reports_to` stores the role title as a string (same pattern as `progression_to`) to allow references without a hard FK constraint.
  - `how_do_i_get_there` is intentionally a plain text column so it can be surfaced in AI prompts without additional joins.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'team'
  ) THEN
    ALTER TABLE job_families ADD COLUMN team text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'reports_to'
  ) THEN
    ALTER TABLE job_families ADD COLUMN reports_to text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_families' AND column_name = 'how_do_i_get_there'
  ) THEN
    ALTER TABLE job_families ADD COLUMN how_do_i_get_there text;
  END IF;
END $$;
