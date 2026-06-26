/*
  # Add Missing Foreign Key Indexes - Security Fix
  
  1. Purpose
    - Add indexes for all foreign keys that don't have covering indexes
    - This improves query performance and prevents suboptimal execution plans
  
  2. Changes
    - Create indexes for all unindexed foreign keys identified by security scan
*/

-- Business Strategies
CREATE INDEX IF NOT EXISTS idx_business_strategies_created_by ON business_strategies(created_by);
CREATE INDEX IF NOT EXISTS idx_business_strategies_owner_id ON business_strategies(owner_id);

-- Career Development Plans
CREATE INDEX IF NOT EXISTS idx_career_development_plans_manager_id ON career_development_plans(manager_id);

-- Career Pathways
CREATE INDEX IF NOT EXISTS idx_career_pathways_user_id ON career_pathways(user_id);

-- Career Plan Milestones
CREATE INDEX IF NOT EXISTS idx_career_plan_milestones_career_plan_id ON career_plan_milestones(career_plan_id);

-- Career Plans
CREATE INDEX IF NOT EXISTS idx_career_plans_current_job_family_id ON career_plans(current_job_family_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_target_job_family_id ON career_plans(target_job_family_id);

-- Career Quiz Responses
CREATE INDEX IF NOT EXISTS idx_career_quiz_responses_user_id ON career_quiz_responses(user_id);

-- Catchup Summaries
CREATE INDEX IF NOT EXISTS idx_catchup_summaries_employee_id ON catchup_summaries(employee_id);

-- Copilot Conversation History
CREATE INDEX IF NOT EXISTS idx_copilot_conversation_history_user_id ON copilot_conversation_history(user_id);

-- Department Strategy Actions
CREATE INDEX IF NOT EXISTS idx_department_strategy_actions_assigned_to ON department_strategy_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_department_strategy_actions_dept_strategy_id ON department_strategy_actions(department_strategy_id);

-- Department Strategy Approvals
CREATE INDEX IF NOT EXISTS idx_department_strategy_approvals_approver_id ON department_strategy_approvals(approver_id);

-- Goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- Job Family Competencies
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_competency_id ON job_family_competencies(competency_id);
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_required_level_id ON job_family_competencies(required_level_id);

-- Job History
CREATE INDEX IF NOT EXISTS idx_job_history_changed_by ON job_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_job_history_job_family_id ON job_history(job_family_id);
CREATE INDEX IF NOT EXISTS idx_job_history_user_id ON job_history(user_id);

-- One to One Goals
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_cdp_id ON one_to_one_goals(cdp_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_created_by ON one_to_one_goals(created_by);
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_user_id ON one_to_one_goals(user_id);

-- Profile Skills
CREATE INDEX IF NOT EXISTS idx_profile_skills_skill_id ON profile_skills(skill_id);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_job_family_id ON profiles(job_family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON profiles(manager_id);

-- Review Actions
CREATE INDEX IF NOT EXISTS idx_review_actions_meeting_id ON review_actions(meeting_id);

-- Review Approvals
CREATE INDEX IF NOT EXISTS idx_review_approvals_approver_id ON review_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_review_approvals_competency_assessment_id ON review_approvals(competency_assessment_id);

-- Review Competency Assessments
CREATE INDEX IF NOT EXISTS idx_review_competency_assessments_meeting_id ON review_competency_assessments(meeting_id);

-- Review Competency Ratings
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_recorded_by ON review_competency_ratings(recorded_by);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_review_instance_id ON review_competency_ratings(review_instance_id);

-- Review Cycles
CREATE INDEX IF NOT EXISTS idx_review_cycles_focus_area_id ON review_cycles(focus_area_id);

-- Review Employee Actions
CREATE INDEX IF NOT EXISTS idx_review_employee_actions_action_owner ON review_employee_actions(action_owner);
CREATE INDEX IF NOT EXISTS idx_review_employee_actions_cycle_id ON review_employee_actions(cycle_id);

-- Review Employee Notes
CREATE INDEX IF NOT EXISTS idx_review_employee_notes_employee_id ON review_employee_notes(employee_id);

-- Review Half Year Assessments
CREATE INDEX IF NOT EXISTS idx_review_half_year_assessments_manager_id ON review_half_year_assessments(manager_id);

-- Review Instances
CREATE INDEX IF NOT EXISTS idx_review_instances_template_id ON review_instances(template_id);

-- Review KPI Ratings
CREATE INDEX IF NOT EXISTS idx_review_kpi_ratings_meeting_id ON review_kpi_ratings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_review_kpi_ratings_recorded_by ON review_kpi_ratings(recorded_by);
CREATE INDEX IF NOT EXISTS idx_review_kpi_ratings_review_instance_id ON review_kpi_ratings(review_instance_id);
CREATE INDEX IF NOT EXISTS idx_review_kpi_ratings_template_kpi_id ON review_kpi_ratings(template_kpi_id);

-- Review Meetings
CREATE INDEX IF NOT EXISTS idx_review_meetings_manager_id ON review_meetings(manager_id);

-- Review Monthly Averages
CREATE INDEX IF NOT EXISTS idx_review_monthly_averages_manager_id ON review_monthly_averages(manager_id);

-- Review Monthly Competency Scores
CREATE INDEX IF NOT EXISTS idx_review_monthly_competency_scores_competency_id ON review_monthly_competency_scores(competency_id);
CREATE INDEX IF NOT EXISTS idx_review_monthly_competency_scores_manager_id ON review_monthly_competency_scores(manager_id);

-- Review Schedules
CREATE INDEX IF NOT EXISTS idx_review_schedules_cycle_id ON review_schedules(cycle_id);
CREATE INDEX IF NOT EXISTS idx_review_schedules_manager_id ON review_schedules(manager_id);

-- Review Summaries
CREATE INDEX IF NOT EXISTS idx_review_summaries_review_instance_id ON review_summaries(review_instance_id);

-- Review Templates
CREATE INDEX IF NOT EXISTS idx_review_templates_creator_id ON review_templates(creator_id);
CREATE INDEX IF NOT EXISTS idx_review_templates_department_id ON review_templates(department_id);

-- Review Weekly KPI Ratings
CREATE INDEX IF NOT EXISTS idx_review_weekly_kpi_ratings_kpi_id ON review_weekly_kpi_ratings(kpi_id);
CREATE INDEX IF NOT EXISTS idx_review_weekly_kpi_ratings_manager_id ON review_weekly_kpi_ratings(manager_id);

-- Review Weekly Summaries
CREATE INDEX IF NOT EXISTS idx_review_weekly_summaries_manager_id ON review_weekly_summaries(manager_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);

-- Standalone Department Strategies
CREATE INDEX IF NOT EXISTS idx_standalone_department_strategies_owner_id ON standalone_department_strategies(owner_id);

-- Strategic Goals
CREATE INDEX IF NOT EXISTS idx_strategic_goals_assigned_by_id ON strategic_goals(assigned_by_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_assigned_to_id ON strategic_goals(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_parent_goal_id ON strategic_goals(parent_goal_id);

-- Strategic Roadmaps
CREATE INDEX IF NOT EXISTS idx_strategic_roadmaps_owner_id ON strategic_roadmaps(owner_id);

-- Strategy Actions
CREATE INDEX IF NOT EXISTS idx_strategy_actions_created_by ON strategy_actions(created_by);

-- Strategy KPIs
CREATE INDEX IF NOT EXISTS idx_strategy_kpis_focus_area_id ON strategy_kpis(focus_area_id);

-- Strategy Lead Assignments
CREATE INDEX IF NOT EXISTS idx_strategy_lead_assignments_assigned_by ON strategy_lead_assignments(assigned_by);

-- Strategy Leads
CREATE INDEX IF NOT EXISTS idx_strategy_leads_assigned_by ON strategy_leads(assigned_by);

-- Strategy Notifications
CREATE INDEX IF NOT EXISTS idx_strategy_notifications_dept_strategy_id ON strategy_notifications(department_strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_notifications_strategy_id ON strategy_notifications(strategy_id);

-- System Settings
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON system_settings(updated_by);

-- Training Completions
CREATE INDEX IF NOT EXISTS idx_training_completions_course_id ON training_completions(course_id);

-- User Admin Permissions
CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_permission_name ON user_admin_permissions(permission_name);

-- User CVs
CREATE INDEX IF NOT EXISTS idx_user_cvs_user_id ON user_cvs(user_id);

-- View As Sessions
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_target_user_id ON view_as_sessions(target_user_id);

-- Weekly Catchups
CREATE INDEX IF NOT EXISTS idx_weekly_catchups_employee_id ON weekly_catchups(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_catchups_manager_id ON weekly_catchups(manager_id);
