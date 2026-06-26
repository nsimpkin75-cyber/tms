/*
  # Add Missing Foreign Key Indexes - Security Fix
  
  1. Purpose
    - Add indexes for all foreign keys that don't have covering indexes
    - This improves query performance and prevents suboptimal execution plans
  
  2. Changes
    - Create indexes for all unindexed foreign keys identified by security scan
*/

-- Business Strategies
CREATE INDEX IF NOT EXISTS idx_business_strategies_created_by ON business_strategies(created_by);
CREATE INDEX IF NOT EXISTS idx_business_strategies_owner_id ON business_strategies(owner_id);

-- Career Development Plans
CREATE INDEX IF NOT EXISTS idx_career_development_plans_manager_id ON career_development_plans(manager_id);

-- Career Pathways
CREATE INDEX IF NOT EXISTS idx_career_pathways_user_id ON career_pathways(user_id);

-- Career Plan Milestones
CREATE INDEX IF NOT EXISTS idx_career_plan_milestones_career_plan_id ON career_plan_milestones(career_plan_id);

-- Career Plans
CREATE INDEX IF NOT EXISTS idx_career_plans_current_job_family_id ON career_plans(current_job_family_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_target_job_family_id ON career_plans(target_job_family_id);

-- Career Quiz Responses
CREATE INDEX IF NOT EXISTS idx_career_quiz_responses_user_id ON career_quiz_responses(user_id);

-- Catchup Summaries
CREATE INDEX IF NOT EXISTS idx_catchup_summaries_employee_id ON catchup_summaries(employee_id);

-- Copilot Conversation History
CREATE INDEX IF NOT EXISTS idx_copilot_conversation_history_user_id ON copilot_conversation_history(user_id);

-- Department Strategy Actions
CREATE INDEX IF NOT EXISTS idx_department_strategy_actions_assigned_to ON department_strategy_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_department_strategy_actions_dept_strategy_id ON department_strategy_actions(department_strategy_id);

-- Department Strategy Approvals
CREATE INDEX IF NOT EXISTS idx_department_strategy_approvals_approver_id ON department_strategy_approvals(approver_id);

-- Goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- Job Family Competencies
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_competency_id ON job_family_competencies(competency_id);
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_required_level_id ON job_family_competencies(required_level_id);

-- Job History
CREATE INDEX IF NOT EXISTS idx_job_history_changed_by ON job_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_job_history_job_family_id ON job_history(job_family_id);
CREATE INDEX IF NOT EXISTS idx_job_history_user_id ON job_history(user_id);

-- One to One Goals
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_cdp_id ON one_to_one_goals(cdp_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_created_by ON one_to_one_goals(created_by);
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_user_id ON one_to_one_goals(user_id);

-- Profile Skills
CREATE INDEX IF NOT EXISTS idx_profile_skills_skill_id ON profile_skills(skill_id);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_job_family_id ON profiles(job_family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON profiles(manager_id);

-- Review Actions
CREATE INDEX IF NOT EXISTS idx_review_actions_meeting_id ON review_actions(meeting_id);

-- Review Approvals
CREATE INDEX IF NOT EXISTS idx_review_approvals_approver_id ON review_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_review_approvals_competency_assessment_id ON review_approvals(competency_assessment_id);

-- Review Competency Assessments
CREATE INDEX IF NOT EXISTS idx_review_competency_assessments_meeting_id ON review_competency_assessments(meeting_id);

-- Review Competency Ratings
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_recorded_by ON review_competency_ratings(recorded_by);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_review_instance_id ON review_competency_ratings(review_instance_id);

-- Review Cycles
CREATE INDEX IF NOT EXISTS idx_review_cycles_focus_area_id ON review_cycles(focus_area_id);

-- Review Employee Actions
CREATE INDEX IF NOT EXISTS idx_review_employee_actions_action_owner ON review_employee_actions(action_owner);
CREATE INDEX IF NOT EXISTS idx_review_employee_actions_cycle_id ON review_employee_actions(cycle_id);

-- Review Employee Notes
CREATE INDEX IF NOT EXISTS idx_review_employee_notes_employee_id ON review_employee_notes(employee_id);

-- Review Half Year Assessments
CREATE INDEX IF NOT EXISTS idx_review_half_year_assessments_manager_id ON review_half_year_assessments(manager_id);

-- Review Instances
CREATE INDEX IF NOT EXISTS idx_review_instances_template_id ON review_instances(template_id);

-- Review KPI Ratings
CREATE INDEX IF NOT EXISTS idx_review_kpi_ratings_meeting_id ON review_kpi_ratings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_review_kpi_ratings_recorded_by ON review_kpi_ratings(recorded_by);
CREATE INDEX IF NOT EXISTS idx_review_kpi_ratings_review_instance_id ON review_kpi_ratings(review_instance_id);
CREATE INDEX IF NOT EXISTS idx_review_kpi_ratings_template_kpi_id ON review_kpi_ratings(template_kpi_id);

-- Review Meetings
CREATE INDEX IF NOT EXISTS idx_review_meetings_manager_id ON review_meetings(manager_id);

-- Review Monthly Averages
CREATE INDEX IF NOT EXISTS idx_review_monthly_averages_manager_id ON review_monthly_averages(manager_id);

-- Review Monthly Competency Scores
CREATE INDEX IF NOT EXISTS idx_review_monthly_competency_scores_competency_id ON review_monthly_competency_scores(competency_id);
CREATE INDEX IF NOT EXISTS idx_review_monthly_competency_scores_manager_id ON review_monthly_competency_scores(manager_id);

-- Review Schedules
CREATE INDEX IF NOT EXISTS idx_review_schedules_cycle_id ON review_schedules(cycle_id);
CREATE INDEX IF NOT EXISTS idx_review_schedules_manager_id ON review_schedules(manager_id);

-- Review Summaries
CREATE INDEX IF NOT EXISTS idx_review_summaries_review_instance_id ON review_summaries(review_instance_id);

-- Review Templates
CREATE INDEX IF NOT EXISTS idx_review_templates_creator_id ON review_templates(creator_id);
CREATE INDEX IF NOT EXISTS idx_review_templates_department_id ON review_templates(department_id);

-- Review Weekly KPI Ratings
CREATE INDEX IF NOT EXISTS idx_review_weekly_kpi_ratings_kpi_id ON review_weekly_kpi_ratings(kpi_id);
CREATE INDEX IF NOT EXISTS idx_review_weekly_kpi_ratings_manager_id ON review_weekly_kpi_ratings(manager_id);

-- Review Weekly Summaries
CREATE INDEX IF NOT EXISTS idx_review_weekly_summaries_manager_id ON review_weekly_summaries(manager_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);

-- Standalone Department Strategies
CREATE INDEX IF NOT EXISTS idx_standalone_department_strategies_owner_id ON standalone_department_strategies(owner_id);

-- Strategic Goals
CREATE INDEX IF NOT EXISTS idx_strategic_goals_assigned_by_id ON strategic_goals(assigned_by_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_assigned_to_id ON strategic_goals(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_parent_goal_id ON strategic_goals(parent_goal_id);

-- Strategic Roadmaps
CREATE INDEX IF NOT EXISTS idx_strategic_roadmaps_owner_id ON strategic_roadmaps(owner_id);

-- Strategy Actions
CREATE INDEX IF NOT EXISTS idx_strategy_actions_created_by ON strategy_actions(created_by);

-- Strategy KPIs
CREATE INDEX IF NOT EXISTS idx_strategy_kpis_focus_area_id ON strategy_kpis(focus_area_id);

-- Strategy Lead Assignments
CREATE INDEX IF NOT EXISTS idx_strategy_lead_assignments_assigned_by ON strategy_lead_assignments(assigned_by);

-- Strategy Leads
CREATE INDEX IF NOT EXISTS idx_strategy_leads_assigned_by ON strategy_leads(assigned_by);

-- Strategy Notifications
CREATE INDEX IF NOT EXISTS idx_strategy_notifications_dept_strategy_id ON strategy_notifications(department_strategy_id);
CREATE INDEX IF NOT EXISTS idx_strategy_notifications_strategy_id ON strategy_notifications(strategy_id);

-- System Settings
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON system_settings(updated_by);

-- Training Completions
CREATE INDEX IF NOT EXISTS idx_training_completions_course_id ON training_completions(course_id);

-- User Admin Permissions
CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_permission_name ON user_admin_permissions(permission_name);

-- User CVs
CREATE INDEX IF NOT EXISTS idx_user_cvs_user_id ON user_cvs(user_id);

-- View As Sessions
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_target_user_id ON view_as_sessions(target_user_id);

-- Weekly Catchups
CREATE INDEX IF NOT EXISTS idx_weekly_catchups_employee_id ON weekly_catchups(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_catchups_manager_id ON weekly_catchups(manager_id);

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

/*
  # Fix Always-True RLS Policies v2 - Security Fix
  
  1. Purpose
    - Fix RLS policies that have WITH CHECK clauses that are always true
    - This bypasses row-level security and creates security vulnerabilities
  
  2. Changes
    - Update policies to have proper authorization checks
    - Restrict access based on user permissions
*/

-- Job History - Fix "Allow job history inserts" policy
DROP POLICY IF EXISTS "Allow job history inserts" ON job_history;
CREATE POLICY "Allow job history inserts"
  ON job_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow inserting history for authenticated users
    -- Either the user themselves or an admin
    changed_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND admin_type IS NOT NULL
    )
  );

-- Review Cycle Actions - Fix "Authenticated users can insert cycle actions"
DROP POLICY IF EXISTS "Authenticated users can insert cycle actions" ON review_cycle_actions;
CREATE POLICY "Authenticated users can insert cycle actions"
  ON review_cycle_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow managers to insert cycle actions for their cycles
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_actions.cycle_id
      AND rc.manager_id = (select auth.uid())
    )
  );

-- Review Cycle KPIs - Fix "Authenticated users can insert cycle KPIs"
DROP POLICY IF EXISTS "Authenticated users can insert cycle KPIs" ON review_cycle_kpis;
CREATE POLICY "Authenticated users can insert cycle KPIs"
  ON review_cycle_kpis
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow managers to insert KPIs for their cycles
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_kpis.cycle_id
      AND rc.manager_id = (select auth.uid())
    )
  );

-- Review Cycle Members - Fix "Authenticated users can insert cycle members"
DROP POLICY IF EXISTS "Authenticated users can insert cycle members" ON review_cycle_members;
CREATE POLICY "Authenticated users can insert cycle members"
  ON review_cycle_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow managers to add members to their cycles
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_members.cycle_id
      AND rc.manager_id = (select auth.uid())
    )
  );

-- Strategy Notifications - Fix "System can create notifications"
DROP POLICY IF EXISTS "System can create notifications" ON strategy_notifications;
CREATE POLICY "System can create notifications"
  ON strategy_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow admins or the strategy creator to create notifications
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND admin_type IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM strategies s
      WHERE s.id = strategy_notifications.strategy_id
      AND s.creator_id = (select auth.uid())
    )
  );

/*
  # Fix Function Search Path - Security Fix
  
  1. Purpose
    - Add explicit search_path to calculate_nine_box_position function
    - Prevents potential security issues from mutable search paths
  
  2. Changes
    - Replace function with explicit search_path setting
*/

-- Fix calculate_nine_box_position function to have immutable search_path
CREATE OR REPLACE FUNCTION calculate_nine_box_position(
  p_kpi_average numeric,
  p_competency_average numeric
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_performance text;
  v_potential text;
BEGIN
  -- Classify performance (KPI)
  IF p_kpi_average >= 3.5 THEN
    v_performance := 'High';
  ELSIF p_kpi_average >= 2.5 THEN
    v_performance := 'Medium';
  ELSE
    v_performance := 'Low';
  END IF;
  
  -- Classify potential (Competency)
  IF p_competency_average >= 3.5 THEN
    v_potential := 'High';
  ELSIF p_competency_average >= 2.5 THEN
    v_potential := 'Medium';
  ELSE
    v_potential := 'Low';
  END IF;
  
  RETURN v_potential || ' Potential / ' || v_performance || ' Performance';
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_nine_box_position(numeric, numeric) TO authenticated;

/*
  # One to One Performance Review System

  1. New Tables
    - `one_to_one_review_cycles` - Review cycle configuration
    - `one_to_one_cycle_kpis` - KPIs for cycles
    - `one_to_one_scheduled_meetings` - Scheduled meetings
    - `one_to_one_weekly_checkins` - Weekly check-ins
    - `one_to_one_monthly_reviews` - Monthly reviews
    - `one_to_one_competency_ratings` - Competency ratings
    - `one_to_one_actions` - Action items
    - `one_to_one_half_year_reviews` - Half-year reviews
    - `one_to_one_self_assessments` - Self-assessments
    - `one_to_one_moderation_queue` - Moderation queue
    - `one_to_one_reminder_config` - Reminder configuration
    - `one_to_one_ai_coaching_config` - AI coaching rules

  2. Security
    - Enable RLS on all tables
    - Appropriate access for managers, employees, and leadership
*/

-- Review Cycles table
CREATE TABLE IF NOT EXISTS one_to_one_review_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES profiles(id) NOT NULL,
  cycle_name text NOT NULL,
  cycle_start_date date NOT NULL,
  cycle_end_date date NOT NULL,
  standard_agenda text,
  has_strategic_kpis boolean DEFAULT false,
  strategic_goal_id uuid REFERENCES strategic_goals(id),
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_review_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage their review cycles"
  ON one_to_one_review_cycles
  FOR ALL
  TO authenticated
  USING (manager_id = auth.uid());

CREATE POLICY "Leadership can view all review cycles"
  ON one_to_one_review_cycles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR has_strategic_roadmap_access = true)
    )
  );

-- Cycle KPIs table
CREATE TABLE IF NOT EXISTS one_to_one_cycle_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES one_to_one_review_cycles(id) ON DELETE CASCADE NOT NULL,
  kpi_name text NOT NULL,
  target_value numeric,
  measurement_unit text,
  frequency text DEFAULT 'weekly',
  source text DEFAULT 'manager',
  strategic_kpi_id uuid,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_cycle_kpis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage cycle KPIs"
  ON one_to_one_cycle_kpis
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_review_cycles rc
      WHERE rc.id = cycle_id AND rc.manager_id = auth.uid()
    )
  );

CREATE POLICY "Leadership can view all cycle KPIs"
  ON one_to_one_cycle_kpis
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR has_strategic_roadmap_access = true)
    )
  );

-- Scheduled Meetings table
CREATE TABLE IF NOT EXISTS one_to_one_scheduled_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid REFERENCES one_to_one_review_cycles(id) ON DELETE CASCADE NOT NULL,
  manager_id uuid REFERENCES profiles(id) NOT NULL,
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  scheduled_datetime timestamptz NOT NULL,
  google_calendar_event_id text,
  status text DEFAULT 'scheduled',
  meeting_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_scheduled_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and employees can view their meetings"
  ON one_to_one_scheduled_meetings
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid() OR employee_id = auth.uid());

CREATE POLICY "Managers can manage their meetings"
  ON one_to_one_scheduled_meetings
  FOR ALL
  TO authenticated
  USING (manager_id = auth.uid());

-- Weekly Checkins table
CREATE TABLE IF NOT EXISTS one_to_one_weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES one_to_one_scheduled_meetings(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  manager_id uuid REFERENCES profiles(id) NOT NULL,
  week_starting date NOT NULL,
  week_number integer NOT NULL,
  kpi_discussion jsonb,
  short_term_actions text[],
  summary text,
  performance_score integer CHECK (performance_score >= 1 AND performance_score <= 5),
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_weekly_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and employees can view their checkins"
  ON one_to_one_weekly_checkins
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid() OR employee_id = auth.uid());

CREATE POLICY "Managers can manage their team checkins"
  ON one_to_one_weekly_checkins
  FOR ALL
  TO authenticated
  USING (manager_id = auth.uid());

-- Monthly Reviews table
CREATE TABLE IF NOT EXISTS one_to_one_monthly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES one_to_one_scheduled_meetings(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  manager_id uuid REFERENCES profiles(id) NOT NULL,
  review_month date NOT NULL,
  average_weekly_performance numeric,
  overall_competency_score numeric,
  manager_summary text,
  ai_generated_summary text,
  requires_moderation boolean DEFAULT false,
  moderation_status text DEFAULT 'pending',
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  submitted_at timestamptz
);

ALTER TABLE one_to_one_monthly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and employees can view their monthly reviews"
  ON one_to_one_monthly_reviews
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid() OR employee_id = auth.uid());

CREATE POLICY "Managers can manage their team monthly reviews"
  ON one_to_one_monthly_reviews
  FOR ALL
  TO authenticated
  USING (manager_id = auth.uid());

CREATE POLICY "Senior managers can view for moderation"
  ON one_to_one_monthly_reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.id = p2.manager_id
      WHERE p2.id = one_to_one_monthly_reviews.manager_id AND p1.id = auth.uid()
    )
  );

-- Competency Ratings table
CREATE TABLE IF NOT EXISTS one_to_one_competency_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_review_id uuid REFERENCES one_to_one_monthly_reviews(id) ON DELETE CASCADE NOT NULL,
  competency_id uuid REFERENCES competencies(id) NOT NULL,
  competency_name text NOT NULL,
  target_level integer NOT NULL,
  manager_rating integer CHECK (manager_rating >= 1 AND manager_rating <= 5),
  manager_comment text,
  ai_validation_result jsonb,
  comment_quality_score integer,
  requires_moderation boolean DEFAULT false,
  evidence_provided text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_competency_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and employees can view competency ratings"
  ON one_to_one_competency_ratings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews mr
      WHERE mr.id = monthly_review_id 
      AND (mr.manager_id = auth.uid() OR mr.employee_id = auth.uid())
    )
  );

CREATE POLICY "Managers can manage competency ratings"
  ON one_to_one_competency_ratings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews mr
      WHERE mr.id = monthly_review_id AND mr.manager_id = auth.uid()
    )
  );

