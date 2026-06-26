/*
  # Extend sm_training_records rating to 0-5 and add assessment backfill trigger

  ## Summary
  1. Removes the (0, 1) CHECK constraint on sm_training_records.rating
     and replaces it with (0–5) so completed assessments can write higher ratings.
     - 0 = no training recorded
     - 1 = training date added (Training Record)
     - 2–5 = assessment rating from completed assessment cycle
     Rating 1 (from training date) is NEVER overwritten downward by an assessment.
     Assessment ratings >= 2 always take precedence over the training flag.

  2. Adds trigger function `sync_assessment_rating_to_training_record`:
     When an sm_assessment_item is inserted or updated AND the parent assessment
     is 'completed', the function upserts an sm_training_records row for that
     employee/topic/matrix with the assessment rating.
     - Only fires when assessment status = 'completed'
     - Takes the MAX of existing rating and new rating (never downgrades)
     - Resolves matrix_id via sm_assessments → sm_assessment_cycles → sm_assessment_cycles.matrix_id

  3. Creates the trigger on sm_assessment_items.
*/

-- 1. Drop the old (0,1) check constraint and add a (0–5) one
DO $$
BEGIN
  -- Drop old constraint by searching for it
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name LIKE '%sm_training_records%rating%'
  ) THEN
    ALTER TABLE sm_training_records DROP CONSTRAINT IF EXISTS sm_training_records_rating_check;
  END IF;
END $$;

ALTER TABLE sm_training_records
  DROP CONSTRAINT IF EXISTS sm_training_records_rating_check;

ALTER TABLE sm_training_records
  ADD CONSTRAINT sm_training_records_rating_check
  CHECK (rating >= 0 AND rating <= 5);

-- 2. Trigger function: sync completed assessment item rating → sm_training_records
CREATE OR REPLACE FUNCTION public.sync_assessment_rating_to_training_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assessment    record;
  v_matrix_id     uuid;
  v_existing_rating smallint;
  v_new_rating    smallint;
BEGIN
  -- Only act when a rating is actually set
  IF NEW.rating IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look up the parent assessment
  SELECT a.employee_id, a.status, c.matrix_id
  INTO v_assessment
  FROM sm_assessments a
  JOIN sm_assessment_cycles c ON c.id = a.cycle_id
  WHERE a.id = NEW.assessment_id;

  -- Only sync for completed assessments
  IF v_assessment.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  v_matrix_id  := v_assessment.matrix_id;
  v_new_rating := NEW.rating::smallint;

  -- Get existing rating if any
  SELECT rating INTO v_existing_rating
  FROM sm_training_records
  WHERE employee_id = v_assessment.employee_id
    AND topic_id    = NEW.topic_id
    AND matrix_id   = v_matrix_id;

  -- Never downgrade: take the higher of existing and new
  IF v_existing_rating IS NOT NULL AND v_existing_rating > v_new_rating THEN
    RETURN NEW;
  END IF;

  INSERT INTO sm_training_records (employee_id, topic_id, matrix_id, rating, updated_at)
  VALUES (v_assessment.employee_id, NEW.topic_id, v_matrix_id, v_new_rating, now())
  ON CONFLICT (employee_id, topic_id, matrix_id)
  DO UPDATE SET
    rating     = GREATEST(sm_training_records.rating, EXCLUDED.rating),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- 3. Attach trigger
DROP TRIGGER IF EXISTS trg_sync_assessment_rating ON sm_assessment_items;

CREATE TRIGGER trg_sync_assessment_rating
  AFTER INSERT OR UPDATE OF rating ON sm_assessment_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_assessment_rating_to_training_record();
