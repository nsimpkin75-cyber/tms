/*
  # Backfill review_id from source_id for existing moderation cases

  ## Problem
  Moderation cases created before the review_id column was added have review_id = NULL.
  The source_id column contains the review UUID for cases with source_type = 'competency_assessment'.
  The DeptLeadModerationPanel loads competency data using review_id, so these cases show "no competencies".

  ## Fix
  Copy source_id into review_id for all cases where:
  - review_id IS NULL
  - source_id IS NOT NULL
  - source_type = 'competency_assessment'
  - source_id looks like a valid UUID (exists in one_to_one_monthly_reviews)

  ## Changes
  - Updates moderation_cases.review_id = source_id for affected rows
*/

UPDATE moderation_cases
SET review_id = source_id::uuid
WHERE review_id IS NULL
  AND source_id IS NOT NULL
  AND source_type = 'competency_assessment'
  AND EXISTS (
    SELECT 1 FROM one_to_one_monthly_reviews
    WHERE id = source_id::uuid
  );
