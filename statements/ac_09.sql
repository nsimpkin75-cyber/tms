DROP INDEX IF EXISTS idx_business_strategies_created_by;
DROP INDEX IF EXISTS idx_business_strategies_owner_id;

DROP INDEX IF EXISTS idx_career_development_plans_manager_id;

DROP INDEX IF EXISTS idx_career_pathways_user_id;

DROP INDEX IF EXISTS idx_career_plan_milestones_career_plan_id;

DROP INDEX IF EXISTS idx_career_plans_current_job_family_id;
DROP INDEX IF EXISTS idx_career_plans_target_job_family_id;

DROP INDEX IF EXISTS idx_career_quiz_responses_user_id;

DROP INDEX IF EXISTS idx_catchup_summaries_employee_id;

DROP INDEX IF EXISTS idx_copilot_conversation_history_user_id;

DROP INDEX IF EXISTS idx_department_strategies_approved_by;
DROP INDEX IF EXISTS idx_department_strategies_owner_id;

DROP INDEX IF EXISTS idx_goals_user_id;

DROP INDEX IF EXISTS idx_job_family_competencies_competency_id;
DROP INDEX IF EXISTS idx_job_family_competencies_required_level_id;

DROP INDEX IF EXISTS idx_job_history_changed_by;
DROP INDEX IF EXISTS idx_job_history_job_family_id;
DROP INDEX IF EXISTS idx_job_history_user_id;

DROP INDEX IF EXISTS idx_one_to_one_goals_cdp_id;
DROP INDEX IF EXISTS idx_one_to_one_goals_created_by;
DROP INDEX IF EXISTS idx_one_to_one_goals_user_id;

DROP INDEX IF EXISTS idx_profile_skills_skill_id;

DROP INDEX IF EXISTS idx_profiles_job_family_id;
DROP INDEX IF EXISTS idx_profiles_manager_id;

DROP INDEX IF EXISTS idx_reviews_reviewer_id;

DROP INDEX IF EXISTS idx_standalone_dept_strategies_owner_id;

DROP INDEX IF EXISTS idx_strategic_goals_assigned_by_id;
DROP INDEX IF EXISTS idx_strategic_goals_assigned_to_id;
DROP INDEX IF EXISTS idx_strategic_goals_parent_goal_id;

DROP INDEX IF EXISTS idx_strategic_roadmaps_owner_id;

DROP INDEX IF EXISTS idx_strategy_actions_created_by;

DROP INDEX IF EXISTS idx_system_settings_updated_by;

DROP INDEX IF EXISTS idx_training_completions_course_id;

DROP INDEX IF EXISTS idx_user_cvs_user_id;

DROP INDEX IF EXISTS idx_weekly_catchups_employee_id;
DROP INDEX IF EXISTS idx_weekly_catchups_manager_id;

DROP INDEX IF EXISTS idx_review_meetings_manager;
DROP INDEX IF EXISTS idx_review_meetings_status;
DROP INDEX IF EXISTS idx_review_meetings_date;
DROP INDEX IF EXISTS idx_review_meetings_type;
DROP INDEX IF EXISTS idx_review_meetings_week;

DROP INDEX IF EXISTS idx_review_actions_meeting;
DROP INDEX IF EXISTS idx_review_actions_status;

DROP INDEX IF EXISTS idx_review_kpi_ratings_meeting;

DROP INDEX IF EXISTS idx_review_competency_assessments_meeting;
DROP INDEX IF EXISTS idx_review_competency_assessments_approval;

DROP INDEX IF EXISTS idx_review_summaries_meeting;

DROP INDEX IF EXISTS idx_review_approvals_assessment;
DROP INDEX IF EXISTS idx_review_approvals_approver;
DROP INDEX IF EXISTS idx_review_approvals_status;

DROP INDEX IF EXISTS idx_review_employee_notes_meeting;
DROP INDEX IF EXISTS idx_review_employee_notes_employee;

DROP INDEX IF EXISTS idx_performance_ratings_period;
DROP INDEX IF EXISTS idx_performance_ratings_category;

DROP INDEX IF EXISTS idx_weekly_scores_employee;
DROP INDEX IF EXISTS idx_weekly_scores_month;

DROP INDEX IF EXISTS idx_half_year_summaries_employee;
DROP INDEX IF EXISTS idx_half_year_summaries_period;

DROP INDEX IF EXISTS idx_user_admin_permissions_permission;

DROP INDEX IF EXISTS idx_view_as_sessions_admin;
DROP INDEX IF EXISTS idx_view_as_sessions_target;










DROP INDEX IF EXISTS idx_training_module_pages_course_id;