-- Actions table
CREATE TABLE IF NOT EXISTS one_to_one_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  manager_id uuid REFERENCES profiles(id) NOT NULL,
  weekly_checkin_id uuid REFERENCES one_to_one_weekly_checkins(id) ON DELETE CASCADE,
  monthly_review_id uuid REFERENCES one_to_one_monthly_reviews(id) ON DELETE CASCADE,
  action_title text NOT NULL,
  action_description text,
  action_owner uuid REFERENCES profiles(id) NOT NULL,
  target_date date,
  status text DEFAULT 'open',
  completed_date date,
  is_carried_forward boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and employees can view their actions"
  ON one_to_one_actions
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid() OR employee_id = auth.uid() OR action_owner = auth.uid());

CREATE POLICY "Managers can manage their team actions"
  ON one_to_one_actions
  FOR ALL
  TO authenticated
  USING (manager_id = auth.uid());

-- Half Year Reviews table
CREATE TABLE IF NOT EXISTS one_to_one_half_year_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  manager_id uuid REFERENCES profiles(id) NOT NULL,
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  self_assessment_id uuid,
  average_kpi_rating numeric,
  average_competency_rating numeric,
  overall_performance_rating integer CHECK (overall_performance_rating >= 1 AND overall_performance_rating <= 5),
  overall_competency_rating integer CHECK (overall_competency_rating >= 1 AND overall_competency_rating <= 5),
  nine_box_position text,
  manager_summary text,
  ai_generated_summary text,
  status text DEFAULT 'pending_self_assessment',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  submitted_at timestamptz
);

ALTER TABLE one_to_one_half_year_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and employees can view their half year reviews"
  ON one_to_one_half_year_reviews
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid() OR employee_id = auth.uid());

CREATE POLICY "Managers can manage their team half year reviews"
  ON one_to_one_half_year_reviews
  FOR ALL
  TO authenticated
  USING (manager_id = auth.uid());

-- Self Assessments table
CREATE TABLE IF NOT EXISTS one_to_one_self_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  half_year_review_id uuid REFERENCES one_to_one_half_year_reviews(id) ON DELETE CASCADE,
  what_do_well text,
  areas_need_support text,
  what_would_help text,
  additional_comments text,
  status text DEFAULT 'pending',
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_self_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can manage their own self assessments"
  ON one_to_one_self_assessments
  FOR ALL
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can view team self assessments"
  ON one_to_one_self_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = employee_id AND p.manager_id = auth.uid()
    )
  );

-- Moderation Queue table
CREATE TABLE IF NOT EXISTS one_to_one_moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_review_id uuid REFERENCES one_to_one_monthly_reviews(id) ON DELETE CASCADE,
  competency_rating_id uuid REFERENCES one_to_one_competency_ratings(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES profiles(id) NOT NULL,
  manager_id uuid REFERENCES profiles(id) NOT NULL,
  moderator_id uuid REFERENCES profiles(id),
  rating_value integer NOT NULL,
  rating_type text NOT NULL,
  manager_justification text,
  ai_coaching_insights jsonb,
  moderation_status text DEFAULT 'pending',
  moderator_decision text,
  moderator_comments text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE one_to_one_moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view their submissions in queue"
  ON one_to_one_moderation_queue
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

CREATE POLICY "Senior managers can moderate queue items"
  ON one_to_one_moderation_queue
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.id = p2.manager_id
      WHERE p2.id = one_to_one_moderation_queue.manager_id AND p1.id = auth.uid()
    )
  );

-- Reminder Configuration table
CREATE TABLE IF NOT EXISTS one_to_one_reminder_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_type text NOT NULL,
  days_before integer DEFAULT 1,
  recipient_type text NOT NULL,
  message_template text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_reminder_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reminder config"
  ON one_to_one_reminder_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "All authenticated users can view reminder config"
  ON one_to_one_reminder_config
  FOR SELECT
  TO authenticated
  USING (true);

-- AI Coaching Configuration table
CREATE TABLE IF NOT EXISTS one_to_one_ai_coaching_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text NOT NULL,
  threshold_value numeric,
  validation_prompt text,
  coaching_message text,
  is_active boolean DEFAULT true,
  min_rating integer,
  max_rating integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_ai_coaching_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI coaching config"
  ON one_to_one_ai_coaching_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "All authenticated users can view AI coaching config"
  ON one_to_one_ai_coaching_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_cycles_manager ON one_to_one_review_cycles(manager_id);
