/*
  # Fix Job History Trigger to Include Job Title
  
  1. Problem
    - job_history table requires job_title (NOT NULL)
    - track_job_changes trigger doesn't set job_title
    - Profile updates fail when department changes
  
  2. Solution
    - Update trigger to include job_title from profile
    - Make job_title and department nullable in job_history
  
  3. Changes
    - Alter job_history to allow NULL for job_title and department
    - Update trigger to set job_title
*/

-- Make job_title and department nullable since they might not always be set
ALTER TABLE job_history 
  ALTER COLUMN job_title DROP NOT NULL,
  ALTER COLUMN department DROP NOT NULL;

-- Update the track_job_changes function to include job_title
CREATE OR REPLACE FUNCTION track_job_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND (
    OLD.job_family_id IS DISTINCT FROM NEW.job_family_id OR
    OLD.department IS DISTINCT FROM NEW.department OR
    OLD.job_title IS DISTINCT FROM NEW.job_title
  )) THEN
    INSERT INTO job_history (
      user_id,
      job_title,
      job_family_id,
      department,
      effective_date,
      change_type,
      changed_by
    ) VALUES (
      NEW.id,
      NEW.job_title,
      NEW.job_family_id,
      NEW.department,
      NOW(),
      determine_job_change_type(
        OLD.job_family_id,
        NEW.job_family_id,
        OLD.department,
        NEW.department
      ),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;
