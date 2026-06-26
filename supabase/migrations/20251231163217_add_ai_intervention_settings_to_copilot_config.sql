/*
  # Add AI Intervention Settings to Copilot Config

  1. New Columns Added to copilot_config
    - enable_review_summaries (boolean) - AI-generated review summaries
    - enable_competency_suggestions (boolean) - AI suggested competency ratings
    - enable_coaching_feedback (boolean) - AI coaching and feedback
    - enable_career_recommendations (boolean) - AI career path recommendations
    - enable_kpi_analysis (boolean) - AI KPI performance analysis
    - enable_skill_gap_analysis (boolean) - AI skill gap identification
    - enable_development_plans (boolean) - AI development plan suggestions
    - enable_interview_feedback (boolean) - AI interview feedback generation
    
  2. Purpose
    - Allow admins to enable/disable specific AI interventions
    - Control which AI features are active in the system
    - Provide granular control over AI functionality
*/

-- Add AI intervention toggle columns
ALTER TABLE copilot_config
  ADD COLUMN IF NOT EXISTS enable_review_summaries boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_competency_suggestions boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_coaching_feedback boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_career_recommendations boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_kpi_analysis boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_skill_gap_analysis boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_development_plans boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_interview_feedback boolean DEFAULT false;

-- Set all existing configs to have AI features enabled by default
UPDATE copilot_config
SET 
  enable_review_summaries = true,
  enable_competency_suggestions = true,
  enable_coaching_feedback = true,
  enable_career_recommendations = true,
  enable_kpi_analysis = true,
  enable_skill_gap_analysis = true,
  enable_development_plans = true,
  enable_interview_feedback = false
WHERE enable_review_summaries IS NULL;
