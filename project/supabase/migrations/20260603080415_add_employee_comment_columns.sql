/*
  # Add employee comment columns

  ## Summary
  Adds three new columns to support employee-authored comments:

  1. `one_to_one_weekly_checkins.employee_comment` (text)
     - The employee's own weekly update — written before the manager completes the check-in
     - Separate from the manager's `summary` field

  2. `one_to_one_monthly_reviews.employee_overall_comment` (text)
     - The employee's overall comment on the review period
     - Appears in the Actions & Comments tab, above the SERA summary

  3. `one_to_one_monthly_reviews.values_ratings` already stores per-competency data as JSONB
     - Per-competency employee comments will be stored inside each element as `employee_comment`
     - No schema change needed; JSONB column is flexible

  No existing data is modified. All new columns default to NULL.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_weekly_checkins' AND column_name = 'employee_comment'
  ) THEN
    ALTER TABLE one_to_one_weekly_checkins ADD COLUMN employee_comment text DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_monthly_reviews' AND column_name = 'employee_overall_comment'
  ) THEN
    ALTER TABLE one_to_one_monthly_reviews ADD COLUMN employee_overall_comment text DEFAULT NULL;
  END IF;
END $$;
