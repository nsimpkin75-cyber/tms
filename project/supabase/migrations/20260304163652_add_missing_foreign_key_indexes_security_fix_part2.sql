/*
  # Add Missing Foreign Key Indexes - Part 2 (Security Fix)

  1. Missing Indexes Added
    - review_rating_approvals.approver_id
    - review_rating_approvals.competency_rating_id
    - review_rating_approvals.employee_id
    - review_rating_approvals.manager_id
    - review_rating_approvals.review_id
    - review_responses.question_id
    - review_six_month_performance.approved_by
    - review_weekly_checkins.manager_id
    - skill_assessments.assessed_by
    - skill_development_plans.skill_id
    - skills_matrix.job_family_id
    - strategic_goals.owner_id
    - user_admin_permissions.granted_by
    - view_as_sessions.target_user_id

  2. Security Impact
    - Improves query performance for foreign key lookups
    - Prevents slow scans when joining tables
    - Critical for maintaining database performance at scale
*/

CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_approver_id 
  ON review_rating_approvals(approver_id);

CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_competency_rating_id 
  ON review_rating_approvals(competency_rating_id);

CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_employee_id 
  ON review_rating_approvals(employee_id);

CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_manager_id 
  ON review_rating_approvals(manager_id);

CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_review_id 
  ON review_rating_approvals(review_id);

CREATE INDEX IF NOT EXISTS idx_review_responses_question_id 
  ON review_responses(question_id);

CREATE INDEX IF NOT EXISTS idx_review_six_month_approved_by 
  ON review_six_month_performance(approved_by);

CREATE INDEX IF NOT EXISTS idx_review_weekly_checkins_manager_id 
  ON review_weekly_checkins(manager_id);

CREATE INDEX IF NOT EXISTS idx_skill_assessments_assessed_by 
  ON skill_assessments(assessed_by);

CREATE INDEX IF NOT EXISTS idx_skill_development_plans_skill_id 
  ON skill_development_plans(skill_id);

CREATE INDEX IF NOT EXISTS idx_skills_matrix_job_family_id 
  ON skills_matrix(job_family_id);

CREATE INDEX IF NOT EXISTS idx_strategic_goals_owner_id 
  ON strategic_goals(owner_id);

CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_granted_by 
  ON user_admin_permissions(granted_by);

CREATE INDEX IF NOT EXISTS idx_view_as_sessions_target_user_id 
  ON view_as_sessions(target_user_id);