/*
  # Add review_id to moderation_cases

  Links each moderation case back to the specific one_to_one_monthly_review
  it was created for. Used by moderation panels to load per-competency
  values_ratings directly from the review record.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moderation_cases' AND column_name = 'review_id'
  ) THEN
    ALTER TABLE moderation_cases ADD COLUMN review_id uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_moderation_cases_review_id ON moderation_cases (review_id);
