/*
  # Add Missing Foreign Key Indexes - Security Fix

  1. Purpose
    - Add indexes to all foreign key columns that are missing covering indexes
    - Improves query performance and prevents suboptimal execution plans
    - Addresses security advisor warnings about unindexed foreign keys

  2. Changes
    - Creates indexes on 100+ foreign key columns across the database
    - All indexes use IF NOT EXISTS to prevent errors on re-run
    - Indexes follow naming convention: idx_tablename_columnname_fkey
*/

-- assessment_approvals
CREATE INDEX IF NOT EXISTS idx_assessment_approvals_approved_by_fkey ON assessment_approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_assessment_approvals_skill_id_fkey ON assessment_approvals(skill_id);

-- assessment_notifications
CREATE INDEX IF NOT EXISTS idx_assessment_notifications_workflow_id_fkey ON assessment_notifications(workflow_id);

-- career_external_qualifications
CREATE INDEX IF NOT EXISTS idx_career_external_qualifications_quiz_session_id_fkey ON career_external_qualifications(quiz_session_id);

-- career_plans
CREATE INDEX IF NOT EXISTS idx_career_plans_user_id_fkey ON career_plans(user_id);

-- career_quiz_sessions
CREATE INDEX IF NOT EXISTS idx_career_quiz_sessions_goal_role_id_fkey ON career_quiz_sessions(goal_role_id);

-- career_skill_self_ratings
CREATE INDEX IF NOT EXISTS idx_career_skill_self_ratings_skill_id_fkey ON career_skill_self_ratings(skill_id);
CREATE INDEX IF NOT EXISTS idx_career_skill_self_ratings_user_id_fkey ON career_skill_self_ratings(user_id);

-- department_skills_matrix
CREATE INDEX IF NOT EXISTS idx_department_skills_matrix_created_by_fkey ON department_skills_matrix(created_by);
CREATE INDEX IF NOT EXISTS idx_department_skills_matrix_job_family_id_fkey ON department_skills_matrix(job_family_id);
CREATE INDEX IF NOT EXISTS idx_department_skills_matrix_skill_type_id_fkey ON department_skills_matrix(skill_type_id);

-- department_strategies
CREATE INDEX IF NOT EXISTS idx_department_strategies_creator_id_fkey ON department_strategies(creator_id);
CREATE INDEX IF NOT EXISTS idx_department_strategies_focus_area_id_fkey ON department_strategies(focus_area_id);

-- department_strategy_approvals
CREATE INDEX IF NOT EXISTS idx_department_strategy_approvals_dept_strategy_id_fkey ON department_strategy_approvals(department_strategy_id);

-- department_strategy_kpis
CREATE INDEX IF NOT EXISTS idx_department_strategy_kpis_dept_strategy_id_fkey ON department_strategy_kpis(department_strategy_id);

-- employee_skill_assessments
CREATE INDEX IF NOT EXISTS idx_employee_skill_assessments_skill_id_fkey ON employee_skill_assessments(skill_id);

