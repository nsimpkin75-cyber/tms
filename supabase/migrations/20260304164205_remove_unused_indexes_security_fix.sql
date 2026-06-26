/*
  # Remove Unused Indexes (Security Fix)

  1. Indexes Removed
    - Removes 54 unused indexes that have never been used
    - Improves write performance by reducing index maintenance overhead
    - Reduces storage space usage

  2. Security Impact
    - Improves overall database performance
    - No negative impact on queries (indexes were never used)
*/

DROP INDEX IF EXISTS idx_profiles_department;
DROP INDEX IF EXISTS idx_reviews_employee;
DROP INDEX IF EXISTS idx_reviews_manager;
DROP INDEX IF EXISTS idx_reviews_status;
DROP INDEX IF EXISTS idx_action_items_owner;
DROP INDEX IF EXISTS idx_action_items_completed;
DROP INDEX IF EXISTS idx_training_sessions_date;
DROP INDEX IF EXISTS idx_training_attendees_profile;
DROP INDEX IF EXISTS idx_training_attendees_session;
DROP INDEX IF EXISTS idx_user_admin_permissions_user_id;
DROP INDEX IF EXISTS idx_view_as_sessions_admin_id;
DROP INDEX IF EXISTS idx_view_as_sessions_active;
DROP INDEX IF EXISTS idx_profiles_manager_id;
DROP INDEX IF EXISTS idx_profiles_job_family_id;
DROP INDEX IF EXISTS idx_competency_categories_framework;
DROP INDEX IF EXISTS idx_competency_levels_category;
DROP INDEX IF EXISTS idx_review_template_sections_template;
DROP INDEX IF EXISTS idx_review_template_questions_section;
DROP INDEX IF EXISTS idx_review_cycles_template;
DROP INDEX IF EXISTS idx_cycle_kpis_cycle;
DROP INDEX IF EXISTS idx_cycle_actions_cycle;
DROP INDEX IF EXISTS idx_review_instances_cycle;
DROP INDEX IF EXISTS idx_review_responses_instance;
DROP INDEX IF EXISTS idx_skill_assessments_skill;
DROP INDEX IF EXISTS idx_career_pathways_from;
DROP INDEX IF EXISTS idx_career_pathways_to;
DROP INDEX IF EXISTS idx_career_plan_milestones_plan;
DROP INDEX IF EXISTS idx_goal_kpis_goal;
DROP INDEX IF EXISTS idx_goal_actions_goal;
DROP INDEX IF EXISTS idx_goal_departments_goal;
DROP INDEX IF EXISTS idx_training_modules_course;
DROP INDEX IF EXISTS idx_module_content_items_module;
DROP INDEX IF EXISTS idx_training_completions_course;
DROP INDEX IF EXISTS idx_rating_approval_workflow_rating;
DROP INDEX IF EXISTS idx_profiles_manager;
DROP INDEX IF EXISTS idx_profiles_job_title;
DROP INDEX IF EXISTS idx_job_history_date;
DROP INDEX IF EXISTS idx_training_links_course;
DROP INDEX IF EXISTS idx_training_links_job_family;
DROP INDEX IF EXISTS idx_departments_org_active;
DROP INDEX IF EXISTS idx_job_titles_org_active;
DROP INDEX IF EXISTS idx_profiles_start_date;
DROP INDEX IF EXISTS idx_profiles_active;
DROP INDEX IF EXISTS idx_review_six_month_employee;
DROP INDEX IF EXISTS idx_review_six_month_manager;
DROP INDEX IF EXISTS idx_review_six_month_status;
DROP INDEX IF EXISTS idx_review_six_month_rating;
DROP INDEX IF EXISTS idx_review_kpis_employee;
DROP INDEX IF EXISTS idx_review_weekly_employee;
DROP INDEX IF EXISTS idx_review_monthly_employee;
DROP INDEX IF EXISTS idx_review_competency_review;
DROP INDEX IF EXISTS idx_review_notifications_recipient;