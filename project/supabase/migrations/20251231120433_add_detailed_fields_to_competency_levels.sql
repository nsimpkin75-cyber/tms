/*
  # Add Detailed Fields to Competency Levels

  1. Changes
    - Add `negative_statement` column to `competency_levels` table
      - Describes what the level looks like when demonstrated poorly
      - Complements the positive statement
    - Add `target_behaviour_detail` column to `competency_levels` table
      - Provides full detailed description of the target behaviour for this level
      - Gives comprehensive guidance on expectations
  
  2. Purpose
    - Provides both positive and negative examples for each level
    - Offers detailed behavioural descriptions to clarify expectations
    - Helps managers and employees understand what good and poor performance looks like
    - Improves clarity and consistency in competency assessment
*/

-- Add negative_statement column to competency_levels table
ALTER TABLE competency_levels 
ADD COLUMN IF NOT EXISTS negative_statement text;

-- Add target_behaviour_detail column to competency_levels table
ALTER TABLE competency_levels 
ADD COLUMN IF NOT EXISTS target_behaviour_detail text;

-- Add helpful comments
COMMENT ON COLUMN competency_levels.negative_statement IS 'Description of what this competency level looks like when demonstrated poorly or inadequately';
COMMENT ON COLUMN competency_levels.target_behaviour_detail IS 'Full detailed description of the target behaviour and expectations for this competency level';
