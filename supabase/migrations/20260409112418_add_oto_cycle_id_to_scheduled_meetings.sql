/*
  # Add oto_cycle_id to one_to_one_scheduled_meetings

  ## Summary
  The existing `cycle_id` column references the general `review_cycles` table.
  We need a separate column to link scheduled meetings to `one_to_one_review_cycles`.

  ## Changes
  - Add `oto_cycle_id` (uuid, nullable) to `one_to_one_scheduled_meetings` with FK to `one_to_one_review_cycles`
  - Drop the existing unique constraint `(cycle_id, employee_id)` which was preventing multiple meetings per employee
  - Add a new unique constraint on `(oto_cycle_id, employee_id)` so each employee only has one scheduled meeting per one-to-one cycle
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_scheduled_meetings' AND column_name = 'oto_cycle_id'
  ) THEN
    ALTER TABLE one_to_one_scheduled_meetings
      ADD COLUMN oto_cycle_id uuid REFERENCES one_to_one_review_cycles(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE one_to_one_scheduled_meetings
  DROP CONSTRAINT IF EXISTS one_to_one_scheduled_meetings_cycle_id_employee_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'one_to_one_scheduled_meetings_oto_cycle_employee_key'
  ) THEN
    ALTER TABLE one_to_one_scheduled_meetings
      ADD CONSTRAINT one_to_one_scheduled_meetings_oto_cycle_employee_key
      UNIQUE (oto_cycle_id, employee_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_one_to_one_meetings_oto_cycle_id
  ON one_to_one_scheduled_meetings(oto_cycle_id);
