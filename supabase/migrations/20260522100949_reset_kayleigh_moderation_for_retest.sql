/*
  # Reset Kayleigh moderation case for retest

  Resets the moderation case and review to a clean state so that Liv (Department Lead)
  can action it from the beginning:
  - Clears dept_lead_decisions on the moderation case
  - Resets moderation case to pending / step 1
  - Resets review moderation_status to 'pending'
  - Deletes any existing moderation_case_decisions audit records for this case
  - Deletes any moderation notifications to the manager so they appear fresh after moderation
*/

DO $$
DECLARE
  v_case_id uuid := '31c53da5-090b-43c3-9d90-605d556c7806';
  v_review_id uuid := 'b311cfb4-fa7f-4a83-b554-88d1f535b0a9';
BEGIN
  -- Reset moderation case
  UPDATE moderation_cases
  SET
    dept_lead_decisions = '[]'::jsonb,
    status = 'pending',
    current_step = 1,
    final_rating = NULL,
    updated_at = now()
  WHERE id = v_case_id;

  -- Reset review moderation status (keep values_ratings as they are — all 5s)
  UPDATE one_to_one_monthly_reviews
  SET
    moderation_status = 'pending'
  WHERE id = v_review_id;

  -- Remove existing audit decisions for clean retest
  DELETE FROM moderation_case_decisions WHERE case_id = v_case_id;

  -- Remove any existing moderation notifications to the manager for this case
  -- so the manager receives fresh notifications after Liv completes moderation
  DELETE FROM review_notifications
  WHERE notification_type IN (
    'moderation_rating_adjusted',
    'moderation_final_rating_adjusted',
    'moderation_approved_dept_lead',
    'moderation_final_approved',
    'moderation_finalised'
  )
  AND (
    -- Kayleigh's manager is the recipient
    recipient_id = (SELECT manager_id FROM moderation_cases WHERE id = v_case_id)
    OR sender_id = (SELECT id FROM profiles WHERE full_name = 'Olivia Collingbourne' LIMIT 1)
  );
END $$;
