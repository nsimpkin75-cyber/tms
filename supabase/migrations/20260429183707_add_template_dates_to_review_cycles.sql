/*
  # Add template_start_date and template_end_date to one_to_one_review_cycles

  ## Changes
  - Adds `template_start_date` date column: the start date of the review template
  - Adds `template_end_date` date column: the end date of the review template
  - Both are nullable to allow migration of existing records without breaking changes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'template_start_date'
  ) THEN
    ALTER TABLE one_to_one_review_cycles ADD COLUMN template_start_date date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'template_end_date'
  ) THEN
    ALTER TABLE one_to_one_review_cycles ADD COLUMN template_end_date date;
  END IF;
END $$;
