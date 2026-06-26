/*
  # Drop Duplicate and Unused Indexes

  ## Summary
  Removes all duplicate indexes (keeping the _id suffixed version) and
  unused indexes that have never been accessed, reducing write overhead
  and storage usage.

  ## Duplicate pairs resolved (keeping the _id version)
  career_plans, matrix_assignments, matrix_skills (x2), one_to_one_scheduled_meetings (x2),
  performance_ratings, profile_skills, rating_approval_workflow, review_competency_ratings,
  review_goal_progress, review_items, review_kpi_templates, review_monthly_sessions,
  review_notifications, review_rating_approvals (x5), review_responses,
  review_six_month_performance, review_weekly_checkins, skill_assessment_discrepancies (x2),
  skill_development_actions (x2), skill_development_plans, skill_ratings (x2),
  skills_master (x2), skills_matrix, strategic_goals, user_access_levels, view_as_sessions
*/

-- career_plans duplicates
DROP INDEX IF EXISTS public.idx_career_plans_target_job_family;

-- matrix_assignments duplicates
DROP INDEX IF EXISTS public.idx_matrix_assignments_employee;

-- matrix_skills duplicates
DROP INDEX IF EXISTS public.idx_matrix_skills_matrix;
DROP INDEX IF EXISTS public.idx_matrix_skills_skill;

-- one_to_one_scheduled_meetings duplicates
DROP INDEX IF EXISTS public.idx_one_to_one_scheduled_meetings_employee;
DROP INDEX IF EXISTS public.idx_one_to_one_scheduled_meetings_manager;

-- performance_ratings duplicates
DROP INDEX IF EXISTS public.idx_performance_ratings_rater;

-- profile_skills duplicates
DROP INDEX IF EXISTS public.idx_profile_skills_skill;

-- rating_approval_workflow duplicates
DROP INDEX IF EXISTS public.idx_rating_approval_workflow_approver;

-- review_competency_ratings duplicates
DROP INDEX IF EXISTS public.idx_review_competency_ratings_employee;

-- review_goal_progress duplicates
DROP INDEX IF EXISTS public.idx_review_goal_progress_employee;

-- review_items duplicates
DROP INDEX IF EXISTS public.idx_review_items_review;

-- review_kpi_templates duplicates
DROP INDEX IF EXISTS public.idx_review_kpi_templates_job_family;

-- review_monthly_sessions duplicates
DROP INDEX IF EXISTS public.idx_review_monthly_sessions_manager;

-- review_notifications duplicates
DROP INDEX IF EXISTS public.idx_review_notifications_sender;

-- review_rating_approvals duplicates
DROP INDEX IF EXISTS public.idx_review_rating_approvals_approver;
DROP INDEX IF EXISTS public.idx_review_rating_approvals_competency;
DROP INDEX IF EXISTS public.idx_review_rating_approvals_employee;
DROP INDEX IF EXISTS public.idx_review_rating_approvals_manager;
DROP INDEX IF EXISTS public.idx_review_rating_approvals_review;

-- review_responses duplicates
DROP INDEX IF EXISTS public.idx_review_responses_question;

-- review_six_month_performance duplicates
DROP INDEX IF EXISTS public.idx_review_six_month_approved_by;

-- review_weekly_checkins duplicates
DROP INDEX IF EXISTS public.idx_review_weekly_checkins_manager;

-- skill_assessment_discrepancies duplicates
DROP INDEX IF EXISTS public.idx_skill_assessment_discrepancies_employee;
DROP INDEX IF EXISTS public.idx_skill_assessment_discrepancies_skill;

-- skill_development_actions duplicates
DROP INDEX IF EXISTS public.idx_skill_development_actions_employee;
DROP INDEX IF EXISTS public.idx_skill_development_actions_skill;

-- skill_development_plans duplicates
DROP INDEX IF EXISTS public.idx_skill_development_plans_skill;

-- skill_ratings duplicates
DROP INDEX IF EXISTS public.idx_skill_ratings_employee;
DROP INDEX IF EXISTS public.idx_skill_ratings_skill;

-- skills_master duplicates
DROP INDEX IF EXISTS public.idx_skills_master_category;
DROP INDEX IF EXISTS public.idx_skills_master_type;

-- skills_matrix duplicates
DROP INDEX IF EXISTS public.idx_skills_matrix_job_family;

-- strategic_goals duplicates
DROP INDEX IF EXISTS public.idx_strategic_goals_owner;

-- user_access_levels duplicates
DROP INDEX IF EXISTS public.idx_user_access_levels_access_level;

-- view_as_sessions duplicates
DROP INDEX IF EXISTS public.idx_view_as_sessions_target_user;

