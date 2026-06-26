/*
  # Add Missing Foreign Key Indexes - Part 2

  1. Purpose
    - Add remaining indexes for foreign key columns to improve query performance
    - Continues addressing Supabase security advisor warnings

  2. Changes
    - Creates indexes for foreign key columns in multiple tables (second batch)
    - All indexes use IF NOT EXISTS to prevent errors on re-run
*/

-- manager_skill_assessments
CREATE INDEX IF NOT EXISTS idx_manager_skill_assessments_employee_id_fkey
  ON manager_skill_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_manager_skill_assessments_manager_id_fkey
  ON manager_skill_assessments(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_skill_assessments_skill_id_fkey
  ON manager_skill_assessments(skill_id);

-- manager_skills_assessment_responses
CREATE INDEX IF NOT EXISTS idx_manager_skills_assessment_responses_employee_id_fkey
  ON manager_skills_assessment_responses(employee_id);
CREATE INDEX IF NOT EXISTS idx_manager_skills_assessment_responses_manager_id_fkey
  ON manager_skills_assessment_responses(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_skills_assessment_responses_matrix_id
  ON manager_skills_assessment_responses(matrix_id);
CREATE INDEX IF NOT EXISTS idx_manager_skills_assessment_responses_skill_id_fkey
  ON manager_skills_assessment_responses(skill_id);

-- marti_career_coaching_logs
CREATE INDEX IF NOT EXISTS idx_marti_career_coaching_logs_quiz_session_id
  ON marti_career_coaching_logs(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_marti_career_coaching_logs_user_id
  ON marti_career_coaching_logs(user_id);

-- one_to_one_actions
CREATE INDEX IF NOT EXISTS idx_one_to_one_actions_employee_id_fkey
  ON one_to_one_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_actions_monthly_review_id
  ON one_to_one_actions(monthly_review_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_actions_weekly_checkin_id
  ON one_to_one_actions(weekly_checkin_id);

-- one_to_one_competency_ratings
CREATE INDEX IF NOT EXISTS idx_one_to_one_competency_ratings_monthly_review_id
  ON one_to_one_competency_ratings(monthly_review_id);

-- one_to_one_cycle_kpis
CREATE INDEX IF NOT EXISTS idx_one_to_one_cycle_kpis_cycle_id
  ON one_to_one_cycle_kpis(cycle_id);

-- one_to_one_goals
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_cdp_id
  ON one_to_one_goals(cdp_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_created_by
  ON one_to_one_goals(created_by);
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_user_id
  ON one_to_one_goals(user_id);

-- one_to_one_half_year_reviews
CREATE INDEX IF NOT EXISTS idx_one_to_one_half_year_reviews_employee_id
  ON one_to_one_half_year_reviews(employee_id);

-- one_to_one_moderation_queue
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_moderator_id
  ON one_to_one_moderation_queue(moderator_id);

-- one_to_one_monthly_reviews
CREATE INDEX IF NOT EXISTS idx_one_to_one_monthly_reviews_employee_id_fkey
  ON one_to_one_monthly_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_monthly_reviews_meeting_id
  ON one_to_one_monthly_reviews(meeting_id);

-- one_to_one_scheduled_meetings
CREATE INDEX IF NOT EXISTS idx_one_to_one_scheduled_meetings_cycle_id
  ON one_to_one_scheduled_meetings(cycle_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_scheduled_meetings_employee_id_fkey
  ON one_to_one_scheduled_meetings(employee_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_scheduled_meetings_manager_id_fkey
  ON one_to_one_scheduled_meetings(manager_id);

-- one_to_one_self_assessments
CREATE INDEX IF NOT EXISTS idx_one_to_one_self_assessments_employee_id
  ON one_to_one_self_assessments(employee_id);

-- one_to_one_skill_discussions
CREATE INDEX IF NOT EXISTS idx_one_to_one_skill_discussions_monthly_review_id
  ON one_to_one_skill_discussions(monthly_review_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_skill_discussions_skill_id
  ON one_to_one_skill_discussions(skill_id);

-- one_to_one_weekly_checkins
CREATE INDEX IF NOT EXISTS idx_one_to_one_weekly_checkins_employee_id_fkey
  ON one_to_one_weekly_checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_weekly_checkins_meeting_id
  ON one_to_one_weekly_checkins(meeting_id);

-- profile_skills
CREATE INDEX IF NOT EXISTS idx_profile_skills_skill_id
  ON profile_skills(skill_id);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_job_family_id
  ON profiles(job_family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id_fkey
  ON profiles(manager_id);

-- review_actions
CREATE INDEX IF NOT EXISTS idx_review_actions_meeting_id
  ON review_actions(meeting_id);

-- review_approvals
CREATE INDEX IF NOT EXISTS idx_review_approvals_approver_id
  ON review_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_review_approvals_competency_assessment_id
  ON review_approvals(competency_assessment_id);

-- review_competency_assessments
CREATE INDEX IF NOT EXISTS idx_review_competency_assessments_meeting_id
  ON review_competency_assessments(meeting_id);

-- review_competency_ratings
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_recorded_by
  ON review_competency_ratings(recorded_by);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_review_instance_id
  ON review_competency_ratings(review_instance_id);

-- review_cycle_actions
CREATE INDEX IF NOT EXISTS idx_review_cycle_actions_cycle_id
  ON review_cycle_actions(cycle_id);

-- review_cycle_kpis
CREATE INDEX IF NOT EXISTS idx_review_cycle_kpis_cycle_id
  ON review_cycle_kpis(cycle_id);

-- review_cycle_members
CREATE INDEX IF NOT EXISTS idx_review_cycle_members_employee_id
  ON review_cycle_members(employee_id);

-- review_cycles
CREATE INDEX IF NOT EXISTS idx_review_cycles_focus_area_id
  ON review_cycles(focus_area_id);
CREATE INDEX IF NOT EXISTS idx_review_cycles_manager_id
  ON review_cycles(manager_id);

-- review_employee_actions
CREATE INDEX IF NOT EXISTS idx_review_employee_actions_action_owner
  ON review_employee_actions(action_owner);
CREATE INDEX IF NOT EXISTS idx_review_employee_actions_employee_id
  ON review_employee_actions(employee_id);

-- review_employee_notes
CREATE INDEX IF NOT EXISTS idx_review_employee_notes_employee_id
  ON review_employee_notes(employee_id);

-- review_half_year_assessments
CREATE INDEX IF NOT EXISTS idx_review_half_year_assessments_manager_id
  ON review_half_year_assessments(manager_id);

-- review_instances
CREATE INDEX IF NOT EXISTS idx_review_instances_template_id
  ON review_instances(template_id);

-- review_kpi_ratings
CREATE INDEX IF NOT EXISTS idx_review_kpi_ratings_meeting_id
  ON review_kpi_ratings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_review_kpi_ratings_recorded_by
  ON review_kpi_ratings(recorded_by);
CREATE INDEX IF NOT EXISTS idx_review_kpi_ratings_review_instance_id
  ON review_kpi_ratings(review_instance_id);
CREATE INDEX IF NOT EXISTS idx_review_kpi_ratings_template_kpi_id
  ON review_kpi_ratings(template_kpi_id);

-- review_meetings
CREATE INDEX IF NOT EXISTS idx_review_meetings_manager_id
  ON review_meetings(manager_id);

-- review_monthly_averages
CREATE INDEX IF NOT EXISTS idx_review_monthly_averages_employee_id
  ON review_monthly_averages(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_monthly_averages_manager_id
  ON review_monthly_averages(manager_id);

-- review_monthly_competency_scores
CREATE INDEX IF NOT EXISTS idx_review_monthly_competency_scores_competency_id
  ON review_monthly_competency_scores(competency_id);
CREATE INDEX IF NOT EXISTS idx_review_monthly_competency_scores_manager_id
  ON review_monthly_competency_scores(manager_id);

-- review_schedules
CREATE INDEX IF NOT EXISTS idx_review_schedules_cycle_id
  ON review_schedules(cycle_id);
CREATE INDEX IF NOT EXISTS idx_review_schedules_employee_id
  ON review_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_schedules_manager_id
  ON review_schedules(manager_id);

-- review_summaries
CREATE INDEX IF NOT EXISTS idx_review_summaries_review_instance_id
  ON review_summaries(review_instance_id);

-- review_template_sections
CREATE INDEX IF NOT EXISTS idx_review_template_sections_template_id
  ON review_template_sections(template_id);

-- review_templates
CREATE INDEX IF NOT EXISTS idx_review_templates_creator_id
  ON review_templates(creator_id);
CREATE INDEX IF NOT EXISTS idx_review_templates_department_id
  ON review_templates(department_id);

-- review_weekly_kpi_ratings
CREATE INDEX IF NOT EXISTS idx_review_weekly_kpi_ratings_kpi_id
  ON review_weekly_kpi_ratings(kpi_id);
CREATE INDEX IF NOT EXISTS idx_review_weekly_kpi_ratings_manager_id
  ON review_weekly_kpi_ratings(manager_id);

-- review_weekly_summaries
CREATE INDEX IF NOT EXISTS idx_review_weekly_summaries_manager_id
  ON review_weekly_summaries(manager_id);

-- reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id
  ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id
  ON reviews(user_id);

-- role_skills
CREATE INDEX IF NOT EXISTS idx_role_skills_skill_id_fkey
  ON role_skills(skill_id);

-- skill_assessment_discrepancies
CREATE INDEX IF NOT EXISTS idx_skill_assessment_discrepancies_employee_id
  ON skill_assessment_discrepancies(employee_id);

-- skill_development_actions
CREATE INDEX IF NOT EXISTS idx_skill_development_actions_employee_id
  ON skill_development_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_development_actions_skill_id
  ON skill_development_actions(skill_id);

-- skills_assessment_workflow
CREATE INDEX IF NOT EXISTS idx_skills_assessment_workflow_employee_id_fkey
  ON skills_assessment_workflow(employee_id);
CREATE INDEX IF NOT EXISTS idx_skills_assessment_workflow_manager_id_fkey
  ON skills_assessment_workflow(manager_id);

-- standalone_department_strategies
CREATE INDEX IF NOT EXISTS idx_standalone_department_strategies_owner_id
  ON standalone_department_strategies(owner_id);

-- strategic_goals
CREATE INDEX IF NOT EXISTS idx_strategic_goals_assigned_by_id
  ON strategic_goals(assigned_by_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_assigned_to_id
  ON strategic_goals(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_parent_goal_id
  ON strategic_goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_roadmap_id
  ON strategic_goals(roadmap_id);

-- strategic_roadmaps
CREATE INDEX IF NOT EXISTS idx_strategic_roadmaps_owner_id
  ON strategic_roadmaps(owner_id);

-- strategy_actions
CREATE INDEX IF NOT EXISTS idx_strategy_actions_created_by
  ON strategy_actions(created_by);

-- strategy_focus_areas
CREATE INDEX IF NOT EXISTS idx_strategy_focus_areas_strategy_id
  ON strategy_focus_areas(strategy_id);

-- strategy_kpis
CREATE INDEX IF NOT EXISTS idx_strategy_kpis_focus_area_id
  ON strategy_kpis(focus_area_id);
CREATE INDEX IF NOT EXISTS idx_strategy_kpis_strategy_id
  ON strategy_kpis(strategy_id);

-- strategy_lead_assignments
CREATE INDEX IF NOT EXISTS idx_strategy_lead_assignments_assigned_by
  ON strategy_lead_assignments(assigned_by);

-- strategy_leads
CREATE INDEX IF NOT EXISTS idx_strategy_leads_assigned_by
  ON strategy_leads(assigned_by);

-- strategy_milestones
CREATE INDEX IF NOT EXISTS idx_strategy_milestones_focus_area_id
  ON strategy_milestones(focus_area_id);

-- strategy_notifications
CREATE INDEX IF NOT EXISTS idx_strategy_notifications_department_strategy_id
  ON strategy_notifications(department_strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_notifications_strategy_id
  ON strategy_notifications(strategy_id);

-- system_settings
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by
  ON system_settings(updated_by);

-- training_attendees
CREATE INDEX IF NOT EXISTS idx_training_attendees_training_session_id
  ON training_attendees(training_session_id);

-- training_completions
CREATE INDEX IF NOT EXISTS idx_training_completions_course_id
  ON training_completions(course_id);

-- user_admin_permissions
CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_permission_name
  ON user_admin_permissions(permission_name);

-- user_cvs
CREATE INDEX IF NOT EXISTS idx_user_cvs_user_id
  ON user_cvs(user_id);

-- view_as_sessions
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_admin_id
  ON view_as_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_target_user_id
  ON view_as_sessions(target_user_id);

-- weekly_catchups
CREATE INDEX IF NOT EXISTS idx_weekly_catchups_employee_id
  ON weekly_catchups(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_catchups_manager_id
  ON weekly_catchups(manager_id);
