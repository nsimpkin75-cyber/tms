/*
  # Drop unused indexes

  Removes indexes that have never been used according to pg_stat_user_indexes.
  This reduces write overhead and storage without affecting query plans.
*/

DROP INDEX IF EXISTS public.idx_weekly_checkins_meeting_id;
DROP INDEX IF EXISTS public.idx_weekly_checkins_employee_id;
DROP INDEX IF EXISTS public.idx_monthly_reviews_meeting_id;
DROP INDEX IF EXISTS public.idx_monthly_reviews_employee_id;
DROP INDEX IF EXISTS public.idx_moderation_cases_manager_id;
DROP INDEX IF EXISTS public.idx_moderation_cases_employee_id;
DROP INDEX IF EXISTS public.idx_moderation_cases_status;
DROP INDEX IF EXISTS public.idx_moderation_cases_workflow_id;
DROP INDEX IF EXISTS public.idx_moderation_workflow_steps_workflow_id;
DROP INDEX IF EXISTS public.idx_moderation_case_decisions_case_id;
DROP INDEX IF EXISTS public.idx_action_items_owner_id;
DROP INDEX IF EXISTS public.idx_career_pathways_from_job_family_id;
DROP INDEX IF EXISTS public.idx_career_pathways_to_job_family_id;
DROP INDEX IF EXISTS public.idx_career_plan_milestones_plan_id;
DROP INDEX IF EXISTS public.idx_competency_categories_framework_id;
DROP INDEX IF EXISTS public.idx_cycle_actions_cycle_id;
DROP INDEX IF EXISTS public.idx_cycle_kpis_cycle_id;
DROP INDEX IF EXISTS public.idx_goal_actions_goal_id;
DROP INDEX IF EXISTS public.idx_goal_departments_goal_id;
DROP INDEX IF EXISTS public.idx_goal_kpis_goal_id;
DROP INDEX IF EXISTS public.idx_job_family_competencies_competency_id;
DROP INDEX IF EXISTS public.idx_job_family_competencies_required_level_id;
DROP INDEX IF EXISTS public.idx_module_content_items_module_id;
DROP INDEX IF EXISTS public.idx_one_to_one_review_cycles_manager_id;
DROP INDEX IF EXISTS public.idx_one_to_one_scheduled_meetings_cycle_id;
DROP INDEX IF EXISTS public.idx_profiles_job_family_id;
DROP INDEX IF EXISTS public.idx_profiles_manager_id;
DROP INDEX IF EXISTS public.idx_rating_approval_workflow_rating_id;
DROP INDEX IF EXISTS public.idx_review_competency_ratings_review_id;
DROP INDEX IF EXISTS public.idx_review_cycles_template_id;
DROP INDEX IF EXISTS public.idx_review_instances_cycle_id;
DROP INDEX IF EXISTS public.idx_review_kpis_employee_id;
DROP INDEX IF EXISTS public.idx_review_monthly_sessions_employee_id;
DROP INDEX IF EXISTS public.idx_cycle_employee_assignments_cycle_id;
DROP INDEX IF EXISTS public.idx_cycle_employee_assignments_employee_id;
DROP INDEX IF EXISTS public.idx_cycle_employee_assignments_manager_id;
DROP INDEX IF EXISTS public.idx_review_notifications_recipient_id;
DROP INDEX IF EXISTS public.idx_review_responses_instance_id;
DROP INDEX IF EXISTS public.idx_review_six_month_performance_employee_id;
DROP INDEX IF EXISTS public.idx_review_six_month_performance_manager_id;
DROP INDEX IF EXISTS public.idx_review_template_questions_section_id;
DROP INDEX IF EXISTS public.idx_review_template_sections_template_id;
DROP INDEX IF EXISTS public.idx_review_weekly_checkins_employee_id;
DROP INDEX IF EXISTS public.idx_reviews_employee_id;
DROP INDEX IF EXISTS public.idx_reviews_manager_id;
DROP INDEX IF EXISTS public.idx_skill_assessments_skill_id;
DROP INDEX IF EXISTS public.idx_training_attendees_training_session_id;
DROP INDEX IF EXISTS public.idx_training_completions_course_id;
DROP INDEX IF EXISTS public.idx_training_module_job_family_links_job_family_id;
DROP INDEX IF EXISTS public.idx_training_modules_course_id;
DROP INDEX IF EXISTS public.idx_user_access_levels_assigned_by;
DROP INDEX IF EXISTS public.idx_view_as_sessions_admin_id;
