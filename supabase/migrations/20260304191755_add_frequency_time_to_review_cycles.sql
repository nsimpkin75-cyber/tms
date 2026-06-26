/*
  # Add Frequency and Time Settings to One-to-One Review Cycles

  1. Changes
    - Add `review_frequency` column (weekly, biweekly, monthly)
    - Add `preferred_time` column (time of day for meetings)
    - Add `preferred_day` column (day of week for meetings)
    - Add `duration_minutes` column (default meeting length)

  2. Notes
    - These settings help managers establish regular cadence for one-to-ones
    - Preferred time and day are suggestions for scheduling
*/

-- Add frequency and timing columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'review_frequency'
  ) THEN
    ALTER TABLE one_to_one_review_cycles 
    ADD COLUMN review_frequency text DEFAULT 'weekly' CHECK (review_frequency IN ('weekly', 'biweekly', 'monthly'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'preferred_time'
  ) THEN
    ALTER TABLE one_to_one_review_cycles 
    ADD COLUMN preferred_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'preferred_day'
  ) THEN
    ALTER TABLE one_to_one_review_cycles 
    ADD COLUMN preferred_day text CHECK (preferred_day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE one_to_one_review_cycles 
    ADD COLUMN duration_minutes integer DEFAULT 30;
  END IF;
END $$;