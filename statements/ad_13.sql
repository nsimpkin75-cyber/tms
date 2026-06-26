CREATE INDEX IF NOT EXISTS idx_assessment_approvals_approved_by 
  ON assessment_approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_assessment_approvals_skill_id 
  ON assessment_approvals(skill_id);

CREATE INDEX IF NOT EXISTS idx_assessment_notifications_workflow_id 
  ON assessment_notifications(workflow_id);

CREATE INDEX IF NOT EXISTS idx_career_external_qualifications_quiz_session_id 
  ON career_external_qualifications(quiz_session_id);

CREATE INDEX IF NOT EXISTS idx_career_plans_user_id 
  ON career_plans(user_id);

CREATE INDEX IF NOT EXISTS idx_career_quiz_sessions_goal_role_id 
  ON career_quiz_sessions(goal_role_id);

CREATE INDEX IF NOT EXISTS idx_career_skill_self_ratings_skill_id 
  ON career_skill_self_ratings(skill_id);
CREATE INDEX IF NOT EXISTS idx_career_skill_self_ratings_user_id 
  ON career_skill_self_ratings(user_id);

CREATE INDEX IF NOT EXISTS idx_executive_strategies_creator_id 
  ON executive_strategies(creator_id);

CREATE INDEX IF NOT EXISTS idx_goal_milestones_assigned_to_id 
  ON goal_milestones(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id 
  ON goal_milestones(goal_id);

CREATE INDEX IF NOT EXISTS idx_half_year_review_summaries_meeting_id 
  ON half_year_review_summaries(meeting_id);

CREATE INDEX IF NOT EXISTS idx_job_families_job_title_id 
  ON job_families(job_title_id);

CREATE INDEX IF NOT EXISTS idx_job_titles_department_id 
  ON job_titles(department_id);

CREATE INDEX IF NOT EXISTS idx_one_to_one_actions_action_owner 
  ON one_to_one_actions(action_owner);
CREATE INDEX IF NOT EXISTS idx_one_to_one_actions_manager_id 
  ON one_to_one_actions(manager_id);

CREATE INDEX IF NOT EXISTS idx_one_to_one_competency_ratings_competency_id 
  ON one_to_one_competency_ratings(competency_id);

CREATE INDEX IF NOT EXISTS idx_one_to_one_half_year_reviews_manager_id 
  ON one_to_one_half_year_reviews(manager_id);

CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_competency_rating_id 
  ON one_to_one_moderation_queue(competency_rating_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_employee_id 
  ON one_to_one_moderation_queue(employee_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_manager_id 
  ON one_to_one_moderation_queue(manager_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_monthly_review_id 
  ON one_to_one_moderation_queue(monthly_review_id);

CREATE INDEX IF NOT EXISTS idx_one_to_one_monthly_reviews_manager_id 
  ON one_to_one_monthly_reviews(manager_id);

CREATE INDEX IF NOT EXISTS idx_one_to_one_review_cycles_manager_id 
  ON one_to_one_review_cycles(manager_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_review_cycles_strategic_goal_id 
  ON one_to_one_review_cycles(strategic_goal_id);

CREATE INDEX IF NOT EXISTS idx_one_to_one_self_assessments_half_year_review_id 
  ON one_to_one_self_assessments(half_year_review_id);

CREATE INDEX IF NOT EXISTS idx_one_to_one_skill_discussions_discrepancy_id 
  ON one_to_one_skill_discussions(discrepancy_id);

CREATE INDEX IF NOT EXISTS idx_one_to_one_weekly_checkins_manager_id 
  ON one_to_one_weekly_checkins(manager_id);

CREATE INDEX IF NOT EXISTS idx_performance_ratings_review_meeting_id 
  ON performance_ratings(review_meeting_id);

CREATE INDEX IF NOT EXISTS idx_profiles_job_title_id 
  ON profiles(job_title_id);

CREATE INDEX IF NOT EXISTS idx_review_competency_assessments_competency_id 
  ON review_competency_assessments(competency_id);

CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_competency_id 
  ON review_competency_ratings(competency_id);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_employee_id 
  ON review_competency_ratings(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_review_id 
  ON review_competency_ratings(review_id);

CREATE INDEX IF NOT EXISTS idx_review_cycles_strategy_id 
  ON review_cycles(strategy_id);

CREATE INDEX IF NOT EXISTS idx_review_goal_progress_employee_id 
  ON review_goal_progress(employee_id);

CREATE INDEX IF NOT EXISTS idx_review_half_year_assessments_employee_id 
  ON review_half_year_assessments(employee_id);

CREATE INDEX IF NOT EXISTS idx_review_instances_employee_id 
  ON review_instances(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_instances_manager_id 
  ON review_instances(manager_id);

CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_created_by 
  ON review_kpi_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_job_family_id 
  ON review_kpi_templates(job_family_id);

CREATE INDEX IF NOT EXISTS idx_review_kpis_created_by 
  ON review_kpis(created_by);
CREATE INDEX IF NOT EXISTS idx_review_kpis_employee_id 
  ON review_kpis(employee_id);

CREATE INDEX IF NOT EXISTS idx_review_meetings_employee_id 
  ON review_meetings(employee_id);

CREATE INDEX IF NOT EXISTS idx_review_monthly_competency_scores_employee_id 
  ON review_monthly_competency_scores(employee_id);

CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_employee_id 
  ON review_monthly_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_manager_id 
  ON review_monthly_sessions(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_review_template_id 
  ON review_monthly_sessions(review_template_id);

CREATE INDEX IF NOT EXISTS idx_review_notifications_recipient_id 
  ON review_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_review_notifications_sender_id 
  ON review_notifications(sender_id);

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

CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_approved_by 
  ON review_six_month_performance(approved_by);
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_employee_id 
  ON review_six_month_performance(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_manager_id 
  ON review_six_month_performance(manager_id);

CREATE INDEX IF NOT EXISTS idx_review_template_kpis_template_id 
  ON review_template_kpis(template_id);

CREATE INDEX IF NOT EXISTS idx_review_templates_department_strategy_id 
  ON review_templates(department_strategy_id);

CREATE INDEX IF NOT EXISTS idx_review_weekly_checkins_employee_id 
  ON review_weekly_checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_weekly_checkins_manager_id 
  ON review_weekly_checkins(manager_id);

CREATE INDEX IF NOT EXISTS idx_review_weekly_kpi_ratings_employee_id 
  ON review_weekly_kpi_ratings(employee_id);

CREATE INDEX IF NOT EXISTS idx_review_weekly_summaries_employee_id 
  ON review_weekly_summaries(employee_id);

CREATE INDEX IF NOT EXISTS idx_role_skills_skill_type_id 
  ON role_skills(skill_type_id);

CREATE INDEX IF NOT EXISTS idx_skill_assessment_cycles_created_by 
  ON skill_assessment_cycles(created_by);

CREATE INDEX IF NOT EXISTS idx_skill_assessment_discrepancies_discussed_in_meeting_id 
  ON skill_assessment_discrepancies(discussed_in_meeting_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessment_discrepancies_skill_id 
  ON skill_assessment_discrepancies(skill_id);

CREATE INDEX IF NOT EXISTS idx_skill_development_actions_created_by 
  ON skill_development_actions(created_by);
CREATE INDEX IF NOT EXISTS idx_skill_development_actions_discussion_id 
  ON skill_development_actions(discussion_id);

CREATE INDEX IF NOT EXISTS idx_skills_assessment_workflow_approved_by 
  ON skills_assessment_workflow(approved_by);

CREATE INDEX IF NOT EXISTS idx_standalone_strategy_actions_assigned_to 
  ON standalone_strategy_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_standalone_strategy_actions_standalone_strategy_id 
  ON standalone_strategy_actions(standalone_strategy_id);

CREATE INDEX IF NOT EXISTS idx_strategic_goals_department_id 
  ON strategic_goals(department_id);

CREATE INDEX IF NOT EXISTS idx_strategies_creator_id 
  ON strategies(creator_id);
CREATE INDEX IF NOT EXISTS idx_strategies_parent 
  ON strategies(parent_strategy_id);

CREATE INDEX IF NOT EXISTS idx_strategy_actions_assigned_to 
  ON strategy_actions(assigned_to);

CREATE INDEX IF NOT EXISTS idx_strategy_approvals_approver_id 
  ON strategy_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_strategy_approvals_department_strategy_id 
  ON strategy_approvals(department_strategy_id);

CREATE INDEX IF NOT EXISTS idx_strategy_focus_areas_v2_strategy_id 
  ON strategy_focus_areas_v2(strategy_id);

CREATE INDEX IF NOT EXISTS idx_strategy_kpis_assigned_to_user_id 
  ON strategy_kpis(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_kpis_department_strategy_id 
  ON strategy_kpis(department_strategy_id);

CREATE INDEX IF NOT EXISTS idx_strategy_lead_assignments_strategy_lead_id 
  ON strategy_lead_assignments(strategy_lead_id);

CREATE INDEX IF NOT EXISTS idx_strategy_leads_user_id 
  ON strategy_leads(user_id);

CREATE INDEX IF NOT EXISTS idx_strategy_notifications_user_id 
  ON strategy_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_training_module_links_job_family_id 
  ON training_module_links(job_family_id);

CREATE INDEX IF NOT EXISTS idx_training_module_pages_course_id 
  ON training_module_pages(course_id);

CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_granted_by 
  ON user_admin_permissions(granted_by);

CREATE INDEX IF NOT EXISTS idx_weekly_performance_scores_meeting_id 
  ON weekly_performance_scores(meeting_id);