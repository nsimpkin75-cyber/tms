/*
  # Fix FK cascades to preserve completed review history

  1. Changes
    - `one_to_one_scheduled_meetings.cycle_id` FK: CASCADE → SET NULL
      (deleting a review_cycle now nullifies the cycle_id on meetings, not deletes meetings)
    - `one_to_one_monthly_reviews.meeting_id` FK: CASCADE → SET NULL
      (deleting a meeting now nullifies the meeting_id on reviews, not deletes the review)

  2. Why
    - Review history and ratings must survive cycle/meeting deletion for dashboard reporting
*/

ALTER TABLE one_to_one_scheduled_meetings
  DROP CONSTRAINT IF EXISTS one_to_one_scheduled_meetings_cycle_id_fkey;

ALTER TABLE one_to_one_scheduled_meetings
  ADD CONSTRAINT one_to_one_scheduled_meetings_cycle_id_fkey
  FOREIGN KEY (cycle_id) REFERENCES review_cycles(id) ON DELETE SET NULL;

ALTER TABLE one_to_one_monthly_reviews
  DROP CONSTRAINT IF EXISTS one_to_one_monthly_reviews_meeting_id_fkey;

ALTER TABLE one_to_one_monthly_reviews
  ADD CONSTRAINT one_to_one_monthly_reviews_meeting_id_fkey
  FOREIGN KEY (meeting_id) REFERENCES one_to_one_scheduled_meetings(id) ON DELETE SET NULL;
