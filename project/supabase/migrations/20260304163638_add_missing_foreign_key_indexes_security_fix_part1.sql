/*
  # Add Missing Foreign Key Indexes - Part 1 (Security Fix)

  1. Missing Indexes Added
    - career_plans.target_job_family_id
    - goal_actions.assigned_to
    - one_to_one_notes.created_by
    - performance_ratings.rater_id
    - profile_skills.skill_id
    - rating_approval_workflow.approver_id
    - review_competency_ratings.employee_id
    - review_goal_progress.employee_id
    - review_items.review_id
    - review_kpi_templates.created_by
    - review_kpi_templates.job_family_id
    - review_kpis.created_by
    - review_monthly_sessions.manager_id
    - review_notifications.sender_id

  2. Security Impact
    - Improves query performance for foreign key lookups
    - Prevents slow scans when joining tables
    - Critical for maintaining database performance at scale
*/

CREATE INDEX IF NOT EXISTS idx_career_plans_target_job_family 
  ON career_plans(target_job_family_id);

CREATE INDEX IF NOT EXISTS idx_goal_actions_assigned_to 
  ON goal_actions(assigned_to);

CREATE INDEX IF NOT EXISTS idx_one_to_one_notes_created_by 
  ON one_to_one_notes(created_by);

CREATE INDEX IF NOT EXISTS idx_performance_ratings_rater_id 
  ON performance_ratings(rater_id);

CREATE INDEX IF NOT EXISTS idx_profile_skills_skill_id 
  ON profile_skills(skill_id);

CREATE INDEX IF NOT EXISTS idx_rating_approval_workflow_approver_id 
  ON rating_approval_workflow(approver_id);

CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_employee_id 
  ON review_competency_ratings(employee_id);

CREATE INDEX IF NOT EXISTS idx_review_goal_progress_employee_id 
  ON review_goal_progress(employee_id);

CREATE INDEX IF NOT EXISTS idx_review_items_review_id 
  ON review_items(review_id);

CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_created_by 
  ON review_kpi_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_job_family_id 
  ON review_kpi_templates(job_family_id);

CREATE INDEX IF NOT EXISTS idx_review_kpis_created_by 
  ON review_kpis(created_by);

CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_manager_id 
  ON review_monthly_sessions(manager_id);

CREATE INDEX IF NOT EXISTS idx_review_notifications_sender_id 
  ON review_notifications(sender_id);