CREATE INDEX IF NOT EXISTS idx_cycle_kpis_cycle ON one_to_one_cycle_kpis(cycle_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_cycle ON one_to_one_scheduled_meetings(cycle_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_employee ON one_to_one_scheduled_meetings(employee_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_manager ON one_to_one_scheduled_meetings(manager_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_meeting ON one_to_one_weekly_checkins(meeting_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_employee ON one_to_one_weekly_checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reviews_meeting ON one_to_one_monthly_reviews(meeting_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reviews_employee ON one_to_one_monthly_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_competency_ratings_review ON one_to_one_competency_ratings(monthly_review_id);
CREATE INDEX IF NOT EXISTS idx_actions_employee ON one_to_one_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_actions_weekly_checkin ON one_to_one_actions(weekly_checkin_id);
CREATE INDEX IF NOT EXISTS idx_actions_monthly_review ON one_to_one_actions(monthly_review_id);
CREATE INDEX IF NOT EXISTS idx_half_year_reviews_employee ON one_to_one_half_year_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_self_assessments_employee ON one_to_one_self_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON one_to_one_moderation_queue(moderation_status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_moderator ON one_to_one_moderation_queue(moderator_id);

-- Insert default reminder configurations
INSERT INTO one_to_one_reminder_config (reminder_type, days_before, recipient_type, message_template) VALUES
('monthly_review_day_before', 1, 'manager', 'Reminder: You have a monthly one-to-one review scheduled tomorrow with {employee_name}.'),
('monthly_review_day_of', 0, 'manager', 'Reminder: You have a monthly one-to-one review scheduled today with {employee_name}.'),
('monthly_review_day_before_employee', 1, 'employee', 'Reminder: You have a monthly one-to-one review scheduled tomorrow. Outstanding actions: {action_list}'),
('half_year_self_assessment', 7, 'employee', 'Please complete your self-assessment for the upcoming half-year review.'),
('half_year_manager_projection', 7, 'manager', 'Half-year review approaching for {employee_name}. Projected ratings based on prior reviews: Performance {perf_rating}, Competency {comp_rating}');

-- Insert default AI coaching rules
INSERT INTO one_to_one_ai_coaching_config (rule_name, rule_type, threshold_value, validation_prompt, coaching_message, min_rating, max_rating) VALUES
('insufficient_comment_length', 'comment_quality', 20, 'Validate if the comment provides specific examples and justification for the rating', 'Your comment appears brief. Please provide specific examples and evidence to justify this rating.', 1, 5),
('high_rating_evidence', 'evidence_required', 50, 'Check if comment contains concrete examples for ratings of 4 or 5', 'Ratings of 4 or 5 require detailed evidence. Please describe specific achievements and behaviors that support this rating.', 4, 5),
('rating_comment_mismatch', 'consistency_check', NULL, 'Analyze if the comment sentiment matches the numerical rating', 'The tone of your comment may not align with the rating. Please review for consistency.', 1, 5),
('improvement_actions_missing', 'action_check', NULL, 'For ratings below 3, check if improvement actions are mentioned', 'For ratings below 3, please include specific improvement actions or support needed.', 1, 2);

/*
  # Skills Matrix & One to One Integration

  1. New Tables
    - `skill_types` - Categorizes skills (Technical, Soft, Product Knowledge)
    - `role_skills` - Maps required skills to job titles and departments
    - `skill_assessment_cycles` - Tracks skill assessment periods
    - `employee_skill_assessments` - Employee self-assessments of skills
    - `manager_skill_assessments` - Manager assessments of employee skills
    - `skill_assessment_discrepancies` - AI-flagged rating gaps between employee/manager
    - `one_to_one_skill_discussions` - Skills discussed during One to One meetings
    - `skill_development_actions` - Coaching actions linked to skills

  2. New Views
    - `employee_skill_summary` - Aggregated skill ratings and trends per employee
    - `team_skill_metrics` - Team-level skill assessment summaries

  3. Security
    - Enable RLS on all new tables
    - Employees can view own skills, managers can view team skills
    - Admins and L&D have full access to configure skill matrices
*/

-- Skill Types table
CREATE TABLE IF NOT EXISTS skill_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE skill_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage skill types"
  ON skill_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can view skill types"
  ON skill_types FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Role Skills mapping table
CREATE TABLE IF NOT EXISTS role_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title TEXT NOT NULL,
  department TEXT NOT NULL,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  skill_type_id UUID NOT NULL REFERENCES skill_types(id) ON DELETE CASCADE,
  proficiency_level_required INTEGER DEFAULT 3,
  is_mandatory BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_title, department, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_role_skills_job_dept ON role_skills(job_title, department);
CREATE INDEX IF NOT EXISTS idx_role_skills_skill ON role_skills(skill_id);

ALTER TABLE role_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage role skills"
  ON role_skills FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can view role skills"
  ON role_skills FOR SELECT
  TO authenticated
  USING (true);

-- Skill Assessment Cycles table
CREATE TABLE IF NOT EXISTS skill_assessment_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_assessment_cycles_status ON skill_assessment_cycles(status);
CREATE INDEX IF NOT EXISTS idx_assessment_cycles_dates ON skill_assessment_cycles(start_date, end_date);

ALTER TABLE skill_assessment_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assessment cycles"
  ON skill_assessment_cycles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can view active cycles"
  ON skill_assessment_cycles FOR SELECT
  TO authenticated
  USING (status IN ('active', 'completed'));

-- Employee Skill Assessments table
CREATE TABLE IF NOT EXISTS employee_skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES skill_assessment_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  self_rating INTEGER NOT NULL,
  self_comment TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_self_rating CHECK (self_rating BETWEEN 1 AND 5),
  UNIQUE(cycle_id, employee_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_assessments_employee ON employee_skill_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_assessments_cycle ON employee_skill_assessments(cycle_id);

ALTER TABLE employee_skill_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can manage own skill assessments"
  ON employee_skill_assessments FOR ALL
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Managers can view team skill assessments"
  ON employee_skill_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin', 'leadership')
    )
    AND EXISTS (
      SELECT 1 FROM profiles emp
      WHERE emp.id = employee_skill_assessments.employee_id
      AND emp.manager_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all skill assessments"
  ON employee_skill_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Manager Skill Assessments table
CREATE TABLE IF NOT EXISTS manager_skill_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES skill_assessment_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  manager_rating INTEGER NOT NULL,
  manager_comment TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_manager_rating CHECK (manager_rating BETWEEN 1 AND 5),
  UNIQUE(cycle_id, employee_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_assessments_employee ON manager_skill_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_manager_assessments_manager ON manager_skill_assessments(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_assessments_cycle ON manager_skill_assessments(cycle_id);

ALTER TABLE manager_skill_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage team skill assessments"
  ON manager_skill_assessments FOR ALL
  TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Employees can view own manager assessments"
  ON manager_skill_assessments FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Admins can view all manager assessments"
  ON manager_skill_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Skill Assessment Discrepancies table (AI-flagged)
CREATE TABLE IF NOT EXISTS skill_assessment_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES skill_assessment_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  employee_rating INTEGER NOT NULL,
  manager_rating INTEGER NOT NULL,
  rating_gap INTEGER NOT NULL,
  ai_analysis TEXT,
  ai_discussion_prompts JSONB,
  flagged_for_discussion BOOLEAN DEFAULT false,
  discussed_in_meeting_id UUID REFERENCES one_to_one_monthly_reviews(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cycle_id, employee_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_discrepancies_employee ON skill_assessment_discrepancies(employee_id);
CREATE INDEX IF NOT EXISTS idx_discrepancies_flagged ON skill_assessment_discrepancies(flagged_for_discussion) WHERE flagged_for_discussion = true;

ALTER TABLE skill_assessment_discrepancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view team discrepancies"
  ON skill_assessment_discrepancies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles emp
      WHERE emp.id = skill_assessment_discrepancies.employee_id
      AND emp.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update team discrepancies"
  ON skill_assessment_discrepancies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles emp
      WHERE emp.id = skill_assessment_discrepancies.employee_id
      AND emp.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles emp
      WHERE emp.id = skill_assessment_discrepancies.employee_id
      AND emp.manager_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view own discrepancies"
  ON skill_assessment_discrepancies FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Admins can manage all discrepancies"
  ON skill_assessment_discrepancies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- One to One Skill Discussions table
CREATE TABLE IF NOT EXISTS one_to_one_skill_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_review_id UUID NOT NULL REFERENCES one_to_one_monthly_reviews(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  discrepancy_id UUID REFERENCES skill_assessment_discrepancies(id) ON DELETE SET NULL,
  discussion_notes TEXT NOT NULL,
  manager_notes TEXT,
  coaching_actions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_discussions_review ON one_to_one_skill_discussions(monthly_review_id);
CREATE INDEX IF NOT EXISTS idx_skill_discussions_skill ON one_to_one_skill_discussions(skill_id);

ALTER TABLE one_to_one_skill_discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage skill discussions"
  ON one_to_one_skill_discussions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews r
      WHERE r.id = one_to_one_skill_discussions.monthly_review_id
      AND r.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews r
      WHERE r.id = one_to_one_skill_discussions.monthly_review_id
      AND r.manager_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view own skill discussions"
  ON one_to_one_skill_discussions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews r
      WHERE r.id = one_to_one_skill_discussions.monthly_review_id
      AND r.employee_id = auth.uid()
    )
  );

-- Skill Development Actions table
CREATE TABLE IF NOT EXISTS skill_development_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  discussion_id UUID REFERENCES one_to_one_skill_discussions(id) ON DELETE SET NULL,
  action_description TEXT NOT NULL,
  action_type TEXT DEFAULT 'training',
  target_date DATE,
  status TEXT DEFAULT 'open',
  completion_notes TEXT,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_action_type CHECK (action_type IN ('training', 'mentoring', 'practice', 'project', 'other')),
  CONSTRAINT valid_action_status CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_dev_actions_employee ON skill_development_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_dev_actions_status ON skill_development_actions(status);
CREATE INDEX IF NOT EXISTS idx_dev_actions_skill ON skill_development_actions(skill_id);

ALTER TABLE skill_development_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own development actions"
  ON skill_development_actions FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can manage team development actions"
  ON skill_development_actions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles emp
      WHERE emp.id = skill_development_actions.employee_id
      AND emp.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles emp
      WHERE emp.id = skill_development_actions.employee_id
      AND emp.manager_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all development actions"
  ON skill_development_actions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Seed default skill types
INSERT INTO skill_types (name, description, icon, sort_order) VALUES
  ('Technical', 'Technical skills and software proficiency', '💻', 1),
  ('Soft Skills', 'Communication, leadership, and interpersonal skills', '🤝', 2),
  ('Product Knowledge', 'Domain and product-specific knowledge', '📚', 3)
ON CONFLICT (name) DO NOTHING;

-- Create view: Employee Skill Summary (simplified initial version)
CREATE OR REPLACE VIEW employee_skill_summary AS
SELECT
  esa.employee_id,
  esa.skill_id,
  s.name AS skill_name,
  st.name AS skill_type,
  st.icon AS skill_type_icon,
  rs.proficiency_level_required AS target_level,
  rs.is_mandatory,
  esa.self_rating AS latest_self_rating,
  msa.manager_rating AS latest_manager_rating,
  COALESCE(msa.manager_rating, esa.self_rating) AS current_rating,
  COALESCE(msa.completed_at, esa.completed_at) AS last_assessed_at,
  sac.status AS cycle_status,
  d.flagged_for_discussion AS has_discrepancy,
  d.ai_analysis AS discrepancy_analysis
FROM employee_skill_assessments esa
JOIN skills s ON s.id = esa.skill_id
JOIN profiles p ON p.id = esa.employee_id
JOIN skill_assessment_cycles sac ON sac.id = esa.cycle_id
LEFT JOIN manager_skill_assessments msa ON 
  msa.cycle_id = esa.cycle_id AND 
  msa.employee_id = esa.employee_id AND 
  msa.skill_id = esa.skill_id
LEFT JOIN role_skills rs ON 
  rs.skill_id = esa.skill_id AND
  rs.job_title = p.job_title AND
  rs.department = p.department
LEFT JOIN skill_types st ON st.id = rs.skill_type_id
LEFT JOIN skill_assessment_discrepancies d ON 
  d.cycle_id = esa.cycle_id AND 
  d.employee_id = esa.employee_id AND 
  d.skill_id = esa.skill_id;

-- Create view: Team Skill Metrics
CREATE OR REPLACE VIEW team_skill_metrics AS
SELECT
  p.manager_id,
  s.name AS skill_name,
  st.name AS skill_type,
  COUNT(DISTINCT ess.employee_id) AS total_employees_assessed,
  ROUND(AVG(ess.current_rating), 2) AS team_average_rating,
  ROUND(AVG(ess.target_level), 2) AS team_target_level,
  COUNT(*) FILTER (WHERE ess.has_discrepancy = true) AS total_discrepancies,
  COUNT(DISTINCT sda.id) FILTER (WHERE sda.status = 'open') AS outstanding_development_actions
FROM employee_skill_summary ess
JOIN profiles p ON p.id = ess.employee_id
JOIN skills s ON s.id = ess.skill_id
LEFT JOIN skill_types st ON st.name = ess.skill_type
LEFT JOIN skill_development_actions sda ON 
  sda.employee_id = ess.employee_id AND 
  sda.skill_id = ess.skill_id
WHERE p.manager_id IS NOT NULL
GROUP BY p.manager_id, s.name, st.name;

/*
  # Skills & Competencies Assessment System

  1. New Tables
    - `skill_rating_scale` - Defines rating levels (Not Trained, Trained, Developing, Good, Competent)
    - `department_skills_matrix` - Department and role-based skills matrix configuration
    - `skills_assessment_workflow` - Tracks assessment cycle workflow status
    - `employee_skills_assessment_responses` - Employee self-assessment responses
    - `manager_skills_assessment_responses` - Manager assessment responses
    - `assessment_approvals` - Manager approval/override workflow
    - `assessment_notifications` - Tracks notifications sent to employees

  2. Views
    - `team_skills_matrix_view` - Displays team skills matrix with latest assessments
    - `assessment_cycle_metrics` - Dashboard metrics for assessment cycles

  3. Security
    - Admin can create matrices and trigger assessments
    - Managers can complete and approve team assessments
    - Employees can complete own assessments only
    - RLS policies for all access control
*/

-- Skill Rating Scale
CREATE TABLE IF NOT EXISTS skill_rating_scale (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_name TEXT NOT NULL UNIQUE,
  rating_value INTEGER NOT NULL UNIQUE,
  description TEXT,
  color_code TEXT DEFAULT '#gray',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE skill_rating_scale ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rating scale"
  ON skill_rating_scale FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage rating scale"
  ON skill_rating_scale FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Department Skills Matrix
CREATE TABLE IF NOT EXISTS department_skills_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  job_family_id UUID REFERENCES job_families(id) ON DELETE SET NULL,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  skill_type_id UUID NOT NULL REFERENCES skill_types(id) ON DELETE CASCADE,
  is_mandatory BOOLEAN DEFAULT true,
  is_role_relevant BOOLEAN DEFAULT true,
  target_rating_value INTEGER DEFAULT 3,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(department, job_title, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_dept_matrix_dept_title ON department_skills_matrix(department, job_title);
CREATE INDEX IF NOT EXISTS idx_dept_matrix_skill ON department_skills_matrix(skill_id);

ALTER TABLE department_skills_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage department skills matrix"
  ON department_skills_matrix FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Managers can view team matrix"
  ON department_skills_matrix FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin', 'leadership')
    )
  );

CREATE POLICY "Employees can view own matrix"
  ON department_skills_matrix FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.department = department_skills_matrix.department
      AND profiles.job_title = department_skills_matrix.job_title
    )
  );

-- Skills Assessment Workflow
CREATE TABLE IF NOT EXISTS skills_assessment_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES skill_assessment_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  employee_status TEXT DEFAULT 'pending',
  manager_status TEXT DEFAULT 'pending',
  has_discrepancies BOOLEAN DEFAULT false,
  discrepancy_count INTEGER DEFAULT 0,
  approval_status TEXT DEFAULT 'pending',
  employee_completed_at TIMESTAMPTZ,
  manager_completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  employee_notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_employee_status CHECK (employee_status IN ('pending', 'in_progress', 'completed', 'overdue')),
  CONSTRAINT valid_manager_status CHECK (manager_status IN ('pending', 'in_progress', 'completed', 'overdue')),
  CONSTRAINT valid_approval_status CHECK (approval_status IN ('pending', 'approved', 'changes_made')),
  UNIQUE(cycle_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_workflow_cycle ON skills_assessment_workflow(cycle_id);
CREATE INDEX IF NOT EXISTS idx_workflow_employee ON skills_assessment_workflow(employee_id);
CREATE INDEX IF NOT EXISTS idx_workflow_manager ON skills_assessment_workflow(manager_id);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON skills_assessment_workflow(employee_status, manager_status);

ALTER TABLE skills_assessment_workflow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own workflow"
  ON skills_assessment_workflow FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can view team workflow"
  ON skills_assessment_workflow FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'leadership')
    )
  );

CREATE POLICY "Managers can update team workflow"
  ON skills_assessment_workflow FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    manager_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all workflows"
  ON skills_assessment_workflow FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Employee Skills Assessment Responses
CREATE TABLE IF NOT EXISTS employee_skills_assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES skills_assessment_workflow(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  matrix_id UUID NOT NULL REFERENCES department_skills_matrix(id) ON DELETE CASCADE,
  rating_value INTEGER NOT NULL,
  rating_name TEXT NOT NULL,
  comments TEXT,
  is_greyed_out BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_rating CHECK (rating_value BETWEEN 1 AND 5),
  UNIQUE(workflow_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_responses_workflow ON employee_skills_assessment_responses(workflow_id);
CREATE INDEX IF NOT EXISTS idx_employee_responses_employee ON employee_skills_assessment_responses(employee_id);

ALTER TABLE employee_skills_assessment_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can manage own responses"
  ON employee_skills_assessment_responses FOR ALL
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Managers can view team responses"
  ON employee_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM skills_assessment_workflow w
      WHERE w.id = employee_skills_assessment_responses.workflow_id
      AND w.manager_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all responses"
  ON employee_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Manager Skills Assessment Responses
CREATE TABLE IF NOT EXISTS manager_skills_assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES skills_assessment_workflow(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  matrix_id UUID NOT NULL REFERENCES department_skills_matrix(id) ON DELETE CASCADE,
  rating_value INTEGER NOT NULL,
  rating_name TEXT NOT NULL,
  comments TEXT,
  is_greyed_out BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_manager_rating CHECK (rating_value BETWEEN 1 AND 5),
  UNIQUE(workflow_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_responses_workflow ON manager_skills_assessment_responses(workflow_id);
CREATE INDEX IF NOT EXISTS idx_manager_responses_manager ON manager_skills_assessment_responses(manager_id);

ALTER TABLE manager_skills_assessment_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage team responses"
  ON manager_skills_assessment_responses FOR ALL
  TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Employees can view own manager responses"
  ON manager_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Admins can view all manager responses"
  ON manager_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Assessment Approvals
CREATE TABLE IF NOT EXISTS assessment_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES skills_assessment_workflow(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  employee_rating INTEGER NOT NULL,
  manager_rating INTEGER NOT NULL,
  has_discrepancy BOOLEAN DEFAULT false,
  approved_rating INTEGER NOT NULL,
  approval_action TEXT NOT NULL,
  manager_override_reason TEXT,
  ai_discrepancy_analysis TEXT,
  approved_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  approved_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_approval_action CHECK (approval_action IN ('approved_employee', 'approved_manager', 'override')),
  UNIQUE(workflow_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_approvals_workflow ON assessment_approvals(workflow_id);

ALTER TABLE assessment_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage approvals"
  ON assessment_approvals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM skills_assessment_workflow w
      WHERE w.id = assessment_approvals.workflow_id
      AND w.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM skills_assessment_workflow w
      WHERE w.id = assessment_approvals.workflow_id
      AND w.manager_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view own approvals"
  ON assessment_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM skills_assessment_workflow w
      WHERE w.id = assessment_approvals.workflow_id
      AND w.employee_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all approvals"
  ON assessment_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Assessment Notifications
CREATE TABLE IF NOT EXISTS assessment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES skills_assessment_workflow(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_notification_type CHECK (notification_type IN ('assessment_assigned', 'manager_completed', 'approved', 'changes_made', 'overdue'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON assessment_notifications(recipient_id, is_read);

ALTER TABLE assessment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON assessment_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON assessment_notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON assessment_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Seed rating scale
INSERT INTO skill_rating_scale (rating_name, rating_value, description, color_code, sort_order) VALUES
  ('Not Trained', 1, 'No training or experience with this skill', '#ef4444', 1),
  ('Trained', 2, 'Has received training but limited practical experience', '#f59e0b', 2),
  ('Developing', 3, 'Actively developing proficiency through practice', '#eab308', 3),
  ('Good', 4, 'Demonstrates good proficiency and can work independently', '#3b82f6', 4),
  ('Competent', 5, 'Expert level proficiency, can mentor others', '#10b981', 5)
ON CONFLICT (rating_name) DO NOTHING;

-- View: Team Skills Matrix
CREATE OR REPLACE VIEW team_skills_matrix_view AS
SELECT
  p.id AS employee_id,
  p.full_name AS employee_name,
  p.job_title,
  p.department,
  p.manager_id,
  s.id AS skill_id,
  s.name AS skill_name,
  st.name AS skill_type,
  dsm.is_mandatory,
  dsm.is_role_relevant,
  dsm.target_rating_value,
  COALESCE(aa.approved_rating, msr.rating_value, esr.rating_value) AS current_rating,
  COALESCE(aa.approved_rating, msr.rating_value, esr.rating_value) AS average_rating,
  w.employee_status,
  w.manager_status,
  w.has_discrepancies,
  w.employee_completed_at AS last_assessment_date,
  sac.status AS cycle_status,
  sac.name AS cycle_name
FROM profiles p
JOIN department_skills_matrix dsm ON 
  dsm.department = p.department AND 
  dsm.job_title = p.job_title
JOIN skills s ON s.id = dsm.skill_id
LEFT JOIN skill_types st ON st.id = dsm.skill_type_id
LEFT JOIN skills_assessment_workflow w ON 
  w.employee_id = p.id AND
  w.cycle_id IN (
    SELECT id FROM skill_assessment_cycles
    WHERE status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  )
LEFT JOIN skill_assessment_cycles sac ON sac.id = w.cycle_id
LEFT JOIN employee_skills_assessment_responses esr ON 
  esr.workflow_id = w.id AND
  esr.skill_id = s.id
LEFT JOIN manager_skills_assessment_responses msr ON 
  msr.workflow_id = w.id AND
  msr.skill_id = s.id
LEFT JOIN assessment_approvals aa ON 
  aa.workflow_id = w.id AND
  aa.skill_id = s.id
WHERE p.active = true;

-- View: Assessment Cycle Metrics
CREATE OR REPLACE VIEW assessment_cycle_metrics AS
SELECT
  sac.id AS cycle_id,
  sac.name AS cycle_name,
  sac.status AS cycle_status,
  sac.start_date,
  sac.end_date,
  COUNT(DISTINCT w.employee_id) AS total_assigned,
  COUNT(DISTINCT w.employee_id) FILTER (WHERE w.employee_status = 'completed') AS employee_completed,
  COUNT(DISTINCT w.employee_id) FILTER (WHERE w.manager_status = 'completed') AS manager_completed,
  COUNT(DISTINCT w.employee_id) FILTER (WHERE w.employee_status = 'overdue' OR w.manager_status = 'overdue') AS overdue,
  COUNT(DISTINCT w.employee_id) FILTER (WHERE w.employee_status = 'in_progress') AS in_progress,
  COUNT(DISTINCT w.employee_id) FILTER (WHERE w.has_discrepancies = true) AS total_discrepancies,
  ROUND(AVG(w.discrepancy_count), 2) AS avg_discrepancies_per_employee,
  ROUND(
    (COUNT(DISTINCT w.employee_id) FILTER (WHERE w.employee_status = 'completed' AND w.manager_status = 'completed')::NUMERIC / 
    NULLIF(COUNT(DISTINCT w.employee_id), 0) * 100), 
    2
  ) AS completion_percentage
FROM skill_assessment_cycles sac
LEFT JOIN skills_assessment_workflow w ON w.cycle_id = sac.id
GROUP BY sac.id, sac.name, sac.status, sac.start_date, sac.end_date;

/*
  # Extend Career System for MART-I AI Quiz Workflow

  1. New Tables
    - `career_quiz_sessions` - Tracks 4-step quiz workflow (Goal, Reality, Options, Way Forward)
    - `career_external_qualifications` - External qualifications/experience entered by employee
    - `career_skill_self_ratings` - Employee self-ratings for skills (5-level scale)
    - `career_profiles` - Career CV/profile builder with internal + external data
    - `marti_career_coaching_logs` - MART-I coaching interactions and recommendations

  2. Changes to Existing Tables
    - Add columns to career_plans for quiz session linking and workflow tracking

  3. Security
    - RLS enabled on all new tables
    - Employees: view/edit own data
    - Managers: view direct reports
    - Admin/L&D: view all for reporting
*/

-- Extend career_plans table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'quiz_session_id'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN quiz_session_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'learning_style'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN learning_style text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'weekly_hours_commitment'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN weekly_hours_commitment numeric(4,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'career_plans' AND column_name = 'conversation_scheduled_at'
  ) THEN
    ALTER TABLE career_plans ADD COLUMN conversation_scheduled_at timestamptz;
  END IF;
END $$;

-- Career Quiz Sessions (4-step workflow)
CREATE TABLE IF NOT EXISTS career_quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  goal_role_id uuid REFERENCES job_titles(id),
  goal_role_custom_title text,

  reality_assessment jsonb DEFAULT '{}'::jsonb,
  current_gaps jsonb DEFAULT '[]'::jsonb,
  external_qualifications_text text,
  external_experience_text text,
  external_skills_text text,

  skill_ratings jsonb DEFAULT '{}'::jsonb,
  learning_style text,
  weekly_hours_commitment numeric(4,2),
  recommended_modules jsonb DEFAULT '[]'::jsonb,

  action_plan text,
  internal_criteria_met boolean DEFAULT false,

  current_step integer DEFAULT 1 CHECK (current_step BETWEEN 1 AND 4),
  quiz_status text DEFAULT 'draft' CHECK (quiz_status IN ('draft', 'submitted', 'manager_review', 'active', 'completed', 'discarded')),
  submitted_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Career External Qualifications
CREATE TABLE IF NOT EXISTS career_external_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_session_id uuid REFERENCES career_quiz_sessions(id) ON DELETE CASCADE,

  qualification_type text NOT NULL CHECK (qualification_type IN ('education', 'certification', 'experience', 'skill')),
  title text NOT NULL,
  description text,
  institution text,
  completion_date date,

  created_at timestamptz DEFAULT now()
);

-- Career Skill Self-Ratings
CREATE TABLE IF NOT EXISTS career_skill_self_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_session_id uuid NOT NULL REFERENCES career_quiz_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES skills(id) ON DELETE CASCADE,
  skill_name text NOT NULL,

  rating text NOT NULL CHECK (rating IN ('not_trained', 'trained', 'developing', 'good', 'competent')),
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(quiz_session_id, skill_id)
);

-- Career Profiles (CV Builder)
CREATE TABLE IF NOT EXISTS career_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  current_role_title text,
  current_department text,
  years_in_current_role numeric(4,2),
  previous_roles jsonb DEFAULT '[]'::jsonb,
  skills_summary jsonb DEFAULT '{}'::jsonb,
  competencies_summary jsonb DEFAULT '{}'::jsonb,
  performance_scores jsonb DEFAULT '{}'::jsonb,

  external_qualifications jsonb DEFAULT '[]'::jsonb,
  external_experience jsonb DEFAULT '[]'::jsonb,
  external_skills jsonb DEFAULT '[]'::jsonb,

  career_goals text,
  preferred_pathways jsonb DEFAULT '[]'::jsonb,

  last_updated timestamptz DEFAULT now(),
  profile_completeness numeric(3,0) DEFAULT 0 CHECK (profile_completeness BETWEEN 0 AND 100),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id)
);

-- MART-I Career Coaching Logs
CREATE TABLE IF NOT EXISTS marti_career_coaching_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quiz_session_id uuid REFERENCES career_quiz_sessions(id) ON DELETE CASCADE,

  coaching_type text NOT NULL CHECK (coaching_type IN ('gap_analysis', 'recommendation', 'reality_check', 'action_plan', 'general_coaching')),

  prompt_text text NOT NULL,
  ai_response text NOT NULL,

  context_data jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_career_quiz_sessions_user ON career_quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_career_quiz_sessions_status ON career_quiz_sessions(quiz_status);
CREATE INDEX IF NOT EXISTS idx_career_external_quals_user ON career_external_qualifications(user_id);
CREATE INDEX IF NOT EXISTS idx_career_skill_ratings_session ON career_skill_self_ratings(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_career_profiles_user ON career_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_marti_coaching_user ON marti_career_coaching_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_marti_coaching_session ON marti_career_coaching_logs(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_quiz_session ON career_plans(quiz_session_id);

-- Enable RLS
ALTER TABLE career_quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_external_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_skill_self_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marti_career_coaching_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Career Quiz Sessions
CREATE POLICY "Users can view own quiz sessions"
  ON career_quiz_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own quiz sessions"
  ON career_quiz_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz sessions"
  ON career_quiz_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view team quiz sessions"
  ON career_quiz_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_quiz_sessions.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view all quiz sessions"
  ON career_quiz_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'leadership')
    )
  );

-- RLS: External Qualifications
CREATE POLICY "Users can manage own qualifications"
  ON career_external_qualifications FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view team qualifications"
  ON career_external_qualifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_external_qualifications.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- RLS: Skill Self-Ratings
CREATE POLICY "Users can manage own skill ratings"
  ON career_skill_self_ratings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view team skill ratings"
  ON career_skill_self_ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_skill_self_ratings.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- RLS: Career Profiles
CREATE POLICY "Users can manage own profile"
  ON career_profiles FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view team profiles"
  ON career_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = career_profiles.user_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view all profiles"
  ON career_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'leadership')
    )
  );

-- RLS: MART-I Coaching Logs
CREATE POLICY "Users can view own coaching logs"
  ON marti_career_coaching_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own coaching logs"
  ON marti_career_coaching_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all coaching logs"
  ON marti_career_coaching_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'leadership')
    )
  );

-- Function: Create default career profile
CREATE OR REPLACE FUNCTION create_default_career_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO career_profiles (
    user_id,
    current_role_title,
    current_department,
    profile_completeness
  )
  VALUES (
    NEW.id,
    NEW.job_title,
    NEW.department,
    25
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_career_profile_on_user_creation ON profiles;
CREATE TRIGGER create_career_profile_on_user_creation
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_career_profile();

-- Function: Career plan metrics for dashboards
CREATE OR REPLACE FUNCTION get_career_plan_metrics(dept_filter text DEFAULT NULL)
RETURNS TABLE (
  total_quizzes bigint,
  draft_plans bigint,
  sent_to_manager bigint,
  manager_approved bigint,
  admin_approved bigint,
  avg_completion_time interval
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT cqs.id)::bigint AS total_quizzes,
    COUNT(DISTINCT CASE WHEN cp.status = 'draft' THEN cp.id END)::bigint AS draft_plans,
    COUNT(DISTINCT CASE WHEN cp.status = 'sent_to_manager' THEN cp.id END)::bigint AS sent_to_manager,
    COUNT(DISTINCT CASE WHEN cp.status = 'manager_approved' THEN cp.id END)::bigint AS manager_approved,
    COUNT(DISTINCT CASE WHEN cp.status = 'admin_approved' THEN cp.id END)::bigint AS admin_approved,
    AVG(CASE WHEN cp.admin_reviewed_at IS NOT NULL THEN cp.admin_reviewed_at - cp.created_at END) AS avg_completion_time
  FROM career_quiz_sessions cqs
  LEFT JOIN career_plans cp ON cp.quiz_session_id = cqs.id
  LEFT JOIN profiles p ON p.id = cqs.user_id
  WHERE dept_filter IS NULL OR p.department = dept_filter;
END;
$$;
/*
  # Add Missing Foreign Key Indexes - Security Fix

  1. Purpose
    - Add indexes to all foreign key columns that are missing covering indexes
    - Improves query performance and prevents suboptimal execution plans
    - Addresses security advisor warnings about unindexed foreign keys

  2. Changes
    - Creates indexes on 100+ foreign key columns across the database
    - All indexes use IF NOT EXISTS to prevent errors on re-run
    - Indexes follow naming convention: idx_tablename_columnname_fkey
*/

-- assessment_approvals
CREATE INDEX IF NOT EXISTS idx_assessment_approvals_approved_by_fkey ON assessment_approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_assessment_approvals_skill_id_fkey ON assessment_approvals(skill_id);

-- assessment_notifications
CREATE INDEX IF NOT EXISTS idx_assessment_notifications_workflow_id_fkey ON assessment_notifications(workflow_id);

-- career_external_qualifications
CREATE INDEX IF NOT EXISTS idx_career_external_qualifications_quiz_session_id_fkey ON career_external_qualifications(quiz_session_id);

-- career_plans
CREATE INDEX IF NOT EXISTS idx_career_plans_user_id_fkey ON career_plans(user_id);

-- career_quiz_sessions
CREATE INDEX IF NOT EXISTS idx_career_quiz_sessions_goal_role_id_fkey ON career_quiz_sessions(goal_role_id);

-- career_skill_self_ratings
CREATE INDEX IF NOT EXISTS idx_career_skill_self_ratings_skill_id_fkey ON career_skill_self_ratings(skill_id);
CREATE INDEX IF NOT EXISTS idx_career_skill_self_ratings_user_id_fkey ON career_skill_self_ratings(user_id);

-- department_skills_matrix
CREATE INDEX IF NOT EXISTS idx_department_skills_matrix_created_by_fkey ON department_skills_matrix(created_by);
CREATE INDEX IF NOT EXISTS idx_department_skills_matrix_job_family_id_fkey ON department_skills_matrix(job_family_id);
CREATE INDEX IF NOT EXISTS idx_department_skills_matrix_skill_type_id_fkey ON department_skills_matrix(skill_type_id);

-- department_strategies
CREATE INDEX IF NOT EXISTS idx_department_strategies_creator_id_fkey ON department_strategies(creator_id);
CREATE INDEX IF NOT EXISTS idx_department_strategies_focus_area_id_fkey ON department_strategies(focus_area_id);

-- department_strategy_approvals
CREATE INDEX IF NOT EXISTS idx_department_strategy_approvals_dept_strategy_id_fkey ON department_strategy_approvals(department_strategy_id);

-- department_strategy_kpis
CREATE INDEX IF NOT EXISTS idx_department_strategy_kpis_dept_strategy_id_fkey ON department_strategy_kpis(department_strategy_id);

-- employee_skill_assessments
CREATE INDEX IF NOT EXISTS idx_employee_skill_assessments_skill_id_fkey ON employee_skill_assessments(skill_id);

-- employee_skills_assessment_responses
CREATE INDEX IF NOT EXISTS idx_employee_skills_assessment_responses_matrix_id_fkey ON employee_skills_assessment_responses(matrix_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_assessment_responses_skill_id_fkey ON employee_skills_assessment_responses(skill_id);

-- executive_strategies
CREATE INDEX IF NOT EXISTS idx_executive_strategies_creator_id_fkey ON executive_strategies(creator_id);

-- goal_milestones
CREATE INDEX IF NOT EXISTS idx_goal_milestones_assigned_to_id_fkey ON goal_milestones(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id_fkey ON goal_milestones(goal_id);

-- half_year_review_summaries
CREATE INDEX IF NOT EXISTS idx_half_year_review_summaries_meeting_id_fkey ON half_year_review_summaries(meeting_id);

-- job_families
CREATE INDEX IF NOT EXISTS idx_job_families_job_title_id_fkey ON job_families(job_title_id);

-- job_titles
CREATE INDEX IF NOT EXISTS idx_job_titles_department_id_fkey ON job_titles(department_id);

-- manager_skill_assessments
CREATE INDEX IF NOT EXISTS idx_manager_skill_assessments_skill_id_fkey ON manager_skill_assessments(skill_id);

-- manager_skills_assessment_responses
CREATE INDEX IF NOT EXISTS idx_manager_skills_assessment_responses_employee_id_fkey ON manager_skills_assessment_responses(employee_id);
CREATE INDEX IF NOT EXISTS idx_manager_skills_assessment_responses_matrix_id_fkey ON manager_skills_assessment_responses(matrix_id);
CREATE INDEX IF NOT EXISTS idx_manager_skills_assessment_responses_skill_id_fkey ON manager_skills_assessment_responses(skill_id);

-- one_to_one_actions
CREATE INDEX IF NOT EXISTS idx_one_to_one_actions_action_owner_fkey ON one_to_one_actions(action_owner);
CREATE INDEX IF NOT EXISTS idx_one_to_one_actions_manager_id_fkey ON one_to_one_actions(manager_id);

-- one_to_one_competency_ratings
CREATE INDEX IF NOT EXISTS idx_one_to_one_competency_ratings_competency_id_fkey ON one_to_one_competency_ratings(competency_id);

-- one_to_one_half_year_reviews
CREATE INDEX IF NOT EXISTS idx_one_to_one_half_year_reviews_manager_id_fkey ON one_to_one_half_year_reviews(manager_id);

-- one_to_one_moderation_queue
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_comp_rating_id_fkey ON one_to_one_moderation_queue(competency_rating_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_employee_id_fkey ON one_to_one_moderation_queue(employee_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_manager_id_fkey ON one_to_one_moderation_queue(manager_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_monthly_review_id_fkey ON one_to_one_moderation_queue(monthly_review_id);

-- one_to_one_monthly_reviews
CREATE INDEX IF NOT EXISTS idx_one_to_one_monthly_reviews_manager_id_fkey ON one_to_one_monthly_reviews(manager_id);

-- one_to_one_review_cycles
CREATE INDEX IF NOT EXISTS idx_one_to_one_review_cycles_manager_id_fkey ON one_to_one_review_cycles(manager_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_review_cycles_strategic_goal_id_fkey ON one_to_one_review_cycles(strategic_goal_id);

-- one_to_one_self_assessments
CREATE INDEX IF NOT EXISTS idx_one_to_one_self_assessments_half_year_review_id_fkey ON one_to_one_self_assessments(half_year_review_id);

-- one_to_one_skill_discussions
CREATE INDEX IF NOT EXISTS idx_one_to_one_skill_discussions_discrepancy_id_fkey ON one_to_one_skill_discussions(discrepancy_id);

-- one_to_one_weekly_checkins
CREATE INDEX IF NOT EXISTS idx_one_to_one_weekly_checkins_manager_id_fkey ON one_to_one_weekly_checkins(manager_id);

-- performance_ratings
CREATE INDEX IF NOT EXISTS idx_performance_ratings_review_meeting_id_fkey ON performance_ratings(review_meeting_id);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_job_title_id_fkey ON profiles(job_title_id);

-- review_competency_assessments
CREATE INDEX IF NOT EXISTS idx_review_competency_assessments_competency_id_fkey ON review_competency_assessments(competency_id);

-- review_competency_ratings
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_competency_id_fkey ON review_competency_ratings(competency_id);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_employee_id_fkey ON review_competency_ratings(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_review_id_fkey ON review_competency_ratings(review_id);

-- review_cycles
CREATE INDEX IF NOT EXISTS idx_review_cycles_strategy_id_fkey ON review_cycles(strategy_id);

-- review_goal_progress
CREATE INDEX IF NOT EXISTS idx_review_goal_progress_employee_id_fkey ON review_goal_progress(employee_id);

-- review_half_year_assessments
CREATE INDEX IF NOT EXISTS idx_review_half_year_assessments_employee_id_fkey ON review_half_year_assessments(employee_id);

-- review_instances
CREATE INDEX IF NOT EXISTS idx_review_instances_employee_id_fkey ON review_instances(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_instances_manager_id_fkey ON review_instances(manager_id);

-- review_kpi_templates
CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_created_by_fkey ON review_kpi_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_job_family_id_fkey ON review_kpi_templates(job_family_id);

-- review_kpis
CREATE INDEX IF NOT EXISTS idx_review_kpis_created_by_fkey ON review_kpis(created_by);
CREATE INDEX IF NOT EXISTS idx_review_kpis_employee_id_fkey ON review_kpis(employee_id);

-- review_meetings
CREATE INDEX IF NOT EXISTS idx_review_meetings_employee_id_fkey ON review_meetings(employee_id);

-- review_monthly_competency_scores
CREATE INDEX IF NOT EXISTS idx_review_monthly_competency_scores_employee_id_fkey ON review_monthly_competency_scores(employee_id);

-- review_monthly_sessions
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_employee_id_fkey ON review_monthly_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_manager_id_fkey ON review_monthly_sessions(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_review_template_id_fkey ON review_monthly_sessions(review_template_id);

-- review_notifications
CREATE INDEX IF NOT EXISTS idx_review_notifications_recipient_id_fkey ON review_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_review_notifications_sender_id_fkey ON review_notifications(sender_id);

-- review_rating_approvals
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_approver_id_fkey ON review_rating_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_comp_rating_id_fkey ON review_rating_approvals(competency_rating_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_employee_id_fkey ON review_rating_approvals(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_manager_id_fkey ON review_rating_approvals(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_rating_approvals_review_id_fkey ON review_rating_approvals(review_id);

-- review_six_month_performance
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_approved_by_fkey ON review_six_month_performance(approved_by);
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_employee_id_fkey ON review_six_month_performance(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_manager_id_fkey ON review_six_month_performance(manager_id);

-- review_template_kpis
CREATE INDEX IF NOT EXISTS idx_review_template_kpis_template_id_fkey ON review_template_kpis(template_id);

-- review_templates
CREATE INDEX IF NOT EXISTS idx_review_templates_dept_strategy_id_fkey ON review_templates(department_strategy_id);

-- review_weekly_checkins
CREATE INDEX IF NOT EXISTS idx_review_weekly_checkins_employee_id_fkey ON review_weekly_checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_weekly_checkins_manager_id_fkey ON review_weekly_checkins(manager_id);

-- review_weekly_kpi_ratings
CREATE INDEX IF NOT EXISTS idx_review_weekly_kpi_ratings_employee_id_fkey ON review_weekly_kpi_ratings(employee_id);

-- review_weekly_summaries
CREATE INDEX IF NOT EXISTS idx_review_weekly_summaries_employee_id_fkey ON review_weekly_summaries(employee_id);

-- role_skills
CREATE INDEX IF NOT EXISTS idx_role_skills_skill_type_id_fkey ON role_skills(skill_type_id);

-- skill_assessment_cycles
CREATE INDEX IF NOT EXISTS idx_skill_assessment_cycles_created_by_fkey ON skill_assessment_cycles(created_by);

-- skill_assessment_discrepancies
CREATE INDEX IF NOT EXISTS idx_skill_assessment_discrepancies_meeting_id_fkey ON skill_assessment_discrepancies(discussed_in_meeting_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessment_discrepancies_skill_id_fkey ON skill_assessment_discrepancies(skill_id);

-- skill_development_actions
CREATE INDEX IF NOT EXISTS idx_skill_development_actions_created_by_fkey ON skill_development_actions(created_by);
CREATE INDEX IF NOT EXISTS idx_skill_development_actions_discussion_id_fkey ON skill_development_actions(discussion_id);

-- skills_assessment_workflow
CREATE INDEX IF NOT EXISTS idx_skills_assessment_workflow_approved_by_fkey ON skills_assessment_workflow(approved_by);

-- standalone_strategy_actions
CREATE INDEX IF NOT EXISTS idx_standalone_strategy_actions_assigned_to_fkey ON standalone_strategy_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_standalone_strategy_actions_strategy_id_fkey ON standalone_strategy_actions(standalone_strategy_id);

-- strategic_goals
CREATE INDEX IF NOT EXISTS idx_strategic_goals_department_id_fkey ON strategic_goals(department_id);

-- strategies (uses parent_strategy_id not parent)
CREATE INDEX IF NOT EXISTS idx_strategies_creator_id_fkey ON strategies(creator_id);
CREATE INDEX IF NOT EXISTS idx_strategies_parent_strategy_id_fkey ON strategies(parent_strategy_id);

-- strategy_actions
CREATE INDEX IF NOT EXISTS idx_strategy_actions_assigned_to_fkey ON strategy_actions(assigned_to);

-- strategy_approvals
CREATE INDEX IF NOT EXISTS idx_strategy_approvals_approver_id_fkey ON strategy_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_strategy_approvals_dept_strategy_id_fkey ON strategy_approvals(department_strategy_id);

-- strategy_focus_areas_v2
CREATE INDEX IF NOT EXISTS idx_strategy_focus_areas_v2_strategy_id_fkey ON strategy_focus_areas_v2(strategy_id);

-- strategy_kpis
CREATE INDEX IF NOT EXISTS idx_strategy_kpis_assigned_to_user_id_fkey ON strategy_kpis(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_kpis_dept_strategy_id_fkey ON strategy_kpis(department_strategy_id);

-- strategy_lead_assignments
CREATE INDEX IF NOT EXISTS idx_strategy_lead_assignments_strategy_lead_id_fkey ON strategy_lead_assignments(strategy_lead_id);

-- strategy_leads
CREATE INDEX IF NOT EXISTS idx_strategy_leads_user_id_fkey ON strategy_leads(user_id);

-- strategy_notifications
CREATE INDEX IF NOT EXISTS idx_strategy_notifications_user_id_fkey ON strategy_notifications(user_id);

-- training_module_links
CREATE INDEX IF NOT EXISTS idx_training_module_links_job_family_id_fkey ON training_module_links(job_family_id);

-- training_module_pages
CREATE INDEX IF NOT EXISTS idx_training_module_pages_course_id_fkey ON training_module_pages(course_id);

-- user_admin_permissions
CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_granted_by_fkey ON user_admin_permissions(granted_by);

-- weekly_performance_scores
CREATE INDEX IF NOT EXISTS idx_weekly_performance_scores_meeting_id_fkey ON weekly_performance_scores(meeting_id);
/*
  # Fix Auth RLS Policies Performance - Part 1

  1. Purpose
    - Replace auth.<function>() calls with (SELECT auth.<function>()) in RLS policies
    - Prevents re-evaluation for each row, significantly improving query performance
    - Addresses security advisor warnings about auth RLS initialization

  2. Changes
    - Drops and recreates policies with optimized auth function calls
    - Covers tables: review_summaries, job_titles, executive_strategies, strategy_focus_areas_v2,
      strategy_lead_assignments, department_strategy_kpis, department_strategy_approvals,
      review_template_kpis, review_instances, one_to_one_review_cycles, one_to_one_cycle_kpis

  3. Security
    - All policies maintain the same security logic
    - Only optimization is to cache auth function results per query instead of per row
*/

-- review_summaries
DROP POLICY IF EXISTS "Managers can manage summaries" ON review_summaries;
DROP POLICY IF EXISTS "Users can view summaries for their meetings" ON review_summaries;

CREATE POLICY "Managers can manage summaries" ON review_summaries
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM review_meetings rm
    WHERE rm.id = review_summaries.review_instance_id
    AND rm.manager_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can view summaries for their meetings" ON review_summaries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM review_meetings rm
    WHERE rm.id = review_summaries.review_instance_id
    AND (rm.manager_id = (SELECT auth.uid()) OR rm.employee_id = (SELECT auth.uid()))
  )
);

-- job_titles
DROP POLICY IF EXISTS "Authenticated users can view active job titles" ON job_titles;

CREATE POLICY "Authenticated users can view active job titles" ON job_titles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

-- executive_strategies
DROP POLICY IF EXISTS "Creators can update strategies" ON executive_strategies;
DROP POLICY IF EXISTS "Exec can create strategies" ON executive_strategies;
DROP POLICY IF EXISTS "Users can view active strategies" ON executive_strategies;

CREATE POLICY "Creators can update strategies" ON executive_strategies
FOR UPDATE
TO authenticated
USING (creator_id = (SELECT auth.uid()));

CREATE POLICY "Exec can create strategies" ON executive_strategies
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role IN ('leadership', 'admin')
  )
);

CREATE POLICY "Users can view active strategies" ON executive_strategies
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

-- strategy_focus_areas_v2
DROP POLICY IF EXISTS "Exec can manage focus areas" ON strategy_focus_areas_v2;
DROP POLICY IF EXISTS "Users can view focus areas" ON strategy_focus_areas_v2;

CREATE POLICY "Exec can manage focus areas" ON strategy_focus_areas_v2
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role IN ('leadership', 'admin')
  )
);

CREATE POLICY "Users can view focus areas" ON strategy_focus_areas_v2
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

-- strategy_lead_assignments
DROP POLICY IF EXISTS "Exec can manage lead assignments" ON strategy_lead_assignments;
DROP POLICY IF EXISTS "Users can view lead assignments" ON strategy_lead_assignments;

CREATE POLICY "Exec can manage lead assignments" ON strategy_lead_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role IN ('leadership', 'admin')
  )
);

CREATE POLICY "Users can view lead assignments" ON strategy_lead_assignments
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

-- department_strategy_kpis
DROP POLICY IF EXISTS "Creators can manage dept KPIs" ON department_strategy_kpis;
DROP POLICY IF EXISTS "Users can view dept KPIs" ON department_strategy_kpis;

CREATE POLICY "Creators can manage dept KPIs" ON department_strategy_kpis
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM department_strategies ds
    WHERE ds.id = department_strategy_kpis.department_strategy_id
    AND ds.creator_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can view dept KPIs" ON department_strategy_kpis
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

-- department_strategy_approvals
DROP POLICY IF EXISTS "Approvers can manage approvals" ON department_strategy_approvals;
DROP POLICY IF EXISTS "Users can view approvals" ON department_strategy_approvals;

CREATE POLICY "Approvers can manage approvals" ON department_strategy_approvals
FOR ALL
TO authenticated
USING (approver_id = (SELECT auth.uid()));

CREATE POLICY "Users can view approvals" ON department_strategy_approvals
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL);

-- review_template_kpis
DROP POLICY IF EXISTS "Creators can manage template KPIs" ON review_template_kpis;

CREATE POLICY "Creators can manage template KPIs" ON review_template_kpis
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM review_templates rt
    WHERE rt.id = review_template_kpis.template_id
    AND rt.creator_id = (SELECT auth.uid())
  )
);

-- review_instances
DROP POLICY IF EXISTS "Managers can create review instances" ON review_instances;
DROP POLICY IF EXISTS "Managers can update review instances" ON review_instances;
DROP POLICY IF EXISTS "Users can view review instances" ON review_instances;

CREATE POLICY "Managers can create review instances" ON review_instances
FOR INSERT
TO authenticated
WITH CHECK (manager_id = (SELECT auth.uid()));

CREATE POLICY "Managers can update review instances" ON review_instances
FOR UPDATE
TO authenticated
USING (manager_id = (SELECT auth.uid()));

CREATE POLICY "Users can view review instances" ON review_instances
FOR SELECT
TO authenticated
USING (
  employee_id = (SELECT auth.uid()) OR 
  manager_id = (SELECT auth.uid())
);

-- one_to_one_review_cycles
DROP POLICY IF EXISTS "Leadership can view all review cycles" ON one_to_one_review_cycles;
DROP POLICY IF EXISTS "Managers can manage their review cycles" ON one_to_one_review_cycles;

CREATE POLICY "Leadership can view all review cycles" ON one_to_one_review_cycles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role IN ('leadership', 'admin')
  )
);

CREATE POLICY "Managers can manage their review cycles" ON one_to_one_review_cycles
FOR ALL
TO authenticated
USING (manager_id = (SELECT auth.uid()));

-- one_to_one_cycle_kpis
DROP POLICY IF EXISTS "Leadership can view all cycle KPIs" ON one_to_one_cycle_kpis;
DROP POLICY IF EXISTS "Managers can manage cycle KPIs" ON one_to_one_cycle_kpis;

CREATE POLICY "Leadership can view all cycle KPIs" ON one_to_one_cycle_kpis
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid())
    AND role IN ('leadership', 'admin')
  )
);

CREATE POLICY "Managers can manage cycle KPIs" ON one_to_one_cycle_kpis
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM one_to_one_review_cycles rc
    WHERE rc.id = one_to_one_cycle_kpis.cycle_id
    AND rc.manager_id = (SELECT auth.uid())
  )
);
/*
  # Fix RLS Policy Always True - Security Fix

  1. Purpose
    - Fix RLS policy on assessment_notifications that allows unrestricted access
    - The current policy has WITH CHECK (true) which bypasses security

  2. Changes
    - Replace "System can create notifications" policy with proper security check
    - Only allow authenticated users to create notifications for valid workflows

  3. Security
    - Ensures notifications can only be created for existing workflow records
    - Maintains proper access control
*/

DROP POLICY IF EXISTS "System can create notifications" ON assessment_notifications;

CREATE POLICY "System can create notifications" ON assessment_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM skills_assessment_workflow
    WHERE id = assessment_notifications.workflow_id
  )
);
/*
  # Remove Unused Indexes - Security Fix

  1. Purpose
    - Remove indexes that are not being used by queries
    - Reduces database overhead and improves write performance
    - Addresses security advisor warnings about unused indexes

  2. Changes
    - Drops 150+ unused indexes across various tables
    - All indexes use IF EXISTS to prevent errors

  3. Performance Impact
    - Improves INSERT/UPDATE/DELETE performance
    - Reduces storage overhead
    - Maintains all necessary indexes for foreign keys and queries
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_reviews_user_id_fkey;
DROP INDEX IF EXISTS idx_moderation_queue_moderator;
DROP INDEX IF EXISTS idx_copilot_functions_category;
DROP INDEX IF EXISTS idx_training_sessions_date;
DROP INDEX IF EXISTS idx_career_development_plans_user_id;
DROP INDEX IF EXISTS idx_review_template_sections_order;
DROP INDEX IF EXISTS idx_one_to_one_scheduled_meetings_completion_status;
DROP INDEX IF EXISTS idx_one_to_one_scheduled_meetings_scheduled_datetime;
DROP INDEX IF EXISTS idx_one_to_one_scheduled_meetings_manager_cycle;
DROP INDEX IF EXISTS idx_values_active;
DROP INDEX IF EXISTS idx_competencies_value;
DROP INDEX IF EXISTS idx_strategic_goals_roadmap_id;
DROP INDEX IF EXISTS idx_training_attendees_training_session_id;
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
DROP INDEX IF EXISTS idx_department_strategy_actions_assigned_to;
DROP INDEX IF EXISTS idx_department_strategy_actions_dept_strategy_id;
DROP INDEX IF EXISTS idx_department_strategy_approvals_approver_id;
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
DROP INDEX IF EXISTS idx_review_actions_meeting_id;
DROP INDEX IF EXISTS idx_review_approvals_approver_id;
DROP INDEX IF EXISTS idx_review_approvals_competency_assessment_id;
DROP INDEX IF EXISTS idx_review_competency_assessments_meeting_id;
DROP INDEX IF EXISTS idx_review_competency_ratings_recorded_by;
DROP INDEX IF EXISTS idx_review_competency_ratings_review_instance_id;
DROP INDEX IF EXISTS idx_review_cycles_focus_area_id;
DROP INDEX IF EXISTS idx_review_employee_actions_action_owner;
DROP INDEX IF EXISTS idx_review_employee_notes_employee_id;
DROP INDEX IF EXISTS idx_review_half_year_assessments_manager_id;
DROP INDEX IF EXISTS idx_review_instances_template_id;
DROP INDEX IF EXISTS idx_review_kpi_ratings_meeting_id;
DROP INDEX IF EXISTS idx_review_kpi_ratings_recorded_by;
DROP INDEX IF EXISTS idx_review_kpi_ratings_review_instance_id;
DROP INDEX IF EXISTS idx_review_kpi_ratings_template_kpi_id;
DROP INDEX IF EXISTS idx_review_meetings_manager_id;
DROP INDEX IF EXISTS idx_review_monthly_averages_manager_id;
DROP INDEX IF EXISTS idx_review_monthly_competency_scores_competency_id;
DROP INDEX IF EXISTS idx_review_monthly_competency_scores_manager_id;
DROP INDEX IF EXISTS idx_view_as_sessions_active;
DROP INDEX IF EXISTS idx_review_schedules_cycle_id;
DROP INDEX IF EXISTS idx_review_schedules_manager_id;
DROP INDEX IF EXISTS idx_review_summaries_review_instance_id;
DROP INDEX IF EXISTS idx_review_templates_creator_id;
DROP INDEX IF EXISTS idx_review_templates_department_id;
DROP INDEX IF EXISTS idx_review_weekly_kpi_ratings_kpi_id;
DROP INDEX IF EXISTS idx_review_weekly_kpi_ratings_manager_id;
DROP INDEX IF EXISTS idx_review_weekly_summaries_manager_id;
DROP INDEX IF EXISTS idx_reviews_reviewer_id;
DROP INDEX IF EXISTS idx_focus_areas_strategy;
DROP INDEX IF EXISTS idx_milestones_focus_area;
DROP INDEX IF EXISTS idx_leads_focus_area;
DROP INDEX IF EXISTS idx_dept_strategies_parent;
DROP INDEX IF EXISTS idx_kpis_strategy;
DROP INDEX IF EXISTS idx_standalone_department_strategies_owner_id;
DROP INDEX IF EXISTS idx_strategic_goals_assigned_by_id;
DROP INDEX IF EXISTS idx_strategic_goals_assigned_to_id;
DROP INDEX IF EXISTS idx_strategic_goals_parent_goal_id;
DROP INDEX IF EXISTS idx_strategic_roadmaps_owner_id;
DROP INDEX IF EXISTS idx_strategy_actions_created_by;
DROP INDEX IF EXISTS idx_strategy_kpis_focus_area_id;
DROP INDEX IF EXISTS idx_strategy_lead_assignments_assigned_by;
DROP INDEX IF EXISTS idx_strategy_leads_assigned_by;
DROP INDEX IF EXISTS idx_strategy_notifications_dept_strategy_id;
DROP INDEX IF EXISTS idx_strategy_notifications_strategy_id;
DROP INDEX IF EXISTS idx_system_settings_updated_by;
DROP INDEX IF EXISTS idx_training_completions_course_id;
DROP INDEX IF EXISTS idx_user_admin_permissions_permission_name;
DROP INDEX IF EXISTS idx_user_cvs_user_id;
DROP INDEX IF EXISTS idx_view_as_sessions_target_user_id;
DROP INDEX IF EXISTS idx_weekly_catchups_employee_id;
DROP INDEX IF EXISTS idx_weekly_catchups_manager_id;
DROP INDEX IF EXISTS idx_review_cycles_manager;
DROP INDEX IF EXISTS idx_review_cycle_members_employee;
DROP INDEX IF EXISTS idx_review_cycle_kpis_cycle;
DROP INDEX IF EXISTS idx_review_cycle_actions_cycle;
DROP INDEX IF EXISTS idx_review_employee_actions_employee;
DROP INDEX IF EXISTS idx_review_employee_actions_overdue;
DROP INDEX IF EXISTS idx_review_monthly_averages_employee;
DROP INDEX IF EXISTS idx_review_schedules_employee;
DROP INDEX IF EXISTS idx_cycle_kpis_cycle;
DROP INDEX IF EXISTS idx_scheduled_meetings_cycle;
DROP INDEX IF EXISTS idx_scheduled_meetings_employee;
DROP INDEX IF EXISTS idx_scheduled_meetings_manager;
DROP INDEX IF EXISTS idx_weekly_checkins_meeting;
DROP INDEX IF EXISTS idx_weekly_checkins_employee;
DROP INDEX IF EXISTS idx_monthly_reviews_meeting;
DROP INDEX IF EXISTS idx_monthly_reviews_employee;
DROP INDEX IF EXISTS idx_competency_ratings_review;
DROP INDEX IF EXISTS idx_actions_employee;
DROP INDEX IF EXISTS idx_actions_weekly_checkin;
DROP INDEX IF EXISTS idx_actions_monthly_review;
DROP INDEX IF EXISTS idx_half_year_reviews_employee;
DROP INDEX IF EXISTS idx_self_assessments_employee;
DROP INDEX IF EXISTS idx_moderation_queue_status;
DROP INDEX IF EXISTS idx_role_skills_job_dept;
DROP INDEX IF EXISTS idx_role_skills_skill;
DROP INDEX IF EXISTS idx_assessment_cycles_dates;
DROP INDEX IF EXISTS idx_employee_assessments_employee;
DROP INDEX IF EXISTS idx_employee_assessments_cycle;
DROP INDEX IF EXISTS idx_manager_assessments_employee;
DROP INDEX IF EXISTS idx_manager_assessments_manager;
DROP INDEX IF EXISTS idx_manager_assessments_cycle;
DROP INDEX IF EXISTS idx_discrepancies_employee;
DROP INDEX IF EXISTS idx_discrepancies_flagged;
DROP INDEX IF EXISTS idx_skill_discussions_review;
DROP INDEX IF EXISTS idx_skill_discussions_skill;
DROP INDEX IF EXISTS idx_dev_actions_employee;
DROP INDEX IF EXISTS idx_dev_actions_status;
DROP INDEX IF EXISTS idx_dev_actions_skill;
DROP INDEX IF EXISTS idx_dept_matrix_dept_title;
DROP INDEX IF EXISTS idx_dept_matrix_skill;
DROP INDEX IF EXISTS idx_workflow_cycle;
DROP INDEX IF EXISTS idx_workflow_employee;
DROP INDEX IF EXISTS idx_workflow_manager;
DROP INDEX IF EXISTS idx_workflow_status;
DROP INDEX IF EXISTS idx_employee_responses_workflow;
DROP INDEX IF EXISTS idx_employee_responses_employee;
DROP INDEX IF EXISTS idx_manager_responses_workflow;
DROP INDEX IF EXISTS idx_manager_responses_manager;
DROP INDEX IF EXISTS idx_approvals_workflow;
DROP INDEX IF EXISTS idx_notifications_recipient;
DROP INDEX IF EXISTS idx_career_quiz_sessions_user;
DROP INDEX IF EXISTS idx_career_external_quals_user;
DROP INDEX IF EXISTS idx_career_skill_ratings_session;
DROP INDEX IF EXISTS idx_marti_coaching_user;
DROP INDEX IF EXISTS idx_marti_coaching_session;
DROP INDEX IF EXISTS idx_career_plans_quiz_session;
/*
  # Add Remaining Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes for all remaining foreign key columns that are missing covering indexes
    - Improves query performance for joins and foreign key constraints
    
  2. Tables Covered
    - All tables with unindexed foreign keys from the security report
*/

