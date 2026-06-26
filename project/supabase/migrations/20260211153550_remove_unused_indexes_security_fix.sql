/*
  # Remove Unused Indexes - Security Fix
  
  1. Purpose
    - Remove indexes that are not being used by queries
    - This reduces database bloat and improves write performance
  
  2. Changes
    - Drop all unused indexes identified by security scan
*/

-- Action Items
DROP INDEX IF EXISTS idx_action_items_owner;

-- Career Plans
DROP INDEX IF EXISTS idx_career_plans_user_id;

-- Job Family Competencies
DROP INDEX IF EXISTS idx_job_family_competencies_job_family;

-- Strategic Goals
DROP INDEX IF EXISTS idx_strategic_goals_department;

-- Executive Strategies
DROP INDEX IF EXISTS idx_executive_strategies_creator;
DROP INDEX IF EXISTS idx_executive_strategies_status;

-- Strategy Focus Areas V2
DROP INDEX IF EXISTS idx_strategy_focus_areas_v2_strategy;

-- Job Titles
DROP INDEX IF EXISTS idx_job_titles_department;

-- Strategy Lead Assignments
DROP INDEX IF EXISTS idx_strategy_lead_assignments_lead;
DROP INDEX IF EXISTS idx_strategy_lead_assignments_focus_area;

-- Department Strategies (keep one of each duplicate pair, drop the other)
DROP INDEX IF EXISTS idx_department_strategies_focus_area;
DROP INDEX IF EXISTS idx_department_strategies_creator;
DROP INDEX IF EXISTS idx_department_strategies_status;

-- Department Strategy KPIs
DROP INDEX IF EXISTS idx_department_strategy_kpis_dept_strategy;

-- Department Strategy Approvals
DROP INDEX IF EXISTS idx_department_strategy_approvals_dept_strategy;

-- Review Templates
DROP INDEX IF EXISTS idx_review_templates_dept_strategy;
DROP INDEX IF EXISTS idx_review_templates_role_dept;

-- Review Template KPIs
DROP INDEX IF EXISTS idx_review_template_kpis_template;

-- Review Instances
DROP INDEX IF EXISTS idx_review_instances_cycle;
DROP INDEX IF EXISTS idx_review_instances_employee;
DROP INDEX IF EXISTS idx_review_instances_manager;
DROP INDEX IF EXISTS idx_review_instances_status;

-- Review KPI Templates
DROP INDEX IF EXISTS idx_review_kpi_templates_job_family_id;
DROP INDEX IF EXISTS idx_review_kpi_templates_created_by;
DROP INDEX IF EXISTS idx_review_kpi_templates_department;

-- Review KPIs
DROP INDEX IF EXISTS idx_review_kpis_created_by;
DROP INDEX IF EXISTS idx_review_kpis_employee;
DROP INDEX IF EXISTS idx_review_kpis_active;

-- Review Monthly Sessions
DROP INDEX IF EXISTS idx_review_monthly_sessions_review_template_id;
DROP INDEX IF EXISTS idx_review_monthly_employee;
DROP INDEX IF EXISTS idx_review_monthly_manager;
DROP INDEX IF EXISTS idx_review_monthly_status;

-- Review Notifications
DROP INDEX IF EXISTS idx_review_notifications_sender_id;
DROP INDEX IF EXISTS idx_review_notifications_recipient;

-- Review Rating Approvals
DROP INDEX IF EXISTS idx_review_rating_approvals_competency_rating_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_employee_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_manager_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_review_id;
DROP INDEX IF EXISTS idx_review_rating_approvals_approver;
DROP INDEX IF EXISTS idx_review_rating_approvals_status;

-- Goal Milestones
DROP INDEX IF EXISTS idx_goal_milestones_assigned_to_id;
DROP INDEX IF EXISTS idx_goal_milestones_goal_id;

-- Half Year Review Summaries
DROP INDEX IF EXISTS idx_half_year_review_summaries_meeting_id;

-- Job Families
DROP INDEX IF EXISTS idx_job_families_job_title_id;

