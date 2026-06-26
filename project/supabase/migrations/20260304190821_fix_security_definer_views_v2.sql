/*
  # Fix Security Definer Views v2

  1. Changes
    - Recreate views without SECURITY DEFINER
    - Views should use the invoker's permissions by default
    
  2. Security
    - More secure as views use caller's permissions
*/

-- Recreate user_status_view without SECURITY DEFINER
DROP VIEW IF EXISTS user_status_view;

CREATE VIEW user_status_view AS
SELECT
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.active,
  p.department,
  p.job_title,
  p.manager_id,
  m.full_name as manager_name,
  p.created_at,
  p.last_active,
  CASE 
    WHEN p.active = false THEN 'Inactive'
    WHEN p.role = 'admin' THEN 'Admin'
    WHEN p.role = 'manager' THEN 'Manager'
    ELSE 'Employee'
  END as status_label
FROM profiles p
LEFT JOIN profiles m ON p.manager_id = m.id;

-- Recreate employee_skill_summary without SECURITY DEFINER
DROP VIEW IF EXISTS employee_skill_summary;

CREATE VIEW employee_skill_summary AS
SELECT
  sa.profile_id as employee_id,
  sm.id as skill_id,
  sm.name as skill_name,
  COALESCE(st.name, 'General') as skill_type,
  '📊' as skill_type_icon,
  sa.target_level,
  false as is_mandatory,
  (SELECT rating_value FROM skill_ratings WHERE employee_id = sa.profile_id AND skill_id = sm.id AND rated_by = sa.profile_id ORDER BY rated_at DESC LIMIT 1) as latest_self_rating,
  (SELECT rating_value FROM skill_ratings WHERE employee_id = sa.profile_id AND skill_id = sm.id AND rated_by != sa.profile_id ORDER BY rated_at DESC LIMIT 1) as latest_manager_rating,
  sa.current_level as current_rating,
  sa.assessment_date as last_assessed_at,
  'active' as cycle_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM skill_assessment_discrepancies sad 
      WHERE sad.employee_id = sa.profile_id 
      AND sad.skill_id = sm.id 
      AND sad.flagged_for_discussion = true 
      AND sad.resolved_at IS NULL
    ) THEN true 
    ELSE false 
  END as has_discrepancy,
  (SELECT ai_analysis FROM skill_assessment_discrepancies WHERE employee_id = sa.profile_id AND skill_id = sm.id ORDER BY created_at DESC LIMIT 1) as discrepancy_analysis
FROM skill_assessments sa
JOIN skills_master sm ON sa.skill_id = sm.id
LEFT JOIN skill_types st ON sm.skill_type_id = st.id;