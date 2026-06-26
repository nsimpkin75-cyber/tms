/*
  # Fix determine_job_change_type to Handle NULL Values
  
  1. Problem
    - Function is marked as STRICT, returning NULL when any input is NULL
    - New profiles often have NULL departments, causing trigger to fail
  
  2. Solution
    - Remove STRICT and handle NULL cases explicitly
    - Provide sensible defaults for different NULL scenarios
  
  3. Changes
    - Update function to not be STRICT
    - Add NULL handling logic
*/

CREATE OR REPLACE FUNCTION determine_job_change_type(
  old_job_family_id uuid, 
  new_job_family_id uuid, 
  old_department text, 
  new_department text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  -- If both old values are NULL, this is a new hire
  IF old_job_family_id IS NULL AND old_department IS NULL THEN
    RETURN 'new_hire';
  END IF;
  
  -- If old job_family is NULL but old_department exists, still new hire
  IF old_job_family_id IS NULL THEN
    RETURN 'new_hire';
  END IF;
  
  -- Department change (handle NULLs with IS DISTINCT FROM)
  IF old_department IS DISTINCT FROM new_department THEN
    RETURN 'department_transfer';
  END IF;
  
  -- Job family change
  IF old_job_family_id IS DISTINCT FROM new_job_family_id THEN
    RETURN 'role_change';
  END IF;
  
  -- No significant change
  RETURN 'details_update';
END;
$$;
