/*
  # Fix determine_job_change_type to Use Correct Change Types
  
  1. Problem
    - Function returns 'new_hire' and 'department_transfer'
    - CHECK constraint only allows: initial, role_change, department_change, promotion, lateral_move, demotion
  
  2. Solution
    - Update function to return valid change types
    - Map 'new_hire' -> 'initial'
    - Map 'department_transfer' -> 'department_change'
  
  3. Changes
    - Update function to use correct enum values
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
  -- If both old values are NULL, this is initial assignment
  IF old_job_family_id IS NULL AND old_department IS NULL THEN
    RETURN 'initial';
  END IF;
  
  -- If old job_family is NULL but old_department exists, still initial
  IF old_job_family_id IS NULL THEN
    RETURN 'initial';
  END IF;
  
  -- Department change (handle NULLs with IS DISTINCT FROM)
  IF old_department IS DISTINCT FROM new_department THEN
    RETURN 'department_change';
  END IF;
  
  -- Job family change
  IF old_job_family_id IS DISTINCT FROM new_job_family_id THEN
    RETURN 'role_change';
  END IF;
  
  -- No significant change - use lateral_move as default
  RETURN 'lateral_move';
END;
$$;
