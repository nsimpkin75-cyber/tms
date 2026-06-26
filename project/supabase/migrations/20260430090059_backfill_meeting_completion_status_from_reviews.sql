/*
  # Backfill meeting completion_status from monthly review status

  ## Summary
  Existing monthly reviews that were submitted/completed have their status stored
  in one_to_one_monthly_reviews.status = 'completed', but the parent meeting record
  in one_to_one_scheduled_meetings.completion_status was never updated.

  The team status display reads from the meeting record, so these employees
  incorrectly show as "In Progress" instead of "Completed".

  ## Change
  For every scheduled meeting that has at least one associated monthly review
  with status = 'completed' or 'submitted', set:
    - completion_status = 'completed'
    - submitted_at = the review's updated_at (if submitted_at is currently null)

  ## Safety
  - Only updates meetings where completion_status is NOT already 'completed'/'submitted'
  - Does not touch review content, KPI scores, actions, comments, or summaries
  - Does not delete or duplicate any records
*/

UPDATE one_to_one_scheduled_meetings m
SET
  completion_status = 'completed',
  submitted_at = COALESCE(m.submitted_at, r.updated_at)
FROM (
  SELECT DISTINCT ON (meeting_id)
    meeting_id,
    updated_at
  FROM one_to_one_monthly_reviews
  WHERE status IN ('completed', 'submitted')
  ORDER BY meeting_id, updated_at DESC
) r
WHERE m.id = r.meeting_id
  AND m.completion_status NOT IN ('completed', 'submitted');
