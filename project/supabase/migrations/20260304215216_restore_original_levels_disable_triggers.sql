/*
  # Restore Original Job Family Level Values
  
  1. Changes
    - Drop the constraint first
    - Update existing data to use original level naming
    - Add new check constraint with original level values
  
  2. Level Mapping
    - Entry → IC1
    - Mid → IC2
    - Senior → IC3
    - Lead → Manager M1
    - Principal → Manager M2
*/

-- Drop the existing check constraint first
ALTER TABLE job_families 
DROP CONSTRAINT IF EXISTS job_families_level_check;

-- Update existing data to match the original level values
UPDATE job_families
SET level = CASE level
  WHEN 'Entry' THEN 'IC1'
  WHEN 'Mid' THEN 'IC2'
  WHEN 'Senior' THEN 'IC3'
  WHEN 'Lead' THEN 'Manager M1'
  WHEN 'Principal' THEN 'Manager M2'
  ELSE level
END;

-- Add the restored check constraint with original level values
ALTER TABLE job_families
ADD CONSTRAINT job_families_level_check 
CHECK (level = ANY (ARRAY[
  'IC1'::text, 'IC2'::text, 'IC3'::text,
  'Technical IC1'::text, 'Technical IC2'::text, 'Technical IC3'::text, 'Technical IC4'::text, 'Technical IC5'::text,
  'Manager M1'::text, 'Manager M2'::text, 'Manager M3'::text, 'Manager M4'::text, 'Manager M5'::text,
  'Leader'::text, 'Executive'::text
]));