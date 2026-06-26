/*
  # Remove Unused Indexes - Part 2

  1. Changes
    - Continue removing unused indexes
    
  2. Security
    - No security impact, only performance optimization
*/

-- Remove more unused indexes
DROP INDEX IF EXISTS idx_review_responses_question_id;
DROP INDEX IF EXISTS idx_review_six_month_approved_by;
DROP INDEX IF EXISTS idx_review_weekly_checkins_manager_id;
DROP INDEX IF EXISTS idx_skill_assessments_assessed_by;
DROP INDEX IF EXISTS idx_skill_development_plans_skill_id;
DROP INDEX IF EXISTS idx_skills_matrix_job_family_id;
DROP INDEX IF EXISTS idx_strategic_goals_owner_id;
DROP INDEX IF EXISTS idx_user_admin_permissions_granted_by;
DROP INDEX IF EXISTS idx_view_as_sessions_target_user_id;
DROP INDEX IF EXISTS idx_skills_master_type;
DROP INDEX IF EXISTS idx_skills_master_category;
DROP INDEX IF EXISTS idx_matrices_created_by;
DROP INDEX IF EXISTS idx_matrix_skills_matrix;
DROP INDEX IF EXISTS idx_matrix_skills_skill;
DROP INDEX IF EXISTS idx_matrix_assignments_matrix;
DROP INDEX IF EXISTS idx_matrix_assignments_employee;
DROP INDEX IF EXISTS idx_skill_ratings_matrix;
DROP INDEX IF EXISTS idx_skill_ratings_employee;
DROP INDEX IF EXISTS idx_skill_ratings_skill;
DROP INDEX IF EXISTS idx_skill_ratings_rated_by;