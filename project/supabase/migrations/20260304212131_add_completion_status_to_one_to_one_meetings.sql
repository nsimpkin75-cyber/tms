/*
  # Add Completion Status Tracking to One-to-One Meetings

  1. Changes
    - Add `completion_status` column to track the status of one-to-one meetings
    - Add `submitted_at` column to track when the review was completed
    - These fields enable better tracking of review progress and completion
  
  2. Status Values
    - 'scheduled': Meeting is scheduled but not started
    - 'in_progress': Manager has started the review
    - 'completed': Review has been submitted
    - 'cancelled': Meeting was cancelled
*/

-- Add completion_status column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'one_to_one_scheduled_meetings' 
    AND column_name = 'completion_status'
  ) THEN
    ALTER TABLE one_to_one_scheduled_meetings 
      ADD COLUMN completion_status text DEFAULT 'scheduled';
  END IF;
END $$;

-- Add submitted_at column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'one_to_one_scheduled_meetings' 
    AND column_name = 'submitted_at'
  ) THEN
    ALTER TABLE one_to_one_scheduled_meetings 
      ADD COLUMN submitted_at timestamptz;
  END IF;
END $$;

-- Add index for faster queries on completion_status
CREATE INDEX IF NOT EXISTS idx_one_to_one_meetings_completion_status 
  ON one_to_one_scheduled_meetings(completion_status);

-- Add index for faster queries on submitted_at
CREATE INDEX IF NOT EXISTS idx_one_to_one_meetings_submitted_at 
  ON one_to_one_scheduled_meetings(submitted_at);
