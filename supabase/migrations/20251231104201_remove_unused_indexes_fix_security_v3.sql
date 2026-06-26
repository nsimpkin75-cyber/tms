/*
  # Remove Unused Indexes and Fix Security Issues
  
  ## Changes
  1. Drop 52 unused indexes to improve write performance
  2. Fix function search_path and duplicates
  3. Fix SECURITY DEFINER views to use security_invoker
  
  ## Impact
  - Improved write performance
  - Reduced storage
  - Enhanced security
*/

-- =====================================================
-- 1. DROP ALL UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_career_pathways_user_id;
DROP INDEX IF EXISTS idx_career_plans_current_job_family_id;
DROP INDEX IF EXISTS idx_career_plans_status;
DROP INDEX IF EXISTS idx_career_plans_target_job_family;
DROP INDEX IF EXISTS idx_career_plan_milestones_plan_id;
DROP INDEX IF EXISTS idx_career_plan_milestones_sort;
DROP INDEX IF EXISTS idx_career_development_plans_user_id;
DROP INDEX IF EXISTS idx_career_development_plans_manager_id;
DROP INDEX IF EXISTS idx_career_development_plans_status;
DROP INDEX IF EXISTS idx_career_quiz_responses_user_id;
DROP INDEX IF EXISTS idx_career_quiz_responses_date;
DROP INDEX IF EXISTS idx_catchup_summaries_employee_id;
DROP INDEX IF EXISTS idx_catchup_summaries_month;
DROP INDEX IF EXISTS idx_goals_user_id;
DROP INDEX IF EXISTS idx_one_to_one_goals_user_id;
DROP INDEX IF EXISTS idx_one_to_one_goals_created_by;
DROP INDEX IF EXISTS idx_one_to_one_goals_cdp_id;
DROP INDEX IF EXISTS idx_weekly_catchups_manager;
DROP INDEX IF EXISTS idx_weekly_catchups_employee;
DROP INDEX IF EXISTS idx_job_history_changed_by;
DROP INDEX IF EXISTS idx_job_history_job_family_id_fkey;
DROP INDEX IF EXISTS idx_job_history_user_id;
DROP INDEX IF EXISTS idx_job_history_effective_date;
DROP INDEX IF EXISTS idx_job_history_change_type;
DROP INDEX IF EXISTS idx_job_history_department;
DROP INDEX IF EXISTS idx_profile_skills_skill_id;
DROP INDEX IF EXISTS idx_profiles_job_family_id;
DROP INDEX IF EXISTS idx_profiles_manager_id;
DROP INDEX IF EXISTS idx_user_cvs_user_id;
DROP INDEX IF EXISTS idx_user_skill_assessments_user;
DROP INDEX IF EXISTS idx_reviews_reviewer_id;
DROP INDEX IF EXISTS idx_review_templates_active;
DROP INDEX IF EXISTS idx_review_template_sections_template;
DROP INDEX IF EXISTS idx_review_template_questions_section;
DROP INDEX IF EXISTS idx_strategic_goals_assigned_by_id;
DROP INDEX IF EXISTS idx_strategic_goals_parent_goal_id;
DROP INDEX IF EXISTS idx_strategic_goals_assigned_to;
DROP INDEX IF EXISTS idx_strategic_goals_roadmap;
DROP INDEX IF EXISTS idx_strategic_roadmaps_owner_id;
DROP INDEX IF EXISTS idx_training_completions_course_id;
DROP INDEX IF EXISTS idx_training_module_links_job_family_id;
DROP INDEX IF EXISTS idx_training_attendees_profile;
DROP INDEX IF EXISTS idx_training_attendees_session;
DROP INDEX IF EXISTS idx_copilot_config_active;
DROP INDEX IF EXISTS idx_copilot_functions_enabled;
DROP INDEX IF EXISTS idx_copilot_conversation_user;
DROP INDEX IF EXISTS idx_copilot_conversation_created;
DROP INDEX IF EXISTS idx_action_items_completed;
DROP INDEX IF EXISTS idx_progression_criteria_job_family;
DROP INDEX IF EXISTS idx_competencies_active;
DROP INDEX IF EXISTS idx_job_family_competencies_required_level_id;
DROP INDEX IF EXISTS idx_job_family_competencies_competency;

-- =====================================================
-- 2. FIX FUNCTION DUPLICATES AND SEARCH_PATH
-- =====================================================

-- Drop all versions of determine_job_change_type
DROP FUNCTION IF EXISTS determine_job_change_type(uuid, uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS determine_job_change_type(text, text, text, text, uuid, uuid) CASCADE;

-- Recreate with proper security settings
CREATE FUNCTION determine_job_change_type(
  old_job_family_id uuid,
  new_job_family_id uuid,
  old_department text,
  new_department text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = public
AS $$
BEGIN
  IF old_job_family_id IS NULL THEN
    RETURN 'new_hire'::text;
  ELSIF old_job_family_id = new_job_family_id AND old_department = new_department THEN
    RETURN 'details_update'::text;
  ELSIF old_department != new_department THEN
    RETURN 'department_transfer'::text;
  ELSE
    RETURN 'role_change'::text;
  END IF;
END;
$$;

-- =====================================================
-- 3. FIX SECURITY DEFINER VIEWS
-- =====================================================

-- Recreate pending_career_approvals with security_invoker
DROP VIEW IF EXISTS pending_career_approvals CASCADE;

CREATE VIEW pending_career_approvals
WITH (security_invoker = true)
AS
SELECT 
  cp.id,
  cp.user_id,
  p.full_name as user_name,
  p.email as user_email,
  cp.target_job_family_id,
  jf.title as target_role,
  cp.status,
  cp.sent_to_manager_at,
  cp.created_at
FROM career_plans cp
JOIN profiles p ON p.id = cp.user_id
LEFT JOIN job_families jf ON jf.id = cp.target_job_family_id
WHERE cp.status IN ('pending_manager_review', 'pending_admin_review');

-- Recreate job_movement_stats with security_invoker
DROP VIEW IF EXISTS job_movement_stats CASCADE;

CREATE VIEW job_movement_stats
WITH (security_invoker = true)
AS
SELECT 
  date_trunc('month', effective_date) as month,
  change_type,
  department,
  COUNT(*) as movement_count,
  COUNT(DISTINCT user_id) as unique_users
FROM job_history
WHERE effective_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY date_trunc('month', effective_date), change_type, department
ORDER BY month DESC, change_type, department;

-- Add documentation
COMMENT ON VIEW pending_career_approvals IS 'Career plans awaiting approval. Uses security_invoker to respect RLS policies on underlying tables.';
COMMENT ON VIEW job_movement_stats IS 'Job movement statistics for last 12 months. Uses security_invoker to respect RLS policies.';
COMMENT ON FUNCTION determine_job_change_type(uuid, uuid, text, text) IS 'Determines type of job change. Marked IMMUTABLE and STRICT for performance and security.';