-- employee_skills_assessment_responses
CREATE INDEX IF NOT EXISTS idx_employee_skills_assessment_responses_matrix_id_fkey ON employee_skills_assessment_responses(matrix_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_assessment_responses_skill_id_fkey ON employee_skills_assessment_responses(skill_id);

-- executive_strategies
CREATE INDEX IF NOT EXISTS idx_executive_strategies_creator_id_fkey ON executive_strategies(creator_id);

-- goal_milestones
CREATE INDEX IF NOT EXISTS idx_goal_milestones_assigned_to_id_fkey ON goal_milestones(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id_fkey ON goal_milestones(goal_id);

-- half_year_review_summaries
CREATE INDEX IF NOT EXISTS idx_half_year_review_summaries_meeting_id_fkey ON half_year_review_summaries(meeting_id);

-- job_families
CREATE INDEX IF NOT EXISTS idx_job_families_job_title_id_fkey ON job_families(job_title_id);

-- job_titles
CREATE INDEX IF NOT EXISTS idx_job_titles_department_id_fkey ON job_titles(department_id);

-- manager_skill_assessments
CREATE INDEX IF NOT EXISTS idx_manager_skill_assessments_skill_id_fkey ON manager_skill_assessments(skill_id);

-- manager_skills_assessment_responses
CREATE INDEX IF NOT EXISTS idx_manager_skills_assessment_responses_employee_id_fkey ON manager_skills_assessment_responses(employee_id);
CREATE INDEX IF NOT EXISTS idx_manager_skills_assessment_responses_matrix_id_fkey ON manager_skills_assessment_responses(matrix_id);
CREATE INDEX IF NOT EXISTS idx_manager_skills_assessment_responses_skill_id_fkey ON manager_skills_assessment_responses(skill_id);

-- one_to_one_actions
CREATE INDEX IF NOT EXISTS idx_one_to_one_actions_action_owner_fkey ON one_to_one_actions(action_owner);
CREATE INDEX IF NOT EXISTS idx_one_to_one_actions_manager_id_fkey ON one_to_one_actions(manager_id);

-- one_to_one_competency_ratings
CREATE INDEX IF NOT EXISTS idx_one_to_one_competency_ratings_competency_id_fkey ON one_to_one_competency_ratings(competency_id);

-- one_to_one_half_year_reviews
CREATE INDEX IF NOT EXISTS idx_one_to_one_half_year_reviews_manager_id_fkey ON one_to_one_half_year_reviews(manager_id);

-- one_to_one_moderation_queue
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_comp_rating_id_fkey ON one_to_one_moderation_queue(competency_rating_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_employee_id_fkey ON one_to_one_moderation_queue(employee_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_manager_id_fkey ON one_to_one_moderation_queue(manager_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_monthly_review_id_fkey ON one_to_one_moderation_queue(monthly_review_id);

-- one_to_one_monthly_reviews
CREATE INDEX IF NOT EXISTS idx_one_to_one_monthly_reviews_manager_id_fkey ON one_to_one_monthly_reviews(manager_id);

-- one_to_one_review_cycles
CREATE INDEX IF NOT EXISTS idx_one_to_one_review_cycles_manager_id_fkey ON one_to_one_review_cycles(manager_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_review_cycles_strategic_goal_id_fkey ON one_to_one_review_cycles(strategic_goal_id);

-- one_to_one_self_assessments
CREATE INDEX IF NOT EXISTS idx_one_to_one_self_assessments_half_year_review_id_fkey ON one_to_one_self_assessments(half_year_review_id);

-- one_to_one_skill_discussions
CREATE INDEX IF NOT EXISTS idx_one_to_one_skill_discussions_discrepancy_id_fkey ON one_to_one_skill_discussions(discrepancy_id);

-- one_to_one_weekly_checkins
CREATE INDEX IF NOT EXISTS idx_one_to_one_weekly_checkins_manager_id_fkey ON one_to_one_weekly_checkins(manager_id);

-- performance_ratings
CREATE INDEX IF NOT EXISTS idx_performance_ratings_review_meeting_id_fkey ON performance_ratings(review_meeting_id);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_job_title_id_fkey ON profiles(job_title_id);

-- review_competency_assessments
CREATE INDEX IF NOT EXISTS idx_review_competency_assessments_competency_id_fkey ON review_competency_assessments(competency_id);

-- review_competency_ratings
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_competency_id_fkey ON review_competency_ratings(competency_id);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_employee_id_fkey ON review_competency_ratings(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_review_id_fkey ON review_competency_ratings(review_id);

-- review_cycles
CREATE INDEX IF NOT EXISTS idx_review_cycles_strategy_id_fkey ON review_cycles(strategy_id);

-- review_goal_progress
CREATE INDEX IF NOT EXISTS idx_review_goal_progress_employee_id_fkey ON review_goal_progress(employee_id);

-- review_half_year_assessments
CREATE INDEX IF NOT EXISTS idx_review_half_year_assessments_employee_id_fkey ON review_half_year_assessments(employee_id);

-- review_instances
CREATE INDEX IF NOT EXISTS idx_review_instances_employee_id_fkey ON review_instances(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_instances_manager_id_fkey ON review_instances(manager_id);

-- review_kpi_templates
CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_created_by_fkey ON review_kpi_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_job_family_id_fkey ON review_kpi_templates(job_family_id);

-- review_kpis
CREATE INDEX IF NOT EXISTS idx_review_kpis_created_by_fkey ON review_kpis(created_by);
CREATE INDEX IF NOT EXISTS idx_review_kpis_employee_id_fkey ON review_kpis(employee_id);

-- review_meetings
CREATE INDEX IF NOT EXISTS idx_review_meetings_employee_id_fkey ON review_meetings(employee_id);

-- review_monthly_competency_scores
CREATE INDEX IF NOT EXISTS idx_review_monthly_competency_scores_employee_id_fkey ON review_monthly_competency_scores(employee_id);

-- review_monthly_sessions
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_employee_id_fkey ON review_monthly_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_manager_id_fkey ON review_monthly_sessions(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_review_template_id_fkey ON review_monthly_sessions(review_template_id);

-- review_notifications
CREATE INDEX IF NOT EXISTS idx_review_notifications_recipient_id_fkey ON review_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_review_notifications_sender_id_fkey ON review_notifications(sender_id);

-- review_rating_approvals
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_approver_id_fkey ON review_rating_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_comp_rating_id_fkey ON review_rating_approvals(competency_rating_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_employee_id_fkey ON review_rating_approvals(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_manager_id_fkey ON review_rating_approvals(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_review_id_fkey ON review_rating_approvals(review_id);

-- review_six_month_performance
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_approved_by_fkey ON review_six_month_performance(approved_by);
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_employee_id_fkey ON review_six_month_performance(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_manager_id_fkey ON review_six_month_performance(manager_id);

-- review_template_kpis
CREATE INDEX IF NOT EXISTS idx_review_template_kpis_template_id_fkey ON review_template_kpis(template_id);

-- review_templates
CREATE INDEX IF NOT EXISTS idx_review_templates_dept_strategy_id_fkey ON review_templates(department_strategy_id);

-- review_weekly_checkins
CREATE INDEX IF NOT EXISTS idx_review_weekly_checkins_employee_id_fkey ON review_weekly_checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_weekly_checkins_manager_id_fkey ON review_weekly_checkins(manager_id);

-- review_weekly_kpi_ratings
CREATE INDEX IF NOT EXISTS idx_review_weekly_kpi_ratings_employee_id_fkey ON review_weekly_kpi_ratings(employee_id);

-- review_weekly_summaries
CREATE INDEX IF NOT EXISTS idx_review_weekly_summaries_employee_id_fkey ON review_weekly_summaries(employee_id);

-- role_skills
CREATE INDEX IF NOT EXISTS idx_role_skills_skill_type_id_fkey ON role_skills(skill_type_id);

-- skill_assessment_cycles
CREATE INDEX IF NOT EXISTS idx_skill_assessment_cycles_created_by_fkey ON skill_assessment_cycles(created_by);

-- skill_assessment_discrepancies
CREATE INDEX IF NOT EXISTS idx_skill_assessment_discrepancies_meeting_id_fkey ON skill_assessment_discrepancies(discussed_in_meeting_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessment_discrepancies_skill_id_fkey ON skill_assessment_discrepancies(skill_id);

-- skill_development_actions
CREATE INDEX IF NOT EXISTS idx_skill_development_actions_created_by_fkey ON skill_development_actions(created_by);
CREATE INDEX IF NOT EXISTS idx_skill_development_actions_discussion_id_fkey ON skill_development_actions(discussion_id);

-- skills_assessment_workflow
CREATE INDEX IF NOT EXISTS idx_skills_assessment_workflow_approved_by_fkey ON skills_assessment_workflow(approved_by);

-- standalone_strategy_actions
CREATE INDEX IF NOT EXISTS idx_standalone_strategy_actions_assigned_to_fkey ON standalone_strategy_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_standalone_strategy_actions_strategy_id_fkey ON standalone_strategy_actions(standalone_strategy_id);

-- strategic_goals
CREATE INDEX IF NOT EXISTS idx_strategic_goals_department_id_fkey ON strategic_goals(department_id);

-- strategies (uses parent_strategy_id not parent)
CREATE INDEX IF NOT EXISTS idx_strategies_creator_id_fkey ON strategies(creator_id);
CREATE INDEX IF NOT EXISTS idx_strategies_parent_strategy_id_fkey ON strategies(parent_strategy_id);

-- strategy_actions
CREATE INDEX IF NOT EXISTS idx_strategy_actions_assigned_to_fkey ON strategy_actions(assigned_to);

-- strategy_approvals
CREATE INDEX IF NOT EXISTS idx_strategy_approvals_approver_id_fkey ON strategy_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_strategy_approvals_dept_strategy_id_fkey ON strategy_approvals(department_strategy_id);

-- strategy_focus_areas_v2
CREATE INDEX IF NOT EXISTS idx_strategy_focus_areas_v2_strategy_id_fkey ON strategy_focus_areas_v2(strategy_id);

-- strategy_kpis
CREATE INDEX IF NOT EXISTS idx_strategy_kpis_assigned_to_user_id_fkey ON strategy_kpis(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_kpis_dept_strategy_id_fkey ON strategy_kpis(department_strategy_id);

-- strategy_lead_assignments
CREATE INDEX IF NOT EXISTS idx_strategy_lead_assignments_strategy_lead_id_fkey ON strategy_lead_assignments(strategy_lead_id);

-- strategy_leads
CREATE INDEX IF NOT EXISTS idx_strategy_leads_user_id_fkey ON strategy_leads(user_id);

-- strategy_notifications
CREATE INDEX IF NOT EXISTS idx_strategy_notifications_user_id_fkey ON strategy_notifications(user_id);

-- training_module_links
CREATE INDEX IF NOT EXISTS idx_training_module_links_job_family_id_fkey ON training_module_links(job_family_id);

-- training_module_pages
CREATE INDEX IF NOT EXISTS idx_training_module_pages_course_id_fkey ON training_module_pages(course_id);

-- user_admin_permissions
CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_granted_by_fkey ON user_admin_permissions(granted_by);

-- weekly_performance_scores
CREATE INDEX IF NOT EXISTS idx_weekly_performance_scores_meeting_id_fkey ON weekly_performance_scores(meeting_id);