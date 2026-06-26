/*
  # Add Missing Foreign Key Indexes
  
  1. Performance Optimization
    - Add indexes on all unindexed foreign key columns
    - Improves JOIN performance and query optimization
    - Prevents table scans on foreign key lookups
  
  2. Tables Updated
    - department_strategies
    - goal_milestones
    - half_year_review_summaries
    - job_families
    - performance_ratings
    - profiles
    - review_competency_assessments
    - review_competency_ratings
    - review_goal_progress
    - review_kpi_templates
    - review_kpis
    - review_monthly_sessions
    - review_notifications
    - review_rating_approvals
    - review_six_month_performance
    - standalone_strategy_actions
    - strategy_actions
    - user_admin_permissions
    - weekly_performance_scores
*/

-- Department strategies
CREATE INDEX IF NOT EXISTS idx_department_strategies_business_strategy_id 
  ON department_strategies(business_strategy_id);

-- Goal milestones
CREATE INDEX IF NOT EXISTS idx_goal_milestones_assigned_to_id 
  ON goal_milestones(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id 
  ON goal_milestones(goal_id);

-- Half year review summaries
CREATE INDEX IF NOT EXISTS idx_half_year_review_summaries_meeting_id 
  ON half_year_review_summaries(meeting_id);

-- Job families
CREATE INDEX IF NOT EXISTS idx_job_families_job_title_id 
  ON job_families(job_title_id);

-- Performance ratings
CREATE INDEX IF NOT EXISTS idx_performance_ratings_review_meeting_id 
  ON performance_ratings(review_meeting_id);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_job_title_id 
  ON profiles(job_title_id);

-- Review competency assessments
CREATE INDEX IF NOT EXISTS idx_review_competency_assessments_competency_id 
  ON review_competency_assessments(competency_id);

-- Review competency ratings
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_competency_id 
  ON review_competency_ratings(competency_id);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_employee_id 
  ON review_competency_ratings(employee_id);

-- Review goal progress
CREATE INDEX IF NOT EXISTS idx_review_goal_progress_employee_id 
  ON review_goal_progress(employee_id);

-- Review KPI templates
CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_job_family_id 
  ON review_kpi_templates(job_family_id);

-- Review KPIs
CREATE INDEX IF NOT EXISTS idx_review_kpis_created_by 
  ON review_kpis(created_by);

-- Review monthly sessions
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_review_template_id 
  ON review_monthly_sessions(review_template_id);

-- Review notifications
CREATE INDEX IF NOT EXISTS idx_review_notifications_sender_id 
  ON review_notifications(sender_id);

-- Review rating approvals
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_competency_rating_id 
  ON review_rating_approvals(competency_rating_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_employee_id 
  ON review_rating_approvals(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_manager_id 
  ON review_rating_approvals(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_review_id 
  ON review_rating_approvals(review_id);

-- Review six month performance
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_approved_by 
  ON review_six_month_performance(approved_by);
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_manager_id 
  ON review_six_month_performance(manager_id);

-- Standalone strategy actions
CREATE INDEX IF NOT EXISTS idx_standalone_strategy_actions_assigned_to 
  ON standalone_strategy_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_standalone_strategy_actions_standalone_strategy_id 
  ON standalone_strategy_actions(standalone_strategy_id);

-- Strategy actions
CREATE INDEX IF NOT EXISTS idx_strategy_actions_assigned_to 
  ON strategy_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_strategy_actions_department_strategy_id 
  ON strategy_actions(department_strategy_id);

-- User admin permissions
CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_granted_by 
  ON user_admin_permissions(granted_by);

-- Weekly performance scores
CREATE INDEX IF NOT EXISTS idx_weekly_performance_scores_meeting_id 
  ON weekly_performance_scores(meeting_id);
