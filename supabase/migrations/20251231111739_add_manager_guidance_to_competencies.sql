/*
  # Add Manager Guidance Field to Competencies
  
  ## Changes
  1. Add manager_guidance field to competencies table
     - This field helps managers understand how to use and assess each competency
     - Provides context on what to look for when evaluating employees
  
  ## Purpose
  - Helps managers better understand competency expectations
  - Provides guidance on how to assess competency levels
  - Improves consistency in competency evaluation during reviews
*/

-- Add manager_guidance column to competencies table
ALTER TABLE competencies 
ADD COLUMN IF NOT EXISTS manager_guidance text;

-- Add helpful comment
COMMENT ON COLUMN competencies.manager_guidance IS 'Guidance for managers on how to use and assess this competency during reviews and development planning';
