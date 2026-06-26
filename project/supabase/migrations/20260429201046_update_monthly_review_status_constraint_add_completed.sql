/*
  # Update monthly review status constraint to include 'completed'

  ## Summary
  The status check constraint on one_to_one_monthly_reviews is updated to allow
  'completed' as a valid status value. Existing 'submitted' records are then
  migrated to 'completed'. 'submitted' is kept in the constraint for any legacy
  compatibility but will not be produced by the app going forward.

  ## Changes
  - Drops existing status check constraint
  - Re-creates it with 'draft', 'submitted', and 'completed' allowed
  - Updates all existing rows where status = 'submitted' to status = 'completed'
*/

ALTER TABLE one_to_one_monthly_reviews
  DROP CONSTRAINT IF EXISTS one_to_one_monthly_reviews_status_check;

ALTER TABLE one_to_one_monthly_reviews
  ADD CONSTRAINT one_to_one_monthly_reviews_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'completed'::text]));

UPDATE one_to_one_monthly_reviews
SET status = 'completed'
WHERE status = 'submitted';