-- Performance Ratings
DROP INDEX IF EXISTS idx_performance_ratings_review_meeting_id;
DROP INDEX IF EXISTS idx_performance_ratings_employee;

-- Profiles
DROP INDEX IF EXISTS idx_profiles_job_title_id;

-- Review Competency Assessments
DROP INDEX IF EXISTS idx_review_competency_assessments_competency_id;

-- Review Competency Ratings
DROP INDEX IF EXISTS idx_review_competency_ratings_competency_id;
DROP INDEX IF EXISTS idx_review_competency_ratings_employee_id;
DROP INDEX IF EXISTS idx_review_competency_ratings_review;
DROP INDEX IF EXISTS idx_review_competency_ratings_approval;

-- Review Goal Progress
DROP INDEX IF EXISTS idx_review_goal_progress_employee_id;
DROP INDEX IF EXISTS idx_review_goal_progress_review;

-- Review Six Month Performance
DROP INDEX IF EXISTS idx_review_six_month_performance_approved_by;
DROP INDEX IF EXISTS idx_review_six_month_performance_manager_id;
DROP INDEX IF EXISTS idx_review_six_month_employee;
DROP INDEX IF EXISTS idx_review_six_month_status;

-- Standalone Strategy Actions
DROP INDEX IF EXISTS idx_standalone_strategy_actions_assigned_to;
DROP INDEX IF EXISTS idx_standalone_strategy_actions_standalone_strategy_id;

-- Strategy Actions
DROP INDEX IF EXISTS idx_strategy_actions_assigned_to;
DROP INDEX IF EXISTS idx_strategy_actions_department_strategy_id;

-- User Admin Permissions
DROP INDEX IF EXISTS idx_user_admin_permissions_granted_by;
DROP INDEX IF EXISTS idx_user_admin_permissions_user_id;

-- Weekly Performance Scores
DROP INDEX IF EXISTS idx_weekly_performance_scores_meeting_id;

-- Training Module Links
DROP INDEX IF EXISTS idx_training_module_links_job_family_id;

-- Review Meetings
DROP INDEX IF EXISTS idx_review_meetings_employee;

-- Review Weekly Check-ins
DROP INDEX IF EXISTS idx_review_weekly_employee;
DROP INDEX IF EXISTS idx_review_weekly_manager;
DROP INDEX IF EXISTS idx_review_weekly_status;

-- Training Module Pages
DROP INDEX IF EXISTS idx_training_module_pages_sort_order;

-- Strategies
DROP INDEX IF EXISTS idx_strategies_creator;
DROP INDEX IF EXISTS idx_strategies_parent;

-- Strategy Leads
DROP INDEX IF EXISTS idx_leads_user;

-- Department Strategies (additional duplicates)
DROP INDEX IF EXISTS idx_dept_strategies_focus;
DROP INDEX IF EXISTS idx_dept_strategies_creator;

-- Strategy KPIs
DROP INDEX IF EXISTS idx_kpis_dept_strategy;
DROP INDEX IF EXISTS idx_kpis_assigned_to;

-- Strategy Approvals
DROP INDEX IF EXISTS idx_approvals_dept_strategy;
DROP INDEX IF EXISTS idx_approvals_approver;

-- Strategy Notifications
DROP INDEX IF EXISTS idx_notifications_user;

-- Review Cycles
DROP INDEX IF EXISTS idx_review_cycles_strategy;
DROP INDEX IF EXISTS idx_review_cycles_status;

-- Review Weekly KPI Ratings
DROP INDEX IF EXISTS idx_review_weekly_kpi_ratings_employee;

-- Review Weekly Summaries
DROP INDEX IF EXISTS idx_review_weekly_summaries_employee;

-- Review Monthly Competency Scores
DROP INDEX IF EXISTS idx_review_monthly_competency_employee;
DROP INDEX IF EXISTS idx_review_monthly_competency_moderation;

-- Review Half Year Assessments
DROP INDEX IF EXISTS idx_review_half_year_employee;
