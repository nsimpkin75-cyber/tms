/*
  # Create missing moderation case for Bryant Sami

  ## Summary
  Bryant Sami's review (id: 8f25ad18) has overall_competency_score = 4 and
  requires_moderation = true, but no moderation_cases row was ever created
  (the case creation was skipped at submission time due to a code path issue).

  This migration creates the missing pending moderation case so it appears
  in the Dept Lead (Olivia Collingbourne / Implementation) moderation queue.

  - Preserves all review data — no review rows are modified.
  - Does not create a duplicate if one already exists.
*/

INSERT INTO moderation_cases (
  workflow_id,
  review_id,
  source_type,
  source_id,
  employee_id,
  manager_id,
  original_rating,
  current_rating,
  manager_justification,
  ai_validation_status,
  manager_override,
  current_step,
  status
)
SELECT
  '1d07ee47-3b01-4bd7-91e2-54c065270141',  -- active workflow
  '8f25ad18-4b25-4808-b6bd-404904a098c4',  -- review id
  'competency_assessment',
  '8f25ad18-4b25-4808-b6bd-404904a098c4',
  'c1c41f2b-34e6-4adb-80dd-93e84f706560',  -- Bryant Sami
  'f96cfe0b-ba59-4553-9567-dca555b3ac2d',  -- Zachariah Taylor (manager)
  4,
  4,
  NULL,
  'pending',
  false,
  1,
  'pending'
WHERE NOT EXISTS (
  SELECT 1 FROM moderation_cases
  WHERE review_id = '8f25ad18-4b25-4808-b6bd-404904a098c4'
);
