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
  IF old_job_family_id IS NULL AND old_department IS NULL THEN
    RETURN 'new_hire';
  END IF;
  
  IF old_job_family_id IS NULL THEN
    RETURN 'new_hire';
  END IF;
  
  IF old_department IS DISTINCT FROM new_department THEN
    RETURN 'department_transfer';
  END IF;
  
  IF old_job_family_id IS DISTINCT FROM new_job_family_id THEN
    RETURN 'role_change';
  END IF;
  
  RETURN 'details_update';
END;
$$;