-- assessment_approvals
CREATE INDEX IF NOT EXISTS idx_assessment_approvals_approved_by 
  ON assessment_approvals(approved_by);
CREATE INDEX IF NOT EXISTS idx_assessment_approvals_skill_id 
  ON assessment_approvals(skill_id);

-- assessment_notifications
CREATE INDEX IF NOT EXISTS idx_assessment_notifications_workflow_id 
  ON assessment_notifications(workflow_id);

-- career_external_qualifications
CREATE INDEX IF NOT EXISTS idx_career_external_qualifications_quiz_session_id 
  ON career_external_qualifications(quiz_session_id);

-- career_plans
CREATE INDEX IF NOT EXISTS idx_career_plans_user_id 
  ON career_plans(user_id);

-- career_quiz_sessions
CREATE INDEX IF NOT EXISTS idx_career_quiz_sessions_goal_role_id 
  ON career_quiz_sessions(goal_role_id);

-- career_skill_self_ratings
CREATE INDEX IF NOT EXISTS idx_career_skill_self_ratings_skill_id 
  ON career_skill_self_ratings(skill_id);
CREATE INDEX IF NOT EXISTS idx_career_skill_self_ratings_user_id 
  ON career_skill_self_ratings(user_id);

-- executive_strategies
CREATE INDEX IF NOT EXISTS idx_executive_strategies_creator_id 
  ON executive_strategies(creator_id);

