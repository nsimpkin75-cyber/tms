/*
  # Add Missing Foreign Key Indexes

  ## Summary
  Adds covering indexes for all foreign key columns that lack them.
  This resolves query performance issues caused by unindexed FK lookups.

  ## Tables affected
  action_items, career_pathways, career_plan_milestones, competency_categories,
  cycle_actions, cycle_kpis, goal_actions, goal_departments, goal_kpis,
  job_family_competencies, module_content_items, one_to_one_cycle_kpis,
  one_to_one_review_cycles, one_to_one_scheduled_meetings, profiles,
  rating_approval_workflow, review_competency_ratings, review_cycles,
  review_instances, review_kpis, review_monthly_sessions, review_notifications,
  review_responses, review_six_month_performance, review_template_questions,
  review_template_sections, review_weekly_checkins, reviews, skill_assessments,
  training_attendees, training_completions, training_module_job_family_links,
  training_modules, user_access_levels, view_as_sessions
*/

CREATE INDEX IF NOT EXISTS idx_action_items_owner_id ON public.action_items(owner_id);

CREATE INDEX IF NOT EXISTS idx_career_pathways_from_job_family_id ON public.career_pathways(from_job_family_id);
CREATE INDEX IF NOT EXISTS idx_career_pathways_to_job_family_id ON public.career_pathways(to_job_family_id);

CREATE INDEX IF NOT EXISTS idx_career_plan_milestones_plan_id ON public.career_plan_milestones(plan_id);

CREATE INDEX IF NOT EXISTS idx_competency_categories_framework_id ON public.competency_categories(framework_id);

CREATE INDEX IF NOT EXISTS idx_cycle_actions_cycle_id ON public.cycle_actions(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_kpis_cycle_id ON public.cycle_kpis(cycle_id);

CREATE INDEX IF NOT EXISTS idx_goal_actions_goal_id ON public.goal_actions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_departments_goal_id ON public.goal_departments(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_kpis_goal_id ON public.goal_kpis(goal_id);

CREATE INDEX IF NOT EXISTS idx_job_family_competencies_competency_id ON public.job_family_competencies(competency_id);
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_required_level_id ON public.job_family_competencies(required_level_id);

CREATE INDEX IF NOT EXISTS idx_module_content_items_module_id ON public.module_content_items(module_id);

CREATE INDEX IF NOT EXISTS idx_one_to_one_cycle_kpis_cycle_id ON public.one_to_one_cycle_kpis(cycle_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_review_cycles_manager_id ON public.one_to_one_review_cycles(manager_id);

CREATE INDEX IF NOT EXISTS idx_one_to_one_scheduled_meetings_cycle_id ON public.one_to_one_scheduled_meetings(cycle_id);

CREATE INDEX IF NOT EXISTS idx_profiles_job_family_id ON public.profiles(job_family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles(manager_id);

CREATE INDEX IF NOT EXISTS idx_rating_approval_workflow_rating_id ON public.rating_approval_workflow(rating_id);

CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_review_id ON public.review_competency_ratings(review_id);

CREATE INDEX IF NOT EXISTS idx_review_cycles_template_id ON public.review_cycles(template_id);

CREATE INDEX IF NOT EXISTS idx_review_instances_cycle_id ON public.review_instances(cycle_id);

CREATE INDEX IF NOT EXISTS idx_review_kpis_employee_id ON public.review_kpis(employee_id);

CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_employee_id ON public.review_monthly_sessions(employee_id);

CREATE INDEX IF NOT EXISTS idx_review_notifications_recipient_id ON public.review_notifications(recipient_id);

CREATE INDEX IF NOT EXISTS idx_review_responses_instance_id ON public.review_responses(instance_id);

CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_employee_id ON public.review_six_month_performance(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_manager_id ON public.review_six_month_performance(manager_id);

CREATE INDEX IF NOT EXISTS idx_review_template_questions_section_id ON public.review_template_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_review_template_sections_template_id ON public.review_template_sections(template_id);

CREATE INDEX IF NOT EXISTS idx_review_weekly_checkins_employee_id ON public.review_weekly_checkins(employee_id);

CREATE INDEX IF NOT EXISTS idx_reviews_employee_id ON public.reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_manager_id ON public.reviews(manager_id);

CREATE INDEX IF NOT EXISTS idx_skill_assessments_skill_id ON public.skill_assessments(skill_id);

CREATE INDEX IF NOT EXISTS idx_training_attendees_training_session_id ON public.training_attendees(training_session_id);

CREATE INDEX IF NOT EXISTS idx_training_completions_course_id ON public.training_completions(course_id);

CREATE INDEX IF NOT EXISTS idx_training_module_job_family_links_job_family_id ON public.training_module_job_family_links(job_family_id);

CREATE INDEX IF NOT EXISTS idx_training_modules_course_id ON public.training_modules(course_id);

CREATE INDEX IF NOT EXISTS idx_user_access_levels_assigned_by ON public.user_access_levels(assigned_by);

CREATE INDEX IF NOT EXISTS idx_view_as_sessions_admin_id ON public.view_as_sessions(admin_id);
