/*
  # Reset Kayleigh Lacasse's moderation case to pending

  The seed moderation case for Kayleigh's May 2026 review (source_id = b311cfb4-fa7f-4a83-b554-88d1f535b0a9)
  may have been actioned during testing. This migration resets it to:
    - status: 'pending'
    - current_step: 1  (Department Lead queue)
    - dept_lead_decisions: []  (clear any prior DL decisions)
  so that Liv (the Department Lead) sees it as Action Needed again.

  Also clears any prior moderation_case_decisions rows for this case so the
  decision history starts clean for retesting.

  The review record itself and all existing values_ratings are untouched.
*/

-- Reset the moderation case
UPDATE moderation_cases
SET
  status        = 'pending',
  current_step  = 1,
  dept_lead_decisions = '[]'::jsonb,
  updated_at    = now()
WHERE source_id = 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9'
  AND source_type = 'competency_assessment';

-- Clear prior test decisions so the history is clean
DELETE FROM moderation_case_decisions
WHERE case_id IN (
  SELECT id FROM moderation_cases
  WHERE source_id = 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9'
);

-- Also ensure review_id is populated (needed by DeptLeadModerationPanel to load values_ratings)
UPDATE moderation_cases
SET review_id = 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9'
WHERE source_id = 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9'
  AND source_type = 'competency_assessment'
  AND (review_id IS NULL OR review_id != 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9');