-- goal_milestones
CREATE INDEX IF NOT EXISTS idx_goal_milestones_assigned_to_id 
  ON goal_milestones(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id 
  ON goal_milestones(goal_id);

-- half_year_review_summaries
CREATE INDEX IF NOT EXISTS idx_half_year_review_summaries_meeting_id 
  ON half_year_review_summaries(meeting_id);

-- job_families
CREATE INDEX IF NOT EXISTS idx_job_families_job_title_id 
  ON job_families(job_title_id);

-- job_titles
CREATE INDEX IF NOT EXISTS idx_job_titles_department_id 
  ON job_titles(department_id);

-- one_to_one_actions
CREATE INDEX IF NOT EXISTS idx_one_to_one_actions_action_owner 
  ON one_to_one_actions(action_owner);
CREATE INDEX IF NOT EXISTS idx_one_to_one_actions_manager_id 
  ON one_to_one_actions(manager_id);

-- one_to_one_competency_ratings
CREATE INDEX IF NOT EXISTS idx_one_to_one_competency_ratings_competency_id 
  ON one_to_one_competency_ratings(competency_id);

-- one_to_one_half_year_reviews
CREATE INDEX IF NOT EXISTS idx_one_to_one_half_year_reviews_manager_id 
  ON one_to_one_half_year_reviews(manager_id);

-- one_to_one_moderation_queue
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_competency_rating_id 
  ON one_to_one_moderation_queue(competency_rating_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_employee_id 
  ON one_to_one_moderation_queue(employee_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_manager_id 
  ON one_to_one_moderation_queue(manager_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_moderation_queue_monthly_review_id 
  ON one_to_one_moderation_queue(monthly_review_id);

-- one_to_one_monthly_reviews
CREATE INDEX IF NOT EXISTS idx_one_to_one_monthly_reviews_manager_id 
  ON one_to_one_monthly_reviews(manager_id);

-- one_to_one_review_cycles
CREATE INDEX IF NOT EXISTS idx_one_to_one_review_cycles_manager_id 
  ON one_to_one_review_cycles(manager_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_review_cycles_strategic_goal_id 
  ON one_to_one_review_cycles(strategic_goal_id);

-- one_to_one_self_assessments
CREATE INDEX IF NOT EXISTS idx_one_to_one_self_assessments_half_year_review_id 
  ON one_to_one_self_assessments(half_year_review_id);

-- one_to_one_skill_discussions
CREATE INDEX IF NOT EXISTS idx_one_to_one_skill_discussions_discrepancy_id 
  ON one_to_one_skill_discussions(discrepancy_id);

-- one_to_one_weekly_checkins
CREATE INDEX IF NOT EXISTS idx_one_to_one_weekly_checkins_manager_id 
  ON one_to_one_weekly_checkins(manager_id);

-- performance_ratings
CREATE INDEX IF NOT EXISTS idx_performance_ratings_review_meeting_id 
  ON performance_ratings(review_meeting_id);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_job_title_id 
  ON profiles(job_title_id);

-- review_competency_assessments
CREATE INDEX IF NOT EXISTS idx_review_competency_assessments_competency_id 
  ON review_competency_assessments(competency_id);

-- review_competency_ratings
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_competency_id 
  ON review_competency_ratings(competency_id);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_employee_id 
  ON review_competency_ratings(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_competency_ratings_review_id 
  ON review_competency_ratings(review_id);

-- review_cycles
CREATE INDEX IF NOT EXISTS idx_review_cycles_strategy_id 
  ON review_cycles(strategy_id);

-- review_goal_progress
CREATE INDEX IF NOT EXISTS idx_review_goal_progress_employee_id 
  ON review_goal_progress(employee_id);

-- review_half_year_assessments
CREATE INDEX IF NOT EXISTS idx_review_half_year_assessments_employee_id 
  ON review_half_year_assessments(employee_id);

-- review_instances
CREATE INDEX IF NOT EXISTS idx_review_instances_employee_id 
  ON review_instances(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_instances_manager_id 
  ON review_instances(manager_id);

-- review_kpi_templates
CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_created_by 
  ON review_kpi_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_review_kpi_templates_job_family_id 
  ON review_kpi_templates(job_family_id);

-- review_kpis
CREATE INDEX IF NOT EXISTS idx_review_kpis_created_by 
  ON review_kpis(created_by);
CREATE INDEX IF NOT EXISTS idx_review_kpis_employee_id 
  ON review_kpis(employee_id);

-- review_meetings
CREATE INDEX IF NOT EXISTS idx_review_meetings_employee_id 
  ON review_meetings(employee_id);

-- review_monthly_competency_scores
CREATE INDEX IF NOT EXISTS idx_review_monthly_competency_scores_employee_id 
  ON review_monthly_competency_scores(employee_id);

-- review_monthly_sessions
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_employee_id 
  ON review_monthly_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_manager_id 
  ON review_monthly_sessions(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_monthly_sessions_review_template_id 
  ON review_monthly_sessions(review_template_id);

-- review_notifications
CREATE INDEX IF NOT EXISTS idx_review_notifications_recipient_id 
  ON review_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_review_notifications_sender_id 
  ON review_notifications(sender_id);

-- review_rating_approvals
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

-- review_six_month_performance
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_approved_by 
  ON review_six_month_performance(approved_by);
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_employee_id 
  ON review_six_month_performance(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_six_month_performance_manager_id 
  ON review_six_month_performance(manager_id);

-- review_template_kpis
CREATE INDEX IF NOT EXISTS idx_review_template_kpis_template_id 
  ON review_template_kpis(template_id);

-- review_templates
CREATE INDEX IF NOT EXISTS idx_review_templates_department_strategy_id 
  ON review_templates(department_strategy_id);

-- review_weekly_checkins
CREATE INDEX IF NOT EXISTS idx_review_weekly_checkins_employee_id 
  ON review_weekly_checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_weekly_checkins_manager_id 
  ON review_weekly_checkins(manager_id);

-- review_weekly_kpi_ratings
CREATE INDEX IF NOT EXISTS idx_review_weekly_kpi_ratings_employee_id 
  ON review_weekly_kpi_ratings(employee_id);

-- review_weekly_summaries
CREATE INDEX IF NOT EXISTS idx_review_weekly_summaries_employee_id 
  ON review_weekly_summaries(employee_id);

-- role_skills
CREATE INDEX IF NOT EXISTS idx_role_skills_skill_type_id 
  ON role_skills(skill_type_id);

-- skill_assessment_cycles
CREATE INDEX IF NOT EXISTS idx_skill_assessment_cycles_created_by 
  ON skill_assessment_cycles(created_by);

-- skill_assessment_discrepancies
CREATE INDEX IF NOT EXISTS idx_skill_assessment_discrepancies_discussed_in_meeting_id 
  ON skill_assessment_discrepancies(discussed_in_meeting_id);
CREATE INDEX IF NOT EXISTS idx_skill_assessment_discrepancies_skill_id 
  ON skill_assessment_discrepancies(skill_id);

-- skill_development_actions
CREATE INDEX IF NOT EXISTS idx_skill_development_actions_created_by 
  ON skill_development_actions(created_by);
CREATE INDEX IF NOT EXISTS idx_skill_development_actions_discussion_id 
  ON skill_development_actions(discussion_id);

-- skills_assessment_workflow
CREATE INDEX IF NOT EXISTS idx_skills_assessment_workflow_approved_by 
  ON skills_assessment_workflow(approved_by);

-- standalone_strategy_actions
CREATE INDEX IF NOT EXISTS idx_standalone_strategy_actions_assigned_to 
  ON standalone_strategy_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_standalone_strategy_actions_standalone_strategy_id 
  ON standalone_strategy_actions(standalone_strategy_id);

-- strategic_goals
CREATE INDEX IF NOT EXISTS idx_strategic_goals_department_id 
  ON strategic_goals(department_id);

-- strategies
CREATE INDEX IF NOT EXISTS idx_strategies_creator_id 
  ON strategies(creator_id);
CREATE INDEX IF NOT EXISTS idx_strategies_parent 
  ON strategies(parent_strategy_id);

-- strategy_actions
CREATE INDEX IF NOT EXISTS idx_strategy_actions_assigned_to 
  ON strategy_actions(assigned_to);

-- strategy_approvals
CREATE INDEX IF NOT EXISTS idx_strategy_approvals_approver_id 
  ON strategy_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_strategy_approvals_department_strategy_id 
  ON strategy_approvals(department_strategy_id);

-- strategy_focus_areas_v2
CREATE INDEX IF NOT EXISTS idx_strategy_focus_areas_v2_strategy_id 
  ON strategy_focus_areas_v2(strategy_id);

-- strategy_kpis
CREATE INDEX IF NOT EXISTS idx_strategy_kpis_assigned_to_user_id 
  ON strategy_kpis(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_kpis_department_strategy_id 
  ON strategy_kpis(department_strategy_id);

-- strategy_lead_assignments
CREATE INDEX IF NOT EXISTS idx_strategy_lead_assignments_strategy_lead_id 
  ON strategy_lead_assignments(strategy_lead_id);

-- strategy_leads
CREATE INDEX IF NOT EXISTS idx_strategy_leads_user_id 
  ON strategy_leads(user_id);

-- strategy_notifications
CREATE INDEX IF NOT EXISTS idx_strategy_notifications_user_id 
  ON strategy_notifications(user_id);

-- training_module_links
CREATE INDEX IF NOT EXISTS idx_training_module_links_job_family_id 
  ON training_module_links(job_family_id);

-- training_module_pages
CREATE INDEX IF NOT EXISTS idx_training_module_pages_course_id 
  ON training_module_pages(course_id);

-- user_admin_permissions
CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_granted_by 
  ON user_admin_permissions(granted_by);

-- weekly_performance_scores
CREATE INDEX IF NOT EXISTS idx_weekly_performance_scores_meeting_id 
  ON weekly_performance_scores(meeting_id);
/*
  # Remove All Unused Indexes

  1. Performance Improvements
    - Remove all unused indexes identified by Supabase security advisor
    - Reduces storage overhead and improves write performance
    
  2. Note
    - These indexes have not been used according to Supabase's monitoring
    - Removing them will free up storage and speed up inserts/updates
*/

-- Remove unused indexes from the security report
DROP INDEX IF EXISTS idx_department_skills_matrix_created_by_fkey;
DROP INDEX IF EXISTS idx_department_skills_matrix_job_family_id_fkey;
DROP INDEX IF EXISTS idx_department_skills_matrix_skill_type_id_fkey;
DROP INDEX IF EXISTS idx_department_strategies_creator_id_fkey;
DROP INDEX IF EXISTS idx_department_strategies_focus_area_id_fkey;
DROP INDEX IF EXISTS idx_department_strategy_approvals_dept_strategy_id_fkey;
DROP INDEX IF EXISTS idx_department_strategy_kpis_dept_strategy_id_fkey;
DROP INDEX IF EXISTS idx_employee_skill_assessments_skill_id_fkey;
DROP INDEX IF EXISTS idx_employee_skills_assessment_responses_matrix_id_fkey;
DROP INDEX IF EXISTS idx_employee_skills_assessment_responses_skill_id_fkey;
DROP INDEX IF EXISTS idx_manager_skill_assessments_skill_id_fkey;
DROP INDEX IF EXISTS idx_manager_skills_assessment_responses_employee_id_fkey;
DROP INDEX IF EXISTS idx_manager_skills_assessment_responses_matrix_id_fkey;
DROP INDEX IF EXISTS idx_manager_skills_assessment_responses_skill_id_fkey;

-- Note: These were created in part 1 but are reported as unused
DROP INDEX IF EXISTS idx_assessment_notifications_recipient_id;
DROP INDEX IF EXISTS idx_business_strategies_created_by;
DROP INDEX IF EXISTS idx_business_strategies_owner_id;
DROP INDEX IF EXISTS idx_career_development_plans_manager_id;
DROP INDEX IF EXISTS idx_career_development_plans_user_id;
DROP INDEX IF EXISTS idx_career_external_qualifications_user_id;
DROP INDEX IF EXISTS idx_career_pathways_user_id;
DROP INDEX IF EXISTS idx_career_plan_milestones_career_plan_id;
DROP INDEX IF EXISTS idx_career_plans_current_job_family_id;
DROP INDEX IF EXISTS idx_career_plans_target_job_family_id;
DROP INDEX IF EXISTS idx_career_quiz_responses_user_id;
DROP INDEX IF EXISTS idx_career_quiz_sessions_user_id;
DROP INDEX IF EXISTS idx_catchup_summaries_employee_id;
DROP INDEX IF EXISTS idx_competencies_value_id;
DROP INDEX IF EXISTS idx_copilot_conversation_history_user_id;
DROP INDEX IF EXISTS idx_department_skills_matrix_skill_id;
DROP INDEX IF EXISTS idx_department_strategies_parent_strategy_id;
DROP INDEX IF EXISTS idx_department_strategy_actions_assigned_to;
DROP INDEX IF EXISTS idx_department_strategy_actions_department_strategy_id;
DROP INDEX IF EXISTS idx_department_strategy_approvals_approver_id;
DROP INDEX IF EXISTS idx_employee_skill_assessments_employee_id;
DROP INDEX IF EXISTS idx_employee_skills_assessment_responses_employee_id;
DROP INDEX IF EXISTS idx_goals_user_id;
DROP INDEX IF EXISTS idx_job_family_competencies_competency_id;
DROP INDEX IF EXISTS idx_job_family_competencies_required_level_id;
DROP INDEX IF EXISTS idx_job_history_changed_by;
DROP INDEX IF EXISTS idx_job_history_job_family_id;
DROP INDEX IF EXISTS idx_job_history_user_id;
DROP INDEX IF EXISTS idx_manager_skill_assessments_employee_id;
DROP INDEX IF EXISTS idx_manager_skill_assessments_manager_id;
DROP INDEX IF EXISTS idx_manager_skills_assessment_responses_manager_id;
DROP INDEX IF EXISTS idx_marti_career_coaching_logs_quiz_session_id;
DROP INDEX IF EXISTS idx_marti_career_coaching_logs_user_id;
DROP INDEX IF EXISTS idx_one_to_one_actions_employee_id;
DROP INDEX IF EXISTS idx_one_to_one_actions_monthly_review_id;
DROP INDEX IF EXISTS idx_one_to_one_actions_weekly_checkin_id;
DROP INDEX IF EXISTS idx_one_to_one_competency_ratings_monthly_review_id;
DROP INDEX IF EXISTS idx_one_to_one_cycle_kpis_cycle_id;
DROP INDEX IF EXISTS idx_one_to_one_goals_cdp_id;
DROP INDEX IF EXISTS idx_one_to_one_goals_created_by;
DROP INDEX IF EXISTS idx_one_to_one_goals_user_id;
DROP INDEX IF EXISTS idx_one_to_one_half_year_reviews_employee_id;
DROP INDEX IF EXISTS idx_one_to_one_moderation_queue_moderator_id;
DROP INDEX IF EXISTS idx_one_to_one_monthly_reviews_employee_id;
DROP INDEX IF EXISTS idx_one_to_one_monthly_reviews_meeting_id;
DROP INDEX IF EXISTS idx_one_to_one_scheduled_meetings_cycle_id;
DROP INDEX IF EXISTS idx_one_to_one_scheduled_meetings_employee_id;
DROP INDEX IF EXISTS idx_one_to_one_scheduled_meetings_manager_id;
DROP INDEX IF EXISTS idx_one_to_one_self_assessments_employee_id;
DROP INDEX IF EXISTS idx_one_to_one_skill_discussions_monthly_review_id;
DROP INDEX IF EXISTS idx_one_to_one_skill_discussions_skill_id;
DROP INDEX IF EXISTS idx_one_to_one_weekly_checkins_employee_id;
DROP INDEX IF EXISTS idx_one_to_one_weekly_checkins_meeting_id;
DROP INDEX IF EXISTS idx_profile_skills_skill_id;
DROP INDEX IF EXISTS idx_profiles_job_family_id;
DROP INDEX IF EXISTS idx_profiles_manager_id;
DROP INDEX IF EXISTS idx_review_actions_meeting_id;
DROP INDEX IF EXISTS idx_review_approvals_approver_id;
DROP INDEX IF EXISTS idx_review_approvals_competency_assessment_id;
DROP INDEX IF EXISTS idx_review_competency_assessments_meeting_id;
DROP INDEX IF EXISTS idx_review_competency_ratings_recorded_by;
DROP INDEX IF EXISTS idx_review_competency_ratings_review_instance_id;
DROP INDEX IF EXISTS idx_review_cycle_actions_cycle_id;
DROP INDEX IF EXISTS idx_review_cycle_kpis_cycle_id;
DROP INDEX IF EXISTS idx_review_cycle_members_employee_id;
DROP INDEX IF EXISTS idx_review_cycles_focus_area_id;
DROP INDEX IF EXISTS idx_review_cycles_manager_id;
DROP INDEX IF EXISTS idx_review_employee_actions_action_owner;
DROP INDEX IF EXISTS idx_review_employee_actions_employee_id;
DROP INDEX IF EXISTS idx_review_employee_notes_employee_id;
DROP INDEX IF EXISTS idx_review_half_year_assessments_manager_id;
DROP INDEX IF EXISTS idx_review_instances_template_id;
DROP INDEX IF EXISTS idx_review_kpi_ratings_meeting_id;
DROP INDEX IF EXISTS idx_review_kpi_ratings_recorded_by;
DROP INDEX IF EXISTS idx_review_kpi_ratings_review_instance_id;
DROP INDEX IF EXISTS idx_review_kpi_ratings_template_kpi_id;
DROP INDEX IF EXISTS idx_review_meetings_manager_id;
DROP INDEX IF EXISTS idx_review_monthly_averages_employee_id;
DROP INDEX IF EXISTS idx_review_monthly_averages_manager_id;
DROP INDEX IF EXISTS idx_review_monthly_competency_scores_competency_id;
DROP INDEX IF EXISTS idx_review_monthly_competency_scores_manager_id;
DROP INDEX IF EXISTS idx_review_schedules_cycle_id;
DROP INDEX IF EXISTS idx_review_schedules_employee_id;
DROP INDEX IF EXISTS idx_review_schedules_manager_id;
DROP INDEX IF EXISTS idx_review_summaries_review_instance_id;
DROP INDEX IF EXISTS idx_review_template_sections_template_id;
DROP INDEX IF EXISTS idx_review_templates_creator_id;
DROP INDEX IF EXISTS idx_review_templates_department_id;
DROP INDEX IF EXISTS idx_review_weekly_kpi_ratings_kpi_id;
DROP INDEX IF EXISTS idx_review_weekly_kpi_ratings_manager_id;
DROP INDEX IF EXISTS idx_review_weekly_summaries_manager_id;
DROP INDEX IF EXISTS idx_reviews_reviewer_id;
DROP INDEX IF EXISTS idx_reviews_user_id;
DROP INDEX IF EXISTS idx_role_skills_skill_id;
DROP INDEX IF EXISTS idx_skill_assessment_discrepancies_employee_id;
DROP INDEX IF EXISTS idx_skill_development_actions_employee_id;
DROP INDEX IF EXISTS idx_skill_development_actions_skill_id;
DROP INDEX IF EXISTS idx_skills_assessment_workflow_employee_id;
DROP INDEX IF EXISTS idx_skills_assessment_workflow_manager_id;
DROP INDEX IF EXISTS idx_standalone_department_strategies_owner_id;
DROP INDEX IF EXISTS idx_strategic_goals_assigned_by_id;
DROP INDEX IF EXISTS idx_strategic_goals_assigned_to_id;
DROP INDEX IF EXISTS idx_strategic_goals_parent_goal_id;
DROP INDEX IF EXISTS idx_strategic_goals_roadmap_id;
DROP INDEX IF EXISTS idx_strategic_roadmaps_owner_id;
DROP INDEX IF EXISTS idx_strategy_actions_created_by;
DROP INDEX IF EXISTS idx_strategy_focus_areas_strategy_id;
DROP INDEX IF EXISTS idx_strategy_kpis_focus_area_id;
DROP INDEX IF EXISTS idx_strategy_kpis_strategy_id;
DROP INDEX IF EXISTS idx_strategy_lead_assignments_assigned_by;
DROP INDEX IF EXISTS idx_strategy_leads_assigned_by;
DROP INDEX IF EXISTS idx_strategy_milestones_focus_area_id;
DROP INDEX IF EXISTS idx_strategy_notifications_department_strategy_id;
DROP INDEX IF EXISTS idx_strategy_notifications_strategy_id;
DROP INDEX IF EXISTS idx_system_settings_updated_by;
DROP INDEX IF EXISTS idx_training_attendees_training_session_id;
DROP INDEX IF EXISTS idx_training_completions_course_id;
DROP INDEX IF EXISTS idx_user_admin_permissions_permission_name;
DROP INDEX IF EXISTS idx_user_cvs_user_id;
DROP INDEX IF EXISTS idx_view_as_sessions_admin_id;
DROP INDEX IF EXISTS idx_view_as_sessions_target_user_id;
DROP INDEX IF EXISTS idx_weekly_catchups_employee_id;
DROP INDEX IF EXISTS idx_weekly_catchups_manager_id;
/*
  # Add Missing Foreign Key Indexes - Part 1

  1. Purpose
    - Add indexes for foreign key columns to improve query performance
    - Addresses Supabase security advisor warnings about unindexed foreign keys

  2. Changes
    - Creates indexes for foreign key columns in multiple tables (first batch)
    - All indexes use IF NOT EXISTS to prevent errors on re-run

  3. Performance Impact
    - Significantly improves JOIN performance
    - Improves foreign key constraint checking performance
*/

-- assessment_notifications
CREATE INDEX IF NOT EXISTS idx_assessment_notifications_recipient_id
  ON assessment_notifications(recipient_id);

-- business_strategies
CREATE INDEX IF NOT EXISTS idx_business_strategies_created_by
  ON business_strategies(created_by);
CREATE INDEX IF NOT EXISTS idx_business_strategies_owner_id
  ON business_strategies(owner_id);

-- career_development_plans
CREATE INDEX IF NOT EXISTS idx_career_development_plans_manager_id
  ON career_development_plans(manager_id);
CREATE INDEX IF NOT EXISTS idx_career_development_plans_user_id
  ON career_development_plans(user_id);

-- career_external_qualifications
CREATE INDEX IF NOT EXISTS idx_career_external_qualifications_user_id
  ON career_external_qualifications(user_id);

-- career_pathways
CREATE INDEX IF NOT EXISTS idx_career_pathways_user_id
  ON career_pathways(user_id);

-- career_plan_milestones
CREATE INDEX IF NOT EXISTS idx_career_plan_milestones_career_plan_id
  ON career_plan_milestones(career_plan_id);

-- career_plans
CREATE INDEX IF NOT EXISTS idx_career_plans_current_job_family_id
  ON career_plans(current_job_family_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_target_job_family_id
  ON career_plans(target_job_family_id);

-- career_quiz_responses
CREATE INDEX IF NOT EXISTS idx_career_quiz_responses_user_id
  ON career_quiz_responses(user_id);

-- career_quiz_sessions
CREATE INDEX IF NOT EXISTS idx_career_quiz_sessions_user_id
  ON career_quiz_sessions(user_id);

-- catchup_summaries
CREATE INDEX IF NOT EXISTS idx_catchup_summaries_employee_id
  ON catchup_summaries(employee_id);

-- competencies
CREATE INDEX IF NOT EXISTS idx_competencies_value_id
  ON competencies(value_id);

-- copilot_conversation_history
CREATE INDEX IF NOT EXISTS idx_copilot_conversation_history_user_id
  ON copilot_conversation_history(user_id);

-- department_skills_matrix
CREATE INDEX IF NOT EXISTS idx_department_skills_matrix_created_by
  ON department_skills_matrix(created_by);
CREATE INDEX IF NOT EXISTS idx_department_skills_matrix_job_family_id
  ON department_skills_matrix(job_family_id);
CREATE INDEX IF NOT EXISTS idx_department_skills_matrix_skill_id_fkey
  ON department_skills_matrix(skill_id);
CREATE INDEX IF NOT EXISTS idx_department_skills_matrix_skill_type_id_fkey
  ON department_skills_matrix(skill_type_id);

-- department_strategies
CREATE INDEX IF NOT EXISTS idx_department_strategies_creator_id
  ON department_strategies(creator_id);
CREATE INDEX IF NOT EXISTS idx_department_strategies_focus_area_id
  ON department_strategies(focus_area_id);
CREATE INDEX IF NOT EXISTS idx_department_strategies_parent_strategy_id
  ON department_strategies(parent_strategy_id);

-- department_strategy_actions
CREATE INDEX IF NOT EXISTS idx_department_strategy_actions_assigned_to
  ON department_strategy_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_department_strategy_actions_department_strategy_id
  ON department_strategy_actions(department_strategy_id);

-- department_strategy_approvals
CREATE INDEX IF NOT EXISTS idx_department_strategy_approvals_approver_id
  ON department_strategy_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_department_strategy_approvals_department_strategy_id
  ON department_strategy_approvals(department_strategy_id);

-- department_strategy_kpis
CREATE INDEX IF NOT EXISTS idx_department_strategy_kpis_department_strategy_id
  ON department_strategy_kpis(department_strategy_id);

-- employee_skill_assessments
CREATE INDEX IF NOT EXISTS idx_employee_skill_assessments_employee_id_fkey
  ON employee_skill_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skill_assessments_skill_id_fkey
  ON employee_skill_assessments(skill_id);

-- employee_skills_assessment_responses
CREATE INDEX IF NOT EXISTS idx_employee_skills_assessment_responses_employee_id_fkey
  ON employee_skills_assessment_responses(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_assessment_responses_matrix_id
  ON employee_skills_assessment_responses(matrix_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_assessment_responses_skill_id_fkey
  ON employee_skills_assessment_responses(skill_id);

-- goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id
  ON goals(user_id);

-- job_family_competencies
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_competency_id
  ON job_family_competencies(competency_id);
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_required_level_id
  ON job_family_competencies(required_level_id);

-- job_history
CREATE INDEX IF NOT EXISTS idx_job_history_changed_by
  ON job_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_job_history_job_family_id
  ON job_history(job_family_id);
CREATE INDEX IF NOT EXISTS idx_job_history_user_id_fkey
  ON job_history(user_id);

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

/*
  # Fix Auth RLS Performance Issues - Part 1

  1. Purpose
    - Fix RLS policies that re-evaluate auth functions for each row
    - Wrap auth function calls in SELECT to evaluate once per query

  2. Changes
    - Updates policies to use (SELECT auth.uid()) instead of auth.uid()
    - Significantly improves query performance at scale

  3. Tables Updated (Part 1)
    - one_to_one_weekly_checkins
    - one_to_one_scheduled_meetings
    - training_module_pages
    - one_to_one_monthly_reviews
    - strategies
    - strategy_focus_areas
    - strategy_milestones
    - strategy_leads
*/

-- one_to_one_weekly_checkins policies
DROP POLICY IF EXISTS "Managers and employees can view their checkins" ON one_to_one_weekly_checkins;
CREATE POLICY "Managers and employees can view their checkins"
  ON one_to_one_weekly_checkins FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings m
      WHERE m.id = one_to_one_weekly_checkins.meeting_id
      AND m.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can manage their team checkins" ON one_to_one_weekly_checkins;
CREATE POLICY "Managers can manage their team checkins"
  ON one_to_one_weekly_checkins FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings m
      WHERE m.id = one_to_one_weekly_checkins.meeting_id
      AND m.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings m
      WHERE m.id = one_to_one_weekly_checkins.meeting_id
      AND m.manager_id = (SELECT auth.uid())
    )
  );

-- one_to_one_scheduled_meetings policies
DROP POLICY IF EXISTS "Managers and employees can view their meetings" ON one_to_one_scheduled_meetings;
CREATE POLICY "Managers and employees can view their meetings"
  ON one_to_one_scheduled_meetings FOR SELECT
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR 
    employee_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Managers can manage their meetings" ON one_to_one_scheduled_meetings;
CREATE POLICY "Managers can manage their meetings"
  ON one_to_one_scheduled_meetings FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update their meetings" ON one_to_one_scheduled_meetings;
CREATE POLICY "Managers can update their meetings"
  ON one_to_one_scheduled_meetings FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

-- training_module_pages policies
DROP POLICY IF EXISTS "Admins can manage module pages" ON training_module_pages;
CREATE POLICY "Admins can manage module pages"
  ON training_module_pages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- one_to_one_monthly_reviews policies
DROP POLICY IF EXISTS "Managers and employees can view their monthly reviews" ON one_to_one_monthly_reviews;
CREATE POLICY "Managers and employees can view their monthly reviews"
  ON one_to_one_monthly_reviews FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings m
      WHERE m.id = one_to_one_monthly_reviews.meeting_id
      AND m.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can manage their team monthly reviews" ON one_to_one_monthly_reviews;
CREATE POLICY "Managers can manage their team monthly reviews"
  ON one_to_one_monthly_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings m
      WHERE m.id = one_to_one_monthly_reviews.meeting_id
      AND m.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings m
      WHERE m.id = one_to_one_monthly_reviews.meeting_id
      AND m.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Senior managers can view for moderation" ON one_to_one_monthly_reviews;
CREATE POLICY "Senior managers can view for moderation"
  ON one_to_one_monthly_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('admin', 'leadership')
    )
  );

-- strategies policies
DROP POLICY IF EXISTS "Admins and leadership can create strategies" ON strategies;
CREATE POLICY "Admins and leadership can create strategies"
  ON strategies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "Admins and leadership can view all strategies" ON strategies;
CREATE POLICY "Admins and leadership can view all strategies"
  ON strategies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "Strategy creators and admins can update strategies" ON strategies;
CREATE POLICY "Strategy creators and admins can update strategies"
  ON strategies FOR UPDATE
  TO authenticated
  USING (
    creator_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  )
  WITH CHECK (
    creator_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "Strategy creators can view own strategies" ON strategies;
CREATE POLICY "Strategy creators can view own strategies"
  ON strategies FOR SELECT
  TO authenticated
  USING (creator_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users with access can view active strategies" ON strategies;
CREATE POLICY "Users with access can view active strategies"
  ON strategies FOR SELECT
  TO authenticated
  USING (
    status = 'active' AND
    (
      department IS NULL OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (SELECT auth.uid())
        AND (
          profiles.department = strategies.department OR
          profiles.role IN ('admin', 'leadership')
        )
      )
    )
  );

-- strategy_focus_areas policies
DROP POLICY IF EXISTS "Admins and creators can manage focus areas" ON strategy_focus_areas;
CREATE POLICY "Admins and creators can manage focus areas"
  ON strategy_focus_areas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM strategies s
      WHERE s.id = strategy_focus_areas.strategy_id
      AND (
        s.creator_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role IN ('admin', 'leadership')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM strategies s
      WHERE s.id = strategy_focus_areas.strategy_id
      AND (
        s.creator_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role IN ('admin', 'leadership')
        )
      )
    )
  );

-- strategy_milestones policies
DROP POLICY IF EXISTS "Admins and leads can manage milestones" ON strategy_milestones;
CREATE POLICY "Admins and leads can manage milestones"
  ON strategy_milestones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM strategy_focus_areas sfa
      JOIN strategies s ON s.id = sfa.strategy_id
      WHERE sfa.id = strategy_milestones.focus_area_id
      AND (
        s.creator_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role IN ('admin', 'leadership')
        ) OR
        EXISTS (
          SELECT 1 FROM strategy_leads sl
          WHERE sl.focus_area_id = sfa.id
          AND sl.user_id = (SELECT auth.uid())
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM strategy_focus_areas sfa
      JOIN strategies s ON s.id = sfa.strategy_id
      WHERE sfa.id = strategy_milestones.focus_area_id
      AND (
        s.creator_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role IN ('admin', 'leadership')
        ) OR
        EXISTS (
          SELECT 1 FROM strategy_leads sl
          WHERE sl.focus_area_id = sfa.id
          AND sl.user_id = (SELECT auth.uid())
        )
      )
    )
  );

-- strategy_leads policies
DROP POLICY IF EXISTS "Admins and creators can assign leads" ON strategy_leads;
CREATE POLICY "Admins and creators can assign leads"
  ON strategy_leads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM strategy_focus_areas sfa
      JOIN strategies s ON s.id = sfa.strategy_id
      WHERE sfa.id = strategy_leads.focus_area_id
      AND (
        s.creator_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role IN ('admin', 'leadership')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM strategy_focus_areas sfa
      JOIN strategies s ON s.id = sfa.strategy_id
      WHERE sfa.id = strategy_leads.focus_area_id
      AND (
        s.creator_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role IN ('admin', 'leadership')
        )
      )
    )
  );

/*
  # Fix Auth RLS Performance - Review Tables

  1. Purpose
    - Fix RLS policies for review-related tables
    - Wrap auth.uid() calls in SELECT for single evaluation per query

  2. Tables Updated
    - review_cycles
    - review_cycle_members
    - review_cycle_kpis
    - review_cycle_actions
    - review_weekly_kpi_ratings
    - review_employee_actions
    - review_weekly_summaries
    - review_monthly_competency_scores
    - review_monthly_averages
    - review_half_year_assessments
    - review_schedules
    - one_to_one_moderation_queue
*/

-- review_cycles
DROP POLICY IF EXISTS "Managers can create review cycles" ON review_cycles;
CREATE POLICY "Managers can create review cycles"
  ON review_cycles FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update their cycles" ON review_cycles;
CREATE POLICY "Managers can update their cycles"
  ON review_cycles FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their cycles" ON review_cycles;
CREATE POLICY "Users can view their cycles"
  ON review_cycles FOR SELECT
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM review_cycle_members rcm
      WHERE rcm.cycle_id = review_cycles.id
      AND rcm.employee_id = (SELECT auth.uid())
    )
  );

-- review_cycle_members
DROP POLICY IF EXISTS "Managers can delete cycle members" ON review_cycle_members;
CREATE POLICY "Managers can delete cycle members"
  ON review_cycle_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_members.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can update cycle members" ON review_cycle_members;
CREATE POLICY "Managers can update cycle members"
  ON review_cycle_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_members.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_members.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view cycle members" ON review_cycle_members;
CREATE POLICY "Users can view cycle members"
  ON review_cycle_members FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_members.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  );

-- review_cycle_kpis
DROP POLICY IF EXISTS "Managers can delete cycle KPIs" ON review_cycle_kpis;
CREATE POLICY "Managers can delete cycle KPIs"
  ON review_cycle_kpis FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_kpis.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can update cycle KPIs" ON review_cycle_kpis;
CREATE POLICY "Managers can update cycle KPIs"
  ON review_cycle_kpis FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_kpis.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_kpis.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view cycle KPIs" ON review_cycle_kpis;
CREATE POLICY "Users can view cycle KPIs"
  ON review_cycle_kpis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_kpis.cycle_id
      AND (
        rc.manager_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM review_cycle_members rcm
          WHERE rcm.cycle_id = rc.id
          AND rcm.employee_id = (SELECT auth.uid())
        )
      )
    )
  );

