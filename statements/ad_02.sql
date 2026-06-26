DROP INDEX IF EXISTS idx_action_items_owner;

DROP INDEX IF EXISTS idx_career_plans_user_id;

DROP INDEX IF EXISTS idx_job_family_competencies_job_family;

DROP INDEX IF EXISTS idx_strategic_goals_department;

DROP INDEX IF EXISTS idx_executive_strategies_creator;
DROP INDEX IF EXISTS idx_executive_strategies_status;

DROP INDEX IF EXISTS idx_strategy_focus_areas_v2_strategy;

DROP INDEX IF EXISTS idx_job_titles_department;

DROP INDEX IF EXISTS idx_strategy_lead_assignments_lead;
DROP INDEX IF EXISTS idx_strategy_lead_assignments_focus_area;

DROP INDEX IF EXISTS idx_department_strategies_focus_area;
DROP INDEX IF EXISTS idx_department_strategies_creator;
DROP INDEX IF EXISTS idx_department_strategies_status;

DROP INDEX IF EXISTS idx_department_strategy_kpis_dept_strategy;

DROP INDEX IF EXISTS idx_department_strategy_approvals_dept_strategy;

DROP INDEX IF EXISTS idx_review_templates_dept_strategy;
DROP INDEX IF EXISTS idx_review_templates_role_dept;

DROP INDEX IF EXISTS idx_review_template_kpis_template;

DROP INDEX IF EXISTS idx_review_instances_cycle;
DROP INDEX IF EXISTS idx_review_instances_employee;
DROP INDEX IF EXISTS idx_review_instances_manager;
DROP INDEX IF EXISTS idx_review_instances_status;

DROP INDEX IF EXISTS idx_review_kpi_templates_job_family_id;
DROP INDEX IF EXISTS idx_review_kpi_templates_created_by;
DROP INDEX IF EXISTS idx_review_kpi_templates_department;

DROP INDEX IF EXISTS idx_review_kpis_created_by;
DROP INDEX IF EXISTS idx_review_kpis_employee;
DROP INDEX IF EXISTS idx_review_kpis_active;

DROP INDEX IF EXISTS idx_review_monthly_sessions_review_template_id;
DROP INDEX IF EXISTS idx_review_monthly_employee;
DROP INDEX IF EXISTS idx_review_monthly_manager;
DROP INDEX IF EXISTS idx_review_monthly_status;

DROP INDEX IF EXISTS idx_review_notifications_sender_id;
DROP INDEX IF EXISTS idx_review_notifications_recipient;

DROP INDEX IF EXISTS idx_review_rating_approvals_competency_rating_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_employee_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_manager_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_review_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_approver;
DROP INDEX IF EXISTS idx_review_rating_approvals_status;

DROP INDEX IF EXISTS idx_goal_milestones_assigned_to_id;
DROP INDEX IF EXISTS idx_goal_milestones_goal_id;

DROP INDEX IF EXISTS idx_half_year_review_summaries_meeting_id;

DROP INDEX IF EXISTS idx_job_families_job_title_id;

DROP INDEX IF EXISTS idx_performance_ratings_review_meeting_id;
DROP INDEX IF EXISTS idx_performance_ratings_employee;

DROP INDEX IF EXISTS idx_profiles_job_title_id;

DROP INDEX IF EXISTS idx_review_competency_assessments_competency_id;

DROP INDEX IF EXISTS idx_review_competency_ratings_competency_id;
DROP INDEX IF EXISTS idx_review_competency_ratings_employee_id;
DROP INDEX IF EXISTS idx_review_competency_ratings_review;
DROP INDEX IF EXISTS idx_review_competency_ratings_approval;

DROP INDEX IF EXISTS idx_review_goal_progress_employee_id;
DROP INDEX IF EXISTS idx_review_goal_progress_review;

DROP INDEX IF EXISTS idx_review_six_month_performance_approved_by;
DROP INDEX IF EXISTS idx_review_six_month_performance_manager_id;
DROP INDEX IF EXISTS idx_review_six_month_employee;
DROP INDEX IF EXISTS idx_review_six_month_status;

DROP INDEX IF EXISTS idx_standalone_strategy_actions_assigned_to;
DROP INDEX IF EXISTS idx_standalone_strategy_actions_standalone_strategy_id;

DROP INDEX IF EXISTS idx_strategy_actions_assigned_to;
DROP INDEX IF EXISTS idx_strategy_actions_department_strategy_id;

DROP INDEX IF EXISTS idx_user_admin_permissions_granted_by;
DROP INDEX IF EXISTS idx_user_admin_permissions_user_id;

DROP INDEX IF EXISTS idx_weekly_performance_scores_meeting_id;

DROP INDEX IF EXISTS idx_training_module_links_job_family_id;

DROP INDEX IF EXISTS idx_review_meetings_employee;

DROP INDEX IF EXISTS idx_review_weekly_employee;
DROP INDEX IF EXISTS idx_review_weekly_manager;
DROP INDEX IF EXISTS idx_review_weekly_status;

DROP INDEX IF EXISTS idx_training_module_pages_sort_order;

DROP INDEX IF EXISTS idx_strategies_creator;
DROP INDEX IF EXISTS idx_strategies_parent;

DROP INDEX IF EXISTS idx_leads_user;

DROP INDEX IF EXISTS idx_dept_strategies_focus;
DROP INDEX IF EXISTS idx_dept_strategies_creator;

DROP INDEX IF EXISTS idx_kpis_dept_strategy;
DROP INDEX IF EXISTS idx_kpis_assigned_to;

DROP INDEX IF EXISTS idx_approvals_dept_strategy;
DROP INDEX IF EXISTS idx_approvals_approver;

DROP INDEX IF EXISTS idx_notifications_user;

DROP INDEX IF EXISTS idx_review_cycles_strategy;
DROP INDEX IF EXISTS idx_review_cycles_status;

DROP INDEX IF EXISTS idx_review_weekly_kpi_ratings_employee;

DROP INDEX IF EXISTS idx_review_weekly_summaries_employee;

DROP INDEX IF EXISTS idx_review_monthly_competency_employee;
DROP INDEX IF EXISTS idx_review_monthly_competency_moderation;

DROP INDEX IF EXISTS idx_review_half_year_employee;