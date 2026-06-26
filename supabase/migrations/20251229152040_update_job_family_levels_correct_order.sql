/*
  # Update Job Family Levels with Data Migration (Correct Order)

  1. Changes
    - Remove old level constraint FIRST
    - Update existing data to new level format
    - Add new level constraint with expanded options
    - New levels include:
      - IC1, IC2, IC3 (Individual Contributor)
      - Technical IC1-IC5 (Technical Individual Contributor)
      - Manager M1-M5 (Management levels)
      - Leader (Leadership)
      - Executive (Executive level)
  
  2. Data Migration
    - Entry -> IC1
    - Mid -> IC2
    - Senior -> IC3
    - Lead -> Manager M1
    - Principal -> Manager M2
  
  3. Notes
    - Constraint is dropped first to allow data updates
    - Existing data will be migrated to the new format
    - The new constraint ensures only valid levels can be used
*/

-- FIRST: Drop the old constraint
ALTER TABLE job_families 
DROP CONSTRAINT IF EXISTS job_families_level_check;

-- SECOND: Update existing data to match new level format
UPDATE job_families SET level = 'IC1' WHERE level = 'Entry';
UPDATE job_families SET level = 'IC2' WHERE level = 'Mid';
UPDATE job_families SET level = 'IC3' WHERE level = 'Senior';
UPDATE job_families SET level = 'Manager M1' WHERE level = 'Lead';
UPDATE job_families SET level = 'Manager M2' WHERE level = 'Principal';

-- THIRD: Add the new constraint with all level options
ALTER TABLE job_families 
ADD CONSTRAINT job_families_level_check 
CHECK (level = ANY (ARRAY[
  'IC1'::text, 
  'IC2'::text, 
  'IC3'::text,
  'Technical IC1'::text,
  'Technical IC2'::text,
  'Technical IC3'::text,
  'Technical IC4'::text,
  'Technical IC5'::text,
  'Manager M1'::text,
  'Manager M2'::text,
  'Manager M3'::text,
  'Manager M4'::text,
  'Manager M5'::text,
  'Leader'::text,
  'Executive'::text
]));