-- review_cycle_actions
DROP POLICY IF EXISTS "Managers can delete cycle actions" ON review_cycle_actions;
CREATE POLICY "Managers can delete cycle actions"
  ON review_cycle_actions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_actions.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can update cycle actions" ON review_cycle_actions;
CREATE POLICY "Managers can update cycle actions"
  ON review_cycle_actions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_actions.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_actions.cycle_id
      AND rc.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view cycle actions" ON review_cycle_actions;
CREATE POLICY "Users can view cycle actions"
  ON review_cycle_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_actions.cycle_id
      AND (
        rc.manager_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM review_cycle_members rcm
          WHERE rcm.cycle_id = rc.id
          AND rcm.employee_id = (SELECT auth.uid())
        )
      )
    )
  );

-- review_weekly_kpi_ratings
DROP POLICY IF EXISTS "Managers can create KPI ratings" ON review_weekly_kpi_ratings;
CREATE POLICY "Managers can create KPI ratings"
  ON review_weekly_kpi_ratings FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update KPI ratings" ON review_weekly_kpi_ratings;
CREATE POLICY "Managers can update KPI ratings"
  ON review_weekly_kpi_ratings FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their KPI ratings" ON review_weekly_kpi_ratings;
CREATE POLICY "Users can view their KPI ratings"
  ON review_weekly_kpi_ratings FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid())
  );

