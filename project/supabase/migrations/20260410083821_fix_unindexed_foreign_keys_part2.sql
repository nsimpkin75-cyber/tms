/*
  # Fix unindexed foreign keys - Part 2

  Adds covering indexes for foreign key columns.
  Tables: performance_ratings, profile_skills, rating_approval_workflow,
          review_* tables, skill_* tables, skills_* tables,
          strategic_goals, training_completions, user_* tables, view_as_sessions
*/

-- performance_ratings
CREATE INDEX IF NOT EXISTS idx_performance_ratings_profile_id ON public.performance_ratings(profile_id);
CREATE INDEX IF NOT EXISTS idx_performance_ratings_rater_id ON public.performance_ratings(rater_id);

-- profile_skills
CREATE INDEX IF NOT EXISTS idx_profile_skills_skill_id ON public.profile_skills(skill_id);

-- rating_approval_workflow
CREATE INDEX IF NOT EXISTS idx_rating_approval_workflow_approver_id ON public.rating_approval_workflow(approver_id);

-- review_competency_ratings
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_employee_id ON public.review_competency_ratings(employee_id);

-- review_goal_progress
CREATE INDEX IF NOT EXISTS idx_review_goal_progress_employee_id ON public.review_goal_progress(employee_id);

-- review_instances
CREATE INDEX IF NOT EXISTS idx_review_instances_employee_id ON public.review_instances(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_instances_manager_id ON public.review_instances(manager_id);

-- review_items
CREATE INDEX IF NOT EXISTS idx_review_items_review_id ON public.review_items(review_id);

-- review_kpi_templates
CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_created_by ON public.review_kpi_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_job_family_id ON public.review_kpi_templates(job_family_id);

-- review_kpis
CREATE INDEX IF NOT EXISTS idx_review_kpis_created_by ON public.review_kpis(created_by);

-- review_monthly_sessions
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_manager_id ON public.review_monthly_sessions(manager_id);

-- review_notifications
CREATE INDEX IF NOT EXISTS idx_review_notifications_sender_id ON public.review_notifications(sender_id);

-- review_rating_approvals
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_approver_id ON public.review_rating_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_competency_rating_id ON public.review_rating_approvals(competency_rating_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_employee_id ON public.review_rating_approvals(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_manager_id ON public.review_rating_approvals(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_review_id ON public.review_rating_approvals(review_id);

-- review_responses
CREATE INDEX IF NOT EXISTS idx_review_responses_question_id ON public.review_responses(question_id);

-- review_six_month_performance
CREATE INDEX IF NOT EXISTS idx_review_six_month_approved_by ON public.review_six_month_performance(approved_by);

-- review_weekly_checkins
CREATE INDEX IF NOT EXISTS idx_review_weekly_checkins_manager_id ON public.review_weekly_checkins(manager_id);

-- skill_assessment_discrepancies
CREATE INDEX IF NOT EXISTS idx_skill_discrepancies_employee_id ON public.skill_assessment_discrepancies(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_discrepancies_skill_id ON public.skill_assessment_discrepancies(skill_id);

-- skill_assessments
CREATE INDEX IF NOT EXISTS idx_skill_assessments_assessed_by ON public.skill_assessments(assessed_by);
CREATE INDEX IF NOT EXISTS idx_skill_assessments_profile_id ON public.skill_assessments(profile_id);

-- skill_development_actions
CREATE INDEX IF NOT EXISTS idx_skill_dev_actions_employee_id ON public.skill_development_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_dev_actions_skill_id ON public.skill_development_actions(skill_id);

-- skill_development_plans
CREATE INDEX IF NOT EXISTS idx_skill_dev_plans_profile_id ON public.skill_development_plans(profile_id);
CREATE INDEX IF NOT EXISTS idx_skill_dev_plans_skill_id ON public.skill_development_plans(skill_id);

-- skill_ratings
CREATE INDEX IF NOT EXISTS idx_skill_ratings_employee_id ON public.skill_ratings(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_ratings_rated_by ON public.skill_ratings(rated_by);
CREATE INDEX IF NOT EXISTS idx_skill_ratings_skill_id ON public.skill_ratings(skill_id);

-- skills_master
CREATE INDEX IF NOT EXISTS idx_skills_master_skill_category_id ON public.skills_master(skill_category_id);
CREATE INDEX IF NOT EXISTS idx_skills_master_skill_type_id ON public.skills_master(skill_type_id);

-- skills_matrices
CREATE INDEX IF NOT EXISTS idx_skills_matrices_created_by ON public.skills_matrices(created_by);
CREATE INDEX IF NOT EXISTS idx_skills_matrices_department_id ON public.skills_matrices(department_id);

-- skills_matrix
CREATE INDEX IF NOT EXISTS idx_skills_matrix_job_family_id ON public.skills_matrix(job_family_id);

-- strategic_goals
CREATE INDEX IF NOT EXISTS idx_strategic_goals_owner_id ON public.strategic_goals(owner_id);

-- training_completions
CREATE INDEX IF NOT EXISTS idx_training_completions_profile_id ON public.training_completions(profile_id);

-- user_access_levels
CREATE INDEX IF NOT EXISTS idx_user_access_levels_access_level_id ON public.user_access_levels(access_level_id);

-- user_admin_permissions
CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_granted_by ON public.user_admin_permissions(granted_by);

-- view_as_sessions
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_target_user_id ON public.view_as_sessions(target_user_id);
