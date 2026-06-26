/*
  # Fix Kayleigh Lacasse moderation data

  ## Summary
  1. Extend moderation_status constraint to include 'adjusted'
  2. Correct dl_rating values of 4 → 3 in moderation_cases dept_lead_decisions
     (competency ratings must only use 1, 3, 5)
  3. Apply final moderated ratings to the review's values_ratings
  4. Set moderation_status = 'adjusted' on the review (was stuck as 'pending')
  5. Recalculate overall_competency_score: final ratings 3+5+3+3+3+3 = 20/6 = 3.33

  ## No data is deleted. Manager comments, KPI data, and review history are preserved.
*/

-- Extend the moderation_status check constraint to include 'adjusted'
ALTER TABLE one_to_one_monthly_reviews
  DROP CONSTRAINT IF EXISTS one_to_one_monthly_reviews_moderation_status_check;

ALTER TABLE one_to_one_monthly_reviews
  ADD CONSTRAINT one_to_one_monthly_reviews_moderation_status_check
  CHECK (moderation_status = ANY (ARRAY['pending','approved','adjusted','rejected']));

-- Fix moderation_cases: change any dl_rating of 4 to 3
UPDATE moderation_cases
SET dept_lead_decisions = (
  SELECT jsonb_agg(
    CASE
      WHEN (decision->>'dl_rating')::int = 4
        THEN jsonb_set(decision, '{dl_rating}', '3'::jsonb)
      ELSE decision
    END
  )
  FROM jsonb_array_elements(dept_lead_decisions) AS decision
)
WHERE id = '31c53da5-090b-43c3-9d90-605d556c7806';

-- Fix the review: apply final moderated ratings, update moderation_status and competency score
UPDATE one_to_one_monthly_reviews
SET
  moderation_status = 'adjusted',
  values_ratings = (
    SELECT jsonb_agg(
      CASE
        WHEN (vr->>'competency_id') = 'ddb2bed0-47c8-4414-b50b-8a5e28b324b8'
          THEN jsonb_set(jsonb_set(vr, '{manager_rating}', '3'::jsonb), '{moderated_rating}', '3'::jsonb)
        WHEN (vr->>'competency_id') = '2e99ff39-3314-4aad-bff9-c5ca754a3a14'
          THEN jsonb_set(jsonb_set(vr, '{manager_rating}', '5'::jsonb), '{moderated_rating}', '5'::jsonb)
        WHEN (vr->>'competency_id') = '27bfdc67-6b26-474f-92af-748d4ec84511'
          THEN jsonb_set(jsonb_set(vr, '{manager_rating}', '3'::jsonb), '{moderated_rating}', '3'::jsonb)
        WHEN (vr->>'competency_id') = 'd46b17bf-b210-447b-9e05-0d46711e0fdb'
          THEN jsonb_set(jsonb_set(vr, '{manager_rating}', '3'::jsonb), '{moderated_rating}', '3'::jsonb)
        WHEN (vr->>'competency_id') = 'e6e9b753-2208-4ce4-8ad7-551e0a93d84e'
          THEN jsonb_set(jsonb_set(vr, '{manager_rating}', '3'::jsonb), '{moderated_rating}', '3'::jsonb)
        WHEN (vr->>'competency_id') = '5d3a0671-b0b8-40fc-b014-38b376607d07'
          THEN jsonb_set(jsonb_set(vr, '{manager_rating}', '3'::jsonb), '{moderated_rating}', '3'::jsonb)
        ELSE vr
      END
    )
    FROM jsonb_array_elements(values_ratings) AS vr
  ),
  overall_competency_score = 3.33
WHERE id = 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9';