-- review_employee_actions
DROP POLICY IF EXISTS "Users can manage their actions" ON review_employee_actions;
CREATE POLICY "Users can manage their actions"
  ON review_employee_actions FOR ALL
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    action_owner = (SELECT auth.uid())
  )
  WITH CHECK (
    employee_id = (SELECT auth.uid()) OR
    action_owner = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can view their actions" ON review_employee_actions;
CREATE POLICY "Users can view their actions"
  ON review_employee_actions FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    action_owner = (SELECT auth.uid())
  );

-- review_weekly_summaries
DROP POLICY IF EXISTS "Managers and HR can update weekly summaries" ON review_weekly_summaries;
CREATE POLICY "Managers and HR can update weekly summaries"
  ON review_weekly_summaries FOR UPDATE
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  )
  WITH CHECK (
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "Managers can create weekly summaries" ON review_weekly_summaries;
CREATE POLICY "Managers can create weekly summaries"
  ON review_weekly_summaries FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their weekly summaries" ON review_weekly_summaries;
CREATE POLICY "Users can view their weekly summaries"
  ON review_weekly_summaries FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid())
  );

-- review_monthly_competency_scores
DROP POLICY IF EXISTS "Managers can manage competency scores" ON review_monthly_competency_scores;
CREATE POLICY "Managers can manage competency scores"
  ON review_monthly_competency_scores FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their competency scores" ON review_monthly_competency_scores;
CREATE POLICY "Users can view their competency scores"
  ON review_monthly_competency_scores FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid())
  );

