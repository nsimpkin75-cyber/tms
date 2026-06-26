/*
  # Allow Ad-hoc One-to-One Meetings Without Cycles

  1. Changes
    - Modify `one_to_one_scheduled_meetings.cycle_id` to allow NULL values
    - This enables managers to conduct ad-hoc one-to-one reviews without requiring a scheduled cycle
    - Scheduled reviews will still have a cycle_id, while ad-hoc reviews will have NULL
  
  2. Notes
    - Ad-hoc meetings are created when a manager clicks "Start Review" without a cycle
    - This provides flexibility for managers to conduct reviews as needed
*/

-- Allow cycle_id to be NULL for ad-hoc meetings
ALTER TABLE one_to_one_scheduled_meetings 
  ALTER COLUMN cycle_id DROP NOT NULL;