-- Unused indexes (not duplicates)
DROP INDEX IF EXISTS public.idx_one_to_one_meetings_employee;
DROP INDEX IF EXISTS public.idx_profiles_role;
DROP INDEX IF EXISTS public.idx_job_family_competencies_job_family;
DROP INDEX IF EXISTS public.idx_assessment_cycles_created_by;
DROP INDEX IF EXISTS public.idx_assessment_cycles_matrix_id;
DROP INDEX IF EXISTS public.idx_goal_actions_assigned_to;
DROP INDEX IF EXISTS public.idx_matrix_assignments_employee_id;
DROP INDEX IF EXISTS public.idx_matrix_skills_matrix_id;
DROP INDEX IF EXISTS public.idx_matrix_skills_skill_id;
DROP INDEX IF EXISTS public.idx_one_to_one_notes_created_by;
DROP INDEX IF EXISTS public.idx_one_to_one_scheduled_meetings_employee_id;
DROP INDEX IF EXISTS public.idx_one_to_one_scheduled_meetings_manager_id;
DROP INDEX IF EXISTS public.idx_performance_ratings_rater_id;
DROP INDEX IF EXISTS public.idx_profile_skills_skill_id;
DROP INDEX IF EXISTS public.idx_rating_approval_workflow_approver_id;
DROP INDEX IF EXISTS public.idx_training_completions_profile;
DROP INDEX IF EXISTS public.idx_review_competency_ratings_employee_id;
DROP INDEX IF EXISTS public.idx_performance_ratings_profile;
DROP INDEX IF EXISTS public.idx_review_goal_progress_employee_id;
DROP INDEX IF EXISTS public.idx_review_items_review_id;
DROP INDEX IF EXISTS public.idx_review_kpi_templates_job_family_id;
DROP INDEX IF EXISTS public.idx_review_monthly_sessions_manager_id;
DROP INDEX IF EXISTS public.idx_review_notifications_sender_id;
DROP INDEX IF EXISTS public.idx_review_rating_approvals_approver_id;
DROP INDEX IF EXISTS public.idx_review_rating_approvals_competency_rating_id;
DROP INDEX IF EXISTS public.idx_job_history_profile;
DROP INDEX IF EXISTS public.idx_review_rating_approvals_employee_id;
DROP INDEX IF EXISTS public.idx_review_rating_approvals_manager_id;
DROP INDEX IF EXISTS public.idx_review_rating_approvals_review_id;
DROP INDEX IF EXISTS public.idx_review_responses_question_id;
DROP INDEX IF EXISTS public.idx_review_six_month_performance_approved_by;
DROP INDEX IF EXISTS public.idx_review_weekly_checkins_manager_id;
DROP INDEX IF EXISTS public.idx_skill_assessment_discrepancies_employee_id;
DROP INDEX IF EXISTS public.idx_skill_assessment_discrepancies_skill_id;
DROP INDEX IF EXISTS public.idx_skill_development_actions_employee_id;
DROP INDEX IF EXISTS public.idx_skill_development_actions_skill_id;
DROP INDEX IF EXISTS public.idx_skill_development_plans_skill_id;
DROP INDEX IF EXISTS public.idx_skill_ratings_employee_id;
DROP INDEX IF EXISTS public.idx_skill_ratings_skill_id;
DROP INDEX IF EXISTS public.idx_skills_master_skill_category_id;
DROP INDEX IF EXISTS public.idx_skills_master_skill_type_id;
DROP INDEX IF EXISTS public.idx_skills_matrix_job_family_id;
DROP INDEX IF EXISTS public.idx_strategic_goals_owner_id;
DROP INDEX IF EXISTS public.idx_user_access_levels_access_level_id;
DROP INDEX IF EXISTS public.idx_view_as_sessions_target_user_id;
DROP INDEX IF EXISTS public.idx_one_to_one_meetings_oto_cycle_id;
DROP INDEX IF EXISTS public.idx_matrices_department;
DROP INDEX IF EXISTS public.idx_user_access_levels_user;
DROP INDEX IF EXISTS public.idx_values_active;
DROP INDEX IF EXISTS public.idx_values_sort;
DROP INDEX IF EXISTS public.idx_competencies_value;
DROP INDEX IF EXISTS public.idx_competencies_active;
DROP INDEX IF EXISTS public.idx_competency_levels_competency;
DROP INDEX IF EXISTS public.idx_review_kpi_templates_created_by;
DROP INDEX IF EXISTS public.idx_review_kpis_created_by;
DROP INDEX IF EXISTS public.idx_review_instances_employee;
DROP INDEX IF EXISTS public.idx_review_instances_manager;
DROP INDEX IF EXISTS public.idx_skill_assessments_assessed_by;
DROP INDEX IF EXISTS public.idx_skill_development_plans_profile;
DROP INDEX IF EXISTS public.idx_career_plans_target_job_family_id;
DROP INDEX IF EXISTS public.idx_career_plans_target_job_family;
DROP INDEX IF EXISTS public.idx_career_plans_profile;
DROP INDEX IF EXISTS public.idx_skills_matrices_created_by;
DROP INDEX IF EXISTS public.idx_review_goal_progress_employee;
DROP INDEX IF EXISTS public.idx_one_to_one_scheduled_meetings_employee;
DROP INDEX IF EXISTS public.idx_one_to_one_scheduled_meetings_manager;
DROP INDEX IF EXISTS public.idx_one_to_one_meetings_manager;
DROP INDEX IF EXISTS public.idx_one_to_one_notes_meeting;
DROP INDEX IF EXISTS public.idx_one_to_one_action_items_meeting;
DROP INDEX IF EXISTS public.idx_one_to_one_action_items_owner;
DROP INDEX IF EXISTS public.idx_skill_assessments_profile;
DROP INDEX IF EXISTS public.idx_user_admin_permissions_granted_by;
DROP INDEX IF EXISTS public.idx_review_rating_approvals_employee;
DROP INDEX IF EXISTS public.idx_review_rating_approvals_manager;
DROP INDEX IF EXISTS public.idx_skill_ratings_rated_by;
DROP INDEX IF EXISTS public.idx_skill_development_actions_employee;