-- review_monthly_averages
DROP POLICY IF EXISTS "Managers and HR can manage monthly averages" ON review_monthly_averages;
CREATE POLICY "Managers and HR can manage monthly averages"
  ON review_monthly_averages FOR ALL
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  )
  WITH CHECK (
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "Users can view their monthly averages" ON review_monthly_averages;
CREATE POLICY "Users can view their monthly averages"
  ON review_monthly_averages FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid())
  );

-- review_half_year_assessments
DROP POLICY IF EXISTS "System can create half year assessments" ON review_half_year_assessments;
CREATE POLICY "System can create half year assessments"
  ON review_half_year_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership', 'manager')
    )
  );

DROP POLICY IF EXISTS "Users and HR can update half year assessments" ON review_half_year_assessments;
CREATE POLICY "Users and HR can update half year assessments"
  ON review_half_year_assessments FOR UPDATE
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  )
  WITH CHECK (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "Users can view their half year assessments" ON review_half_year_assessments;
CREATE POLICY "Users can view their half year assessments"
  ON review_half_year_assessments FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid())
  );

-- review_schedules
DROP POLICY IF EXISTS "Managers can manage schedules" ON review_schedules;
CREATE POLICY "Managers can manage schedules"
  ON review_schedules FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their schedules" ON review_schedules;
CREATE POLICY "Users can view their schedules"
  ON review_schedules FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    manager_id = (SELECT auth.uid())
  );

-- one_to_one_moderation_queue
DROP POLICY IF EXISTS "Managers can view their submissions in queue" ON one_to_one_moderation_queue;
CREATE POLICY "Managers can view their submissions in queue"
  ON one_to_one_moderation_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews mr
      JOIN one_to_one_scheduled_meetings m ON m.id = mr.meeting_id
      WHERE mr.id = one_to_one_moderation_queue.monthly_review_id
      AND m.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Senior managers can moderate queue items" ON one_to_one_moderation_queue;
CREATE POLICY "Senior managers can moderate queue items"
  ON one_to_one_moderation_queue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  );

/*
  # Fix Auth RLS Performance - Skill Assessment Tables v2

  1. Purpose
    - Fix RLS policies for skill assessment tables
    - Wrap auth.uid() calls in SELECT for single evaluation per query

  2. Tables Updated
    - skill_types
    - role_skills
    - skill_assessment_cycles
    - employee_skill_assessments
    - manager_skill_assessments
    - skill_assessment_discrepancies
    - one_to_one_skill_discussions
    - skill_development_actions
    - skill_rating_scale
    - department_skills_matrix
    - skills_assessment_workflow
    - employee_skills_assessment_responses
    - manager_skills_assessment_responses
    - assessment_approvals
    - assessment_notifications
*/

-- skill_types
DROP POLICY IF EXISTS "Admins can manage skill types" ON skill_types;
CREATE POLICY "Admins can manage skill types"
  ON skill_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- role_skills
DROP POLICY IF EXISTS "Admins can manage role skills" ON role_skills;
CREATE POLICY "Admins can manage role skills"
  ON role_skills FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- skill_assessment_cycles
DROP POLICY IF EXISTS "Admins can manage assessment cycles" ON skill_assessment_cycles;
CREATE POLICY "Admins can manage assessment cycles"
  ON skill_assessment_cycles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- employee_skill_assessments
DROP POLICY IF EXISTS "Admins can view all skill assessments" ON employee_skill_assessments;
CREATE POLICY "Admins can view all skill assessments"
  ON employee_skill_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can manage own skill assessments" ON employee_skill_assessments;
CREATE POLICY "Employees can manage own skill assessments"
  ON employee_skill_assessments FOR ALL
  TO authenticated
  USING (employee_id = (SELECT auth.uid()))
  WITH CHECK (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team skill assessments" ON employee_skill_assessments;
CREATE POLICY "Managers can view team skill assessments"
  ON employee_skill_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

-- manager_skill_assessments
DROP POLICY IF EXISTS "Admins can view all manager assessments" ON manager_skill_assessments;
CREATE POLICY "Admins can view all manager assessments"
  ON manager_skill_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can view own manager assessments" ON manager_skill_assessments;
CREATE POLICY "Employees can view own manager assessments"
  ON manager_skill_assessments FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can manage team skill assessments" ON manager_skill_assessments;
CREATE POLICY "Managers can manage team skill assessments"
  ON manager_skill_assessments FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

-- skill_assessment_discrepancies
DROP POLICY IF EXISTS "Admins can manage all discrepancies" ON skill_assessment_discrepancies;
CREATE POLICY "Admins can manage all discrepancies"
  ON skill_assessment_discrepancies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can view own discrepancies" ON skill_assessment_discrepancies;
CREATE POLICY "Employees can view own discrepancies"
  ON skill_assessment_discrepancies FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update team discrepancies" ON skill_assessment_discrepancies;
CREATE POLICY "Managers can update team discrepancies"
  ON skill_assessment_discrepancies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can view team discrepancies" ON skill_assessment_discrepancies;
CREATE POLICY "Managers can view team discrepancies"
  ON skill_assessment_discrepancies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

-- one_to_one_skill_discussions
DROP POLICY IF EXISTS "Employees can view own skill discussions" ON one_to_one_skill_discussions;
CREATE POLICY "Employees can view own skill discussions"
  ON one_to_one_skill_discussions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews mr
      JOIN one_to_one_scheduled_meetings m ON m.id = mr.meeting_id
      WHERE mr.id = one_to_one_skill_discussions.monthly_review_id
      AND m.employee_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can manage skill discussions" ON one_to_one_skill_discussions;
CREATE POLICY "Managers can manage skill discussions"
  ON one_to_one_skill_discussions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews mr
      JOIN one_to_one_scheduled_meetings m ON m.id = mr.meeting_id
      WHERE mr.id = one_to_one_skill_discussions.monthly_review_id
      AND m.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_monthly_reviews mr
      JOIN one_to_one_scheduled_meetings m ON m.id = mr.meeting_id
      WHERE mr.id = one_to_one_skill_discussions.monthly_review_id
      AND m.manager_id = (SELECT auth.uid())
    )
  );

-- skill_development_actions
DROP POLICY IF EXISTS "Admins can manage all development actions" ON skill_development_actions;
CREATE POLICY "Admins can manage all development actions"
  ON skill_development_actions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can view own development actions" ON skill_development_actions;
CREATE POLICY "Employees can view own development actions"
  ON skill_development_actions FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can manage team development actions" ON skill_development_actions;
CREATE POLICY "Managers can manage team development actions"
  ON skill_development_actions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

-- skill_rating_scale
DROP POLICY IF EXISTS "Admins can manage rating scale" ON skill_rating_scale;
CREATE POLICY "Admins can manage rating scale"
  ON skill_rating_scale FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- department_skills_matrix
DROP POLICY IF EXISTS "Admins can manage department skills matrix" ON department_skills_matrix;
CREATE POLICY "Admins can manage department skills matrix"
  ON department_skills_matrix FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can view own matrix" ON department_skills_matrix;
CREATE POLICY "Employees can view own matrix"
  ON department_skills_matrix FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.department = department_skills_matrix.department
    )
  );

DROP POLICY IF EXISTS "Managers can view team matrix" ON department_skills_matrix;
CREATE POLICY "Managers can view team matrix"
  ON department_skills_matrix FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('manager', 'leadership', 'admin')
    )
  );

-- skills_assessment_workflow
DROP POLICY IF EXISTS "Admins can manage all workflows" ON skills_assessment_workflow;
CREATE POLICY "Admins can manage all workflows"
  ON skills_assessment_workflow FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can view own workflow" ON skills_assessment_workflow;
CREATE POLICY "Employees can view own workflow"
  ON skills_assessment_workflow FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update team workflow" ON skills_assessment_workflow;
CREATE POLICY "Managers can update team workflow"
  ON skills_assessment_workflow FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team workflow" ON skills_assessment_workflow;
CREATE POLICY "Managers can view team workflow"
  ON skills_assessment_workflow FOR SELECT
  TO authenticated
  USING (manager_id = (SELECT auth.uid()));

-- employee_skills_assessment_responses
DROP POLICY IF EXISTS "Admins can view all responses" ON employee_skills_assessment_responses;
CREATE POLICY "Admins can view all responses"
  ON employee_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can manage own responses" ON employee_skills_assessment_responses;
CREATE POLICY "Employees can manage own responses"
  ON employee_skills_assessment_responses FOR ALL
  TO authenticated
  USING (employee_id = (SELECT auth.uid()))
  WITH CHECK (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team responses" ON employee_skills_assessment_responses;
CREATE POLICY "Managers can view team responses"
  ON employee_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

-- manager_skills_assessment_responses
DROP POLICY IF EXISTS "Admins can view all manager responses" ON manager_skills_assessment_responses;
CREATE POLICY "Admins can view all manager responses"
  ON manager_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can view own manager responses" ON manager_skills_assessment_responses;
CREATE POLICY "Employees can view own manager responses"
  ON manager_skills_assessment_responses FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can manage team responses" ON manager_skills_assessment_responses;
CREATE POLICY "Managers can manage team responses"
  ON manager_skills_assessment_responses FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

-- assessment_approvals
DROP POLICY IF EXISTS "Admins can view all approvals" ON assessment_approvals;
CREATE POLICY "Admins can view all approvals"
  ON assessment_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Employees can view own approvals" ON assessment_approvals;
CREATE POLICY "Employees can view own approvals"
  ON assessment_approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM skills_assessment_workflow saw
      WHERE saw.id = assessment_approvals.workflow_id
      AND saw.employee_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can manage approvals" ON assessment_approvals;
CREATE POLICY "Managers can manage approvals"
  ON assessment_approvals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM skills_assessment_workflow saw
      WHERE saw.id = assessment_approvals.workflow_id
      AND saw.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM skills_assessment_workflow saw
      WHERE saw.id = assessment_approvals.workflow_id
      AND saw.manager_id = (SELECT auth.uid())
    )
  );

-- assessment_notifications
DROP POLICY IF EXISTS "Users can update own notifications" ON assessment_notifications;
CREATE POLICY "Users can update own notifications"
  ON assessment_notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own notifications" ON assessment_notifications;
CREATE POLICY "Users can view own notifications"
  ON assessment_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

/*
  # Fix Auth RLS Performance - Career and Strategy Tables

  1. Purpose
    - Fix RLS policies for career and strategy tables
    - Wrap auth.uid() calls in SELECT for single evaluation per query

  2. Tables Updated
    - career_quiz_sessions
    - career_external_qualifications
    - career_skill_self_ratings
    - career_profiles
    - marti_career_coaching_logs
    - one_to_one_reminder_config
    - one_to_one_ai_coaching_config
*/

-- career_quiz_sessions
DROP POLICY IF EXISTS "Admin can view all quiz sessions" ON career_quiz_sessions;
CREATE POLICY "Admin can view all quiz sessions"
  ON career_quiz_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can view team quiz sessions" ON career_quiz_sessions;
CREATE POLICY "Managers can view team quiz sessions"
  ON career_quiz_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create own quiz sessions" ON career_quiz_sessions;
CREATE POLICY "Users can create own quiz sessions"
  ON career_quiz_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own quiz sessions" ON career_quiz_sessions;
CREATE POLICY "Users can update own quiz sessions"
  ON career_quiz_sessions FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own quiz sessions" ON career_quiz_sessions;
CREATE POLICY "Users can view own quiz sessions"
  ON career_quiz_sessions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- career_external_qualifications
DROP POLICY IF EXISTS "Managers can view team qualifications" ON career_external_qualifications;
CREATE POLICY "Managers can view team qualifications"
  ON career_external_qualifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own qualifications" ON career_external_qualifications;
CREATE POLICY "Users can manage own qualifications"
  ON career_external_qualifications FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- career_skill_self_ratings
DROP POLICY IF EXISTS "Managers can view team skill ratings" ON career_skill_self_ratings;
CREATE POLICY "Managers can view team skill ratings"
  ON career_skill_self_ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own skill ratings" ON career_skill_self_ratings;
CREATE POLICY "Users can manage own skill ratings"
  ON career_skill_self_ratings FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- career_profiles
DROP POLICY IF EXISTS "Admin can view all profiles" ON career_profiles;
CREATE POLICY "Admin can view all profiles"
  ON career_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can view team profiles" ON career_profiles;
CREATE POLICY "Managers can view team profiles"
  ON career_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own profile" ON career_profiles;
CREATE POLICY "Users can manage own profile"
  ON career_profiles FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- marti_career_coaching_logs
DROP POLICY IF EXISTS "Admin can view all coaching logs" ON marti_career_coaching_logs;
CREATE POLICY "Admin can view all coaching logs"
  ON marti_career_coaching_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can create own coaching logs" ON marti_career_coaching_logs;
CREATE POLICY "Users can create own coaching logs"
  ON marti_career_coaching_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own coaching logs" ON marti_career_coaching_logs;
CREATE POLICY "Users can view own coaching logs"
  ON marti_career_coaching_logs FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- one_to_one_reminder_config
DROP POLICY IF EXISTS "Admins can manage reminder config" ON one_to_one_reminder_config;
CREATE POLICY "Admins can manage reminder config"
  ON one_to_one_reminder_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- one_to_one_ai_coaching_config
DROP POLICY IF EXISTS "Admins can manage AI coaching config" ON one_to_one_ai_coaching_config;
CREATE POLICY "Admins can manage AI coaching config"
  ON one_to_one_ai_coaching_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

/*
  # Fix User Management Issues

  1. Problem Statement
    - Users signing up via the login screen cannot create profiles (INSERT policy too restrictive)
    - Self-signup users are not visible in the admin user list
    - Delete user edge function fails with "Database error loading user"

  2. Changes
    - Fix profiles INSERT policy to allow self-signup (users can insert their own profile)
    - Ensure user_status_view properly shows all users
    - Add proper cascading deletes

  3. Security
    - Users can only insert profiles for themselves (auth.uid() = id)
    - Admin can insert profiles for any user
    - All other policies remain restrictive
*/

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow users to insert their own profile OR admin to insert any profile
CREATE POLICY "Users can insert own profile or admins can insert any"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Ensure the DELETE policy exists for profiles (allows CASCADE to work)
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Recreate the user_status_view to ensure it shows all users properly
DROP VIEW IF EXISTS user_status_view CASCADE;

CREATE OR REPLACE VIEW user_status_view AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.admin_type,
  p.job_title,
  p.department,
  p.tenure,
  p.manager_id,
  p.job_family_id,
  p.has_strategic_roadmap_access,
  p.active,
  p.created_at,
  au.confirmed_at,
  CASE
    WHEN au.confirmed_at IS NULL THEN 'pending'::text
    WHEN p.active = false THEN 'inactive'::text
    ELSE 'active'::text
  END as status
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id;

-- Grant proper access to the view
GRANT SELECT ON user_status_view TO authenticated;
GRANT SELECT ON user_status_view TO service_role;

-- Add comment explaining the view
COMMENT ON VIEW user_status_view IS 'Combines profiles with auth.users to show complete user status including email confirmation and active status';

/*
  # Fix User Management Policies

  1. Problem Statement
    - Users signing up via the login screen cannot create profiles (INSERT policy too restrictive)
    - Delete user functionality fails with database errors

  2. Changes
    - Fix profiles INSERT policy to allow self-signup
    - Fix profiles DELETE policy to allow admin deletion

  3. Security
    - Users can only insert profiles for themselves (auth.uid() = id)
    - Admin can insert profiles for any user
    - Only admins can delete profiles
*/

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile or admins can insert any" ON profiles;

-- Allow users to insert their own profile OR admin to insert any profile
CREATE POLICY "Users can insert own profile or admins can insert any"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Ensure the DELETE policy exists for profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
/*
  # Cleanup Duplicate INSERT Policies

  1. Problem
    - Multiple INSERT policies exist on profiles table
    - Need to keep only the correct one

  2. Changes
    - Remove old "Users can create own profile" policy
    - Keep "Users can insert own profile or admins can insert any"

  3. Security
    - Maintains secure INSERT policy allowing self-signup and admin creation
*/

-- Remove the old duplicate policy
DROP POLICY IF EXISTS "Users can create own profile" ON profiles;

-- Verify the correct policy exists (this is idempotent)
DROP POLICY IF EXISTS "Users can insert own profile or admins can insert any" ON profiles;

CREATE POLICY "Users can insert own profile or admins can insert any"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
/*
  # Restore Nicola's Admin Account - Simple Approach

  1. Purpose
    - Create new admin account for nicola.hurcombe@eposnow.com
    - Will need password reset email sent after creation

  2. Approach
    - Insert auth user directly
    - Insert profile
    - User can then reset password via email
*/

-- Insert into auth.users with a unique ID
WITH new_user AS (
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_sent_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    is_sso_user,
    confirmation_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'nicola.hurcombe@eposnow.com',
    crypt('temporary_secure_' || encode(gen_random_bytes(32), 'hex'), gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Nicola Hurcombe"}',
    false,
    now(),
    now(),
    false,
    encode(gen_random_bytes(32), 'hex')
  )
  RETURNING id, email
)
-- Insert identity
, new_identity AS (
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  SELECT
    id,
    id,
    id::text,
    jsonb_build_object(
      'sub', id::text,
      'email', email,
      'email_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  FROM new_user
  RETURNING user_id
)
-- Insert profile
INSERT INTO profiles (
  id,
  email,
  full_name,
  role,
  department,
  tenure,
  created_at
)
SELECT
  id,
  email,
  'Nicola Hurcombe',
  'admin',
  'Administration',
  0,
  now()
FROM new_user;
/*
  # Reset Nicola's Password to 'admin123'

  1. Purpose
    - Reset password for nicola.hurcombe@eposnow.com to 'admin123'
    - Allow immediate login access to admin account

  2. Security Note
    - This is a temporary password that should be changed after first login
*/

-- Update password for nicola.hurcombe@eposnow.com
UPDATE auth.users
SET 
  encrypted_password = crypt('admin123', gen_salt('bf')),
  updated_at = now()
WHERE email = 'nicola.hurcombe@eposnow.com';

