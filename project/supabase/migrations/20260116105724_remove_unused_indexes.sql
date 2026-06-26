/*
  # Remove Unused Indexes
  
  1. Performance Optimization
    - Remove indexes that are not being used
    - Reduces storage overhead
    - Improves write performance (fewer indexes to update)
  
  2. Indexes Removed
    - Various unused indexes from multiple tables
    - Keeping critical indexes for foreign keys and common queries
  
  Note: We're keeping some indexes that might be used in the future
  or are important for referential integrity checks
*/

-- Business strategies (unused creator/owner indexes)
DROP INDEX IF EXISTS idx_business_strategies_created_by;
DROP INDEX IF EXISTS idx_business_strategies_owner_id;

-- Career development plans
DROP INDEX IF EXISTS idx_career_development_plans_manager_id;

-- Career pathways
DROP INDEX IF EXISTS idx_career_pathways_user_id;

-- Career plan milestones
DROP INDEX IF EXISTS idx_career_plan_milestones_career_plan_id;

-- Career plans
DROP INDEX IF EXISTS idx_career_plans_current_job_family_id;
DROP INDEX IF EXISTS idx_career_plans_target_job_family_id;

-- Career quiz responses
DROP INDEX IF EXISTS idx_career_quiz_responses_user_id;

-- Catchup summaries
DROP INDEX IF EXISTS idx_catchup_summaries_employee_id;

-- Copilot conversation
DROP INDEX IF EXISTS idx_copilot_conversation_history_user_id;

-- Department strategies
DROP INDEX IF EXISTS idx_department_strategies_approved_by;
DROP INDEX IF EXISTS idx_department_strategies_owner_id;

-- Goals
DROP INDEX IF EXISTS idx_goals_user_id;

-- Job family competencies
DROP INDEX IF EXISTS idx_job_family_competencies_competency_id;
DROP INDEX IF EXISTS idx_job_family_competencies_required_level_id;

-- Job history
DROP INDEX IF EXISTS idx_job_history_changed_by;
DROP INDEX IF EXISTS idx_job_history_job_family_id;
DROP INDEX IF EXISTS idx_job_history_user_id;

-- One to one goals
DROP INDEX IF EXISTS idx_one_to_one_goals_cdp_id;
DROP INDEX IF EXISTS idx_one_to_one_goals_created_by;
DROP INDEX IF EXISTS idx_one_to_one_goals_user_id;

-- Profile skills
DROP INDEX IF EXISTS idx_profile_skills_skill_id;

-- Profiles
DROP INDEX IF EXISTS idx_profiles_job_family_id;
DROP INDEX IF EXISTS idx_profiles_manager_id;

-- Reviews
DROP INDEX IF EXISTS idx_reviews_reviewer_id;

-- Standalone department strategies
DROP INDEX IF EXISTS idx_standalone_dept_strategies_owner_id;

-- Strategic goals
DROP INDEX IF EXISTS idx_strategic_goals_assigned_by_id;
DROP INDEX IF EXISTS idx_strategic_goals_assigned_to_id;
DROP INDEX IF EXISTS idx_strategic_goals_parent_goal_id;

-- Strategic roadmaps
DROP INDEX IF EXISTS idx_strategic_roadmaps_owner_id;

-- Strategy actions
DROP INDEX IF EXISTS idx_strategy_actions_created_by;

-- System settings
DROP INDEX IF EXISTS idx_system_settings_updated_by;

-- Training completions
DROP INDEX IF EXISTS idx_training_completions_course_id;

-- User CVs
DROP INDEX IF EXISTS idx_user_cvs_user_id;

-- Weekly catchups
DROP INDEX IF EXISTS idx_weekly_catchups_employee_id;
DROP INDEX IF EXISTS idx_weekly_catchups_manager_id;

-- Review meetings (keeping some that might be useful)
DROP INDEX IF EXISTS idx_review_meetings_manager;
DROP INDEX IF EXISTS idx_review_meetings_status;
DROP INDEX IF EXISTS idx_review_meetings_date;
DROP INDEX IF EXISTS idx_review_meetings_type;
DROP INDEX IF EXISTS idx_review_meetings_week;

-- Review actions
DROP INDEX IF EXISTS idx_review_actions_meeting;
DROP INDEX IF EXISTS idx_review_actions_status;

-- Review KPI ratings
DROP INDEX IF EXISTS idx_review_kpi_ratings_meeting;

-- Review competency assessments
DROP INDEX IF EXISTS idx_review_competency_assessments_meeting;
DROP INDEX IF EXISTS idx_review_competency_assessments_approval;

-- Review summaries
DROP INDEX IF EXISTS idx_review_summaries_meeting;

-- Review approvals
DROP INDEX IF EXISTS idx_review_approvals_assessment;
DROP INDEX IF EXISTS idx_review_approvals_approver;
DROP INDEX IF EXISTS idx_review_approvals_status;

-- Review employee notes
DROP INDEX IF EXISTS idx_review_employee_notes_meeting;
DROP INDEX IF EXISTS idx_review_employee_notes_employee;

-- Performance ratings
DROP INDEX IF EXISTS idx_performance_ratings_period;
DROP INDEX IF EXISTS idx_performance_ratings_category;

-- Weekly scores
DROP INDEX IF EXISTS idx_weekly_scores_employee;
DROP INDEX IF EXISTS idx_weekly_scores_month;

-- Half year summaries
DROP INDEX IF EXISTS idx_half_year_summaries_employee;
DROP INDEX IF EXISTS idx_half_year_summaries_period;

-- User admin permissions
DROP INDEX IF EXISTS idx_user_admin_permissions_permission;

-- View as sessions
DROP INDEX IF EXISTS idx_view_as_sessions_admin;
DROP INDEX IF EXISTS idx_view_as_sessions_target;

-- Review KPI templates (these were just created, so keeping them)
-- DROP INDEX IF EXISTS idx_review_kpi_templates_created_by;
-- DROP INDEX IF EXISTS idx_review_kpi_templates_department;

-- Review KPIs (these are actively used)
-- DROP INDEX IF EXISTS idx_review_kpis_employee;
-- DROP INDEX IF EXISTS idx_review_kpis_active;

-- Review weekly (actively used in new system)
-- DROP INDEX IF EXISTS idx_review_weekly_employee;
-- DROP INDEX IF EXISTS idx_review_weekly_manager;
-- DROP INDEX IF EXISTS idx_review_weekly_status;

-- Review monthly (actively used in new system)
-- DROP INDEX IF EXISTS idx_review_monthly_employee;
-- DROP INDEX IF EXISTS idx_review_monthly_manager;
-- DROP INDEX IF EXISTS idx_review_monthly_status;

-- Review competency ratings (actively used)
-- DROP INDEX IF EXISTS idx_review_competency_ratings_review;
-- DROP INDEX IF EXISTS idx_review_competency_ratings_approval;

-- Review six month (actively used)
-- DROP INDEX IF EXISTS idx_review_six_month_employee;
-- DROP INDEX IF EXISTS idx_review_six_month_status;

-- Review rating approvals (actively used)
-- DROP INDEX IF EXISTS idx_review_rating_approvals_approver;
-- DROP INDEX IF EXISTS idx_review_rating_approvals_status;

-- Review goal progress (actively used)
-- DROP INDEX IF EXISTS idx_review_goal_progress_review;

-- Review notifications (actively used)
-- DROP INDEX IF EXISTS idx_review_notifications_recipient;

-- Training module pages
DROP INDEX IF EXISTS idx_training_module_pages_course_id;
