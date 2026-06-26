/*
  # Remove Unused Indexes - Part 1

  1. Changes
    - Remove indexes that are not being used
    - This reduces storage and maintenance overhead
    
  2. Security
    - No security impact, only performance optimization
*/

-- Remove unused indexes from various tables
DROP INDEX IF EXISTS idx_career_plans_target_job_family;
DROP INDEX IF EXISTS idx_goal_actions_assigned_to;
DROP INDEX IF EXISTS idx_one_to_one_notes_created_by;
DROP INDEX IF EXISTS idx_performance_ratings_rater_id;
DROP INDEX IF EXISTS idx_profile_skills_skill_id;
DROP INDEX IF EXISTS idx_rating_approval_workflow_approver_id;
DROP INDEX IF EXISTS idx_review_competency_ratings_employee_id;
DROP INDEX IF EXISTS idx_review_goal_progress_employee_id;
DROP INDEX IF EXISTS idx_review_items_review_id;
DROP INDEX IF EXISTS idx_review_kpi_templates_created_by;
DROP INDEX IF EXISTS idx_review_kpi_templates_job_family_id;
DROP INDEX IF EXISTS idx_review_kpis_created_by;
DROP INDEX IF EXISTS idx_review_monthly_sessions_manager_id;
DROP INDEX IF EXISTS idx_review_notifications_sender_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_approver_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_competency_rating_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_employee_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_manager_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_review_id;