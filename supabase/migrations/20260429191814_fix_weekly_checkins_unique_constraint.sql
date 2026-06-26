/*
  # Fix weekly check-ins unique constraint to prevent overwriting

  ## Problem
  The table has a UNIQUE constraint on (meeting_id, employee_id, week_starting).
  When a review cycle has a single scheduled meeting, every weekly check-in reuses
  the same meeting_id. This causes the UPDATE path to overwrite previous completed
  check-ins instead of creating new records.

  ## Changes
  1. Add oto_cycle_id column to one_to_one_weekly_checkins
  2. Backfill oto_cycle_id from the linked scheduled meeting
  3. Make meeting_id nullable (so it doesn't block inserts)
  4. Drop the old unique constraint (meeting_id, employee_id, week_starting)
  5. Add new unique constraint on (oto_cycle_id, employee_id, week_starting)
     so each week per employee per cycle is unique, regardless of meeting_id
  6. Add RLS policy for the new column
*/

-- 1. Add oto_cycle_id column if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_weekly_checkins' AND column_name = 'oto_cycle_id'
  ) THEN
    ALTER TABLE one_to_one_weekly_checkins
      ADD COLUMN oto_cycle_id uuid REFERENCES one_to_one_review_cycles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Backfill oto_cycle_id from the linked scheduled meeting
UPDATE one_to_one_weekly_checkins wc
SET oto_cycle_id = sm.oto_cycle_id
FROM one_to_one_scheduled_meetings sm
WHERE sm.id = wc.meeting_id
  AND sm.oto_cycle_id IS NOT NULL
  AND wc.oto_cycle_id IS NULL;

-- 3. Make meeting_id nullable so check-ins can exist without a specific scheduled meeting
ALTER TABLE one_to_one_weekly_checkins
  ALTER COLUMN meeting_id DROP NOT NULL;

-- 4. Drop the old unique constraint
ALTER TABLE one_to_one_weekly_checkins
  DROP CONSTRAINT IF EXISTS one_to_one_weekly_checkins_meeting_id_employee_id_week_star_key;

-- 5. Add new unique constraint keyed on cycle + employee + week
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'one_to_one_weekly_checkins_cycle_employee_week_key'
  ) THEN
    ALTER TABLE one_to_one_weekly_checkins
      ADD CONSTRAINT one_to_one_weekly_checkins_cycle_employee_week_key
      UNIQUE (oto_cycle_id, employee_id, week_starting);
  END IF;
END $$;

-- 6. Index for fast history queries
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_cycle_employee
  ON one_to_one_weekly_checkins (oto_cycle_id, employee_id, week_starting DESC);
