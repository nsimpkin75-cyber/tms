/*
  # Add missing columns to career_plans

  ## Summary
  The admin/manager career plan creation form writes `target_level` and
  `recommended_timeline_months` but these columns do not exist on the table,
  causing all admin- and manager-initiated plan saves to fail.

  ## Changes
  - `career_plans.target_level` (text, nullable) — the seniority/level of the target role
  - `career_plans.recommended_timeline_months` (integer, nullable) — planned months to achieve the goal
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'target_level'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN target_level text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'recommended_timeline_months'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN recommended_timeline_months integer;
  END IF;
END $$;
