/*
  # Fix user_admin_permissions SELECT Policy

  1. Problem
    - Users cannot view their own permissions during login
    - Only admins can SELECT from user_admin_permissions
    - This causes 500 errors when non-admin users log in

  2. Solution
    - Add policy allowing users to view their own permissions
    - Keep admin policy for viewing all permissions

  3. Security
    - Users can only see their own permission records
    - Admins can see all permissions
*/

-- Add policy for users to view their own permissions
CREATE POLICY "Users can view own permissions"
  ON user_admin_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

/*
  # Fix Admin User Management Permissions

  This migration fixes the permissions issues with user deactivation and deletion:

  1. Updates RLS policies for profiles table to properly check admin permissions
  2. Ensures admins with any admin_type can manage users
  3. Simplifies the admin check to avoid nested EXISTS queries that may fail

  ## Changes

  - Drop existing admin UPDATE and DELETE policies
  - Create new streamlined policies that properly check admin role
  - Add helper function to check if user is admin
*/

-- Create a helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
      AND role = 'admin'
  );
$$;

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Create new admin policies using the helper function
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (is_user_admin())
  WITH CHECK (is_user_admin());

CREATE POLICY "Admins can delete profiles"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (is_user_admin());

/*
  # Fix Profiles Update Trigger Error

  This migration fixes the "record 'new' has no field 'updated_at'" error when updating profiles.

  ## Problem
  - A trigger was trying to set an `updated_at` column that doesn't exist on the profiles table
  - This was causing all profile updates to fail with error code 42703

  ## Solution
  - Drop the problematic trigger from the profiles table
  - The profiles table doesn't need an updated_at column for the current functionality
*/

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

/*
  # Add quarter and summary fields to one_to_one_review_cycles

  1. Changes
    - Add `quarter` column (e.g., "Q1 2025") to identify the cycle period
    - Add `summary` column for the cycle-level summary/objectives text

  These fields support the manager setting a cycle for the entire team with a quarter label and overall summary.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'quarter'
  ) THEN
    ALTER TABLE one_to_one_review_cycles ADD COLUMN quarter text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'summary'
  ) THEN
    ALTER TABLE one_to_one_review_cycles ADD COLUMN summary text;
  END IF;
END $$;

/*
  # Add oto_cycle_id to one_to_one_scheduled_meetings

  ## Summary
  The existing `cycle_id` column references the general `review_cycles` table.
  We need a separate column to link scheduled meetings to `one_to_one_review_cycles`.

  ## Changes
  - Add `oto_cycle_id` (uuid, nullable) to `one_to_one_scheduled_meetings` with FK to `one_to_one_review_cycles`
  - Drop the existing unique constraint `(cycle_id, employee_id)` which was preventing multiple meetings per employee
  - Add a new unique constraint on `(oto_cycle_id, employee_id)` so each employee only has one scheduled meeting per one-to-one cycle
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_scheduled_meetings' AND column_name = 'oto_cycle_id'
  ) THEN
    ALTER TABLE one_to_one_scheduled_meetings
      ADD COLUMN oto_cycle_id uuid REFERENCES one_to_one_review_cycles(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE one_to_one_scheduled_meetings
  DROP CONSTRAINT IF EXISTS one_to_one_scheduled_meetings_cycle_id_employee_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'one_to_one_scheduled_meetings_oto_cycle_employee_key'
  ) THEN
    ALTER TABLE one_to_one_scheduled_meetings
      ADD CONSTRAINT one_to_one_scheduled_meetings_oto_cycle_employee_key
      UNIQUE (oto_cycle_id, employee_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_one_to_one_meetings_oto_cycle_id
  ON one_to_one_scheduled_meetings(oto_cycle_id);

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

/*
  # Fix RLS Auth Performance on user_admin_permissions

  ## Summary
  Replaces bare `auth.uid()` with `(select auth.uid())` in the
  "Users can view own permissions" policy to prevent per-row re-evaluation.
  Also consolidates the duplicate SELECT policies (Admins can view all permissions
  is redundant given Admins can manage permissions covers ALL operations).

  ## Changes
  - Drop "Users can view own permissions" and recreate with subselect pattern
  - Drop redundant "Admins can view all permissions" policy (covered by ALL policy)
*/

DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_admin_permissions;
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.user_admin_permissions;

CREATE POLICY "Users can view own permissions"
  ON public.user_admin_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

/*
  # Consolidate Multiple Permissive SELECT Policies - Part 1

  ## Summary
  Multiple permissive SELECT policies on the same table cause Postgres to evaluate
  all of them and OR the results, which is less efficient than a single merged policy.
  This migration consolidates duplicate SELECT policies into single unified policies.

  ## Strategy
  - For tables with ALL + SELECT policies where the SELECT is redundant (ALL covers SELECT): drop the separate SELECT
  - For tables with two complementary SELECT policies (user owns + manager sees team): merge into one OR policy
  - For tables with "Anyone can view" + admin manage: the "Anyone can view" is the only SELECT needed

  ## Tables fixed in this part
  access_level_types, action_items, ai_quiz_preferences, assessment_cycles,
  career_pathways, career_plan_milestones, career_plans, competency_categories,
  competency_frameworks, copilot_config, cycle_actions, cycle_kpis,
  goal_actions, goal_departments, goal_kpis, job_families, job_history
*/

-- access_level_types: "Anyone can view" is redundant with admin ALL policy; keep single SELECT for authenticated
DROP POLICY IF EXISTS "Anyone can view access level types" ON public.access_level_types;
CREATE POLICY "Authenticated can view access level types"
  ON public.access_level_types FOR SELECT TO authenticated
  USING (is_active = true);

-- action_items: ALL policy covers SELECT for owner; "Managers can view" is extra; merge
DROP POLICY IF EXISTS "Users can view own action items" ON public.action_items;
DROP POLICY IF EXISTS "Managers can view team action items" ON public.action_items;
CREATE POLICY "Users and managers can view action items"
  ON public.action_items FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.manager_id = (SELECT auth.uid()) AND p.id = action_items.owner_id
    )
  );

-- ai_quiz_preferences: ALL covers user SELECT; merge admin view into one
DROP POLICY IF EXISTS "Users can view own quiz preferences" ON public.ai_quiz_preferences;
DROP POLICY IF EXISTS "Admins can view all quiz preferences" ON public.ai_quiz_preferences;
CREATE POLICY "Users and admins can view quiz preferences"
  ON public.ai_quiz_preferences FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::user_role
    )
  );

-- assessment_cycles: USING(true) allows all authenticated; keep single policy
DROP POLICY IF EXISTS "Anyone can view cycles" ON public.assessment_cycles;
CREATE POLICY "Authenticated can view assessment cycles"
  ON public.assessment_cycles FOR SELECT TO authenticated
  USING (true);

-- career_pathways: same
DROP POLICY IF EXISTS "Anyone can view pathways" ON public.career_pathways;
CREATE POLICY "Authenticated can view career pathways"
  ON public.career_pathways FOR SELECT TO authenticated
  USING (true);

-- career_plan_milestones: ALL covers user SELECT; drop the separate SELECT
DROP POLICY IF EXISTS "Users can view own milestones" ON public.career_plan_milestones;

-- career_plans: ALL covers user SELECT; merge manager view
DROP POLICY IF EXISTS "Users can view own career plans" ON public.career_plans;
DROP POLICY IF EXISTS "Managers can view team career plans" ON public.career_plans;
CREATE POLICY "Users and managers can view career plans"
  ON public.career_plans FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = career_plans.profile_id AND p.manager_id = (SELECT auth.uid())
    )
  );

-- competency_categories: single authenticated policy
DROP POLICY IF EXISTS "Anyone can view categories" ON public.competency_categories;
CREATE POLICY "Authenticated can view competency categories"
  ON public.competency_categories FOR SELECT TO authenticated
  USING (true);

-- competency_frameworks
DROP POLICY IF EXISTS "Anyone can view frameworks" ON public.competency_frameworks;
CREATE POLICY "Authenticated can view competency frameworks"
  ON public.competency_frameworks FOR SELECT TO authenticated
  USING (true);

-- copilot_config
DROP POLICY IF EXISTS "Anyone can view copilot config" ON public.copilot_config;
CREATE POLICY "Authenticated can view copilot config"
  ON public.copilot_config FOR SELECT TO authenticated
  USING (true);

-- cycle_actions
DROP POLICY IF EXISTS "Anyone can view cycle actions" ON public.cycle_actions;
CREATE POLICY "Authenticated can view cycle actions"
  ON public.cycle_actions FOR SELECT TO authenticated
  USING (true);

-- cycle_kpis
DROP POLICY IF EXISTS "Anyone can view cycle KPIs" ON public.cycle_kpis;
CREATE POLICY "Authenticated can view cycle KPIs"
  ON public.cycle_kpis FOR SELECT TO authenticated
  USING (true);

-- goal_actions
DROP POLICY IF EXISTS "Anyone can view goal actions" ON public.goal_actions;
CREATE POLICY "Authenticated can view goal actions"
  ON public.goal_actions FOR SELECT TO authenticated
  USING (true);

-- goal_departments
DROP POLICY IF EXISTS "Anyone can view goal departments" ON public.goal_departments;
CREATE POLICY "Authenticated can view goal departments"
  ON public.goal_departments FOR SELECT TO authenticated
  USING (true);

-- goal_kpis
DROP POLICY IF EXISTS "Anyone can view goal KPIs" ON public.goal_kpis;
CREATE POLICY "Authenticated can view goal KPIs"
  ON public.goal_kpis FOR SELECT TO authenticated
  USING (true);

-- job_families
DROP POLICY IF EXISTS "Anyone can view job families" ON public.job_families;
CREATE POLICY "Authenticated can view job families"
  ON public.job_families FOR SELECT TO authenticated
  USING (true);

-- job_history: ALL(admin) covers admin SELECT; merge user + manager
DROP POLICY IF EXISTS "Users can view own job history" ON public.job_history;
DROP POLICY IF EXISTS "Managers can view team job history" ON public.job_history;
CREATE POLICY "Users managers and admins can view job history"
  ON public.job_history FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = job_history.profile_id AND p.manager_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::user_role
    )
  );

/*
  # Consolidate Multiple Permissive SELECT Policies - Part 2

  ## Tables fixed
  matrix_assignments, matrix_skills, module_content_items, one_to_one_meetings,
  performance_ratings, profile_skills, progression_criteria, review_competency_ratings,
  review_cycles, review_form_templates, review_goal_progress, review_instances,
  review_items, review_kpi_templates, review_kpis, review_monthly_sessions,
  review_responses, review_template_questions, review_template_sections,
  review_weekly_checkins, reviews
*/

-- matrix_assignments
DROP POLICY IF EXISTS "Anyone can view assignments" ON public.matrix_assignments;
CREATE POLICY "Authenticated can view matrix assignments"
  ON public.matrix_assignments FOR SELECT TO authenticated
  USING (true);

-- matrix_skills
DROP POLICY IF EXISTS "Anyone can view matrix skills" ON public.matrix_skills;
CREATE POLICY "Authenticated can view matrix skills"
  ON public.matrix_skills FOR SELECT TO authenticated
  USING (true);

-- module_content_items
DROP POLICY IF EXISTS "Anyone can view content items" ON public.module_content_items;
CREATE POLICY "Authenticated can view module content items"
  ON public.module_content_items FOR SELECT TO authenticated
  USING (true);

-- one_to_one_meetings: merge user + manager into one OR
DROP POLICY IF EXISTS "Users can view own meetings" ON public.one_to_one_meetings;
DROP POLICY IF EXISTS "Managers can view team meetings" ON public.one_to_one_meetings;
CREATE POLICY "Users and managers can view one to one meetings"
  ON public.one_to_one_meetings FOR SELECT TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
    OR manager_id = (SELECT auth.uid())
  );

-- performance_ratings: merge user + manager
DROP POLICY IF EXISTS "Users can view own ratings" ON public.performance_ratings;
DROP POLICY IF EXISTS "Managers can view team ratings" ON public.performance_ratings;
CREATE POLICY "Users and managers can view performance ratings"
  ON public.performance_ratings FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = performance_ratings.profile_id AND p.manager_id = (SELECT auth.uid())
    )
  );

-- profile_skills: USING(true) - single policy
DROP POLICY IF EXISTS "Users can view all profile skills" ON public.profile_skills;
CREATE POLICY "Authenticated can view profile skills"
  ON public.profile_skills FOR SELECT TO authenticated
  USING (true);

-- progression_criteria
DROP POLICY IF EXISTS "Anyone can view progression criteria" ON public.progression_criteria;
CREATE POLICY "Authenticated can view progression criteria"
  ON public.progression_criteria FOR SELECT TO authenticated
  USING (true);

-- review_competency_ratings: ALL(manager) covers manager; add user view
DROP POLICY IF EXISTS "Users can view competency ratings" ON public.review_competency_ratings;
CREATE POLICY "Users and managers can view competency ratings"
  ON public.review_competency_ratings FOR SELECT TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM review_instances ri
      WHERE ri.id = review_competency_ratings.review_id AND ri.manager_id = (SELECT auth.uid())
    )
  );

-- review_cycles
DROP POLICY IF EXISTS "Anyone can view cycles" ON public.review_cycles;
CREATE POLICY "Authenticated can view review cycles"
  ON public.review_cycles FOR SELECT TO authenticated
  USING (true);

-- review_form_templates
DROP POLICY IF EXISTS "Anyone can view templates" ON public.review_form_templates;
CREATE POLICY "Authenticated can view review form templates"
  ON public.review_form_templates FOR SELECT TO authenticated
  USING (true);

-- review_goal_progress: ALL covers user; drop redundant SELECT
DROP POLICY IF EXISTS "Users can view goal progress" ON public.review_goal_progress;

-- review_instances: merge employee + manager
DROP POLICY IF EXISTS "Users can view own review instances" ON public.review_instances;
DROP POLICY IF EXISTS "Managers can view team review instances" ON public.review_instances;
CREATE POLICY "Users and managers can view review instances"
  ON public.review_instances FOR SELECT TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
    OR manager_id = (SELECT auth.uid())
  );

-- review_items: ALL(manager) covers manager; add employee view
DROP POLICY IF EXISTS "Users can view review items for accessible reviews" ON public.review_items;
CREATE POLICY "Users and managers can view review items"
  ON public.review_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_items.review_id
        AND (r.employee_id = (SELECT auth.uid()) OR r.manager_id = (SELECT auth.uid()))
    )
  );

-- review_kpi_templates: ALL covers manager; drop redundant SELECT
DROP POLICY IF EXISTS "Managers can view KPI templates" ON public.review_kpi_templates;

-- review_kpis: ALL(manager by created_by) covers their view; merge employee view
DROP POLICY IF EXISTS "Users can view their KPIs" ON public.review_kpis;
CREATE POLICY "Users and managers can view review KPIs"
  ON public.review_kpis FOR SELECT TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
    OR created_by = (SELECT auth.uid())
  );

-- review_monthly_sessions: ALL(manager) covers manager; add employee view
DROP POLICY IF EXISTS "Users can view their monthly reviews" ON public.review_monthly_sessions;
CREATE POLICY "Users and managers can view monthly sessions"
  ON public.review_monthly_sessions FOR SELECT TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
    OR manager_id = (SELECT auth.uid())
  );

-- review_responses: ALL(manager) covers manager; add employee view
DROP POLICY IF EXISTS "Users can view own review responses" ON public.review_responses;
CREATE POLICY "Users and managers can view review responses"
  ON public.review_responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_instances ri
      WHERE ri.id = review_responses.instance_id
        AND (ri.employee_id = (SELECT auth.uid()) OR ri.manager_id = (SELECT auth.uid()))
    )
  );

-- review_template_questions
DROP POLICY IF EXISTS "Anyone can view questions" ON public.review_template_questions;
CREATE POLICY "Authenticated can view review template questions"
  ON public.review_template_questions FOR SELECT TO authenticated
  USING (true);

-- review_template_sections
DROP POLICY IF EXISTS "Anyone can view sections" ON public.review_template_sections;
CREATE POLICY "Authenticated can view review template sections"
  ON public.review_template_sections FOR SELECT TO authenticated
  USING (true);

-- review_weekly_checkins: ALL covers user; drop redundant SELECT
DROP POLICY IF EXISTS "Users can view their weekly checkins" ON public.review_weekly_checkins;

-- reviews: merge user + manager/leadership
DROP POLICY IF EXISTS "Users can view own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Managers can view team reviews" ON public.reviews;
CREATE POLICY "Users managers and leadership can view reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
    OR manager_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY(ARRAY['leadership'::user_role, 'admin'::user_role])
    )
  );

/*
  # Consolidate Multiple Permissive SELECT Policies - Part 3

  ## Tables fixed
  skill_assessments, skill_categories, skill_development_plans, skill_ratings,
  skill_types, skills, skills_master, skills_matrices, skills_matrix,
  strategic_goals, training_completions, training_courses,
  training_module_job_family_links, training_modules, training_sessions,
  user_access_levels, user_admin_permissions, profiles (UPDATE duplicate)
*/

-- skill_assessments: merge user + manager
DROP POLICY IF EXISTS "Users can view own assessments" ON public.skill_assessments;
DROP POLICY IF EXISTS "Managers can view team assessments" ON public.skill_assessments;
CREATE POLICY "Users and managers can view skill assessments"
  ON public.skill_assessments FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = skill_assessments.profile_id AND p.manager_id = (SELECT auth.uid())
    )
  );

-- skill_categories
DROP POLICY IF EXISTS "Anyone can view categories" ON public.skill_categories;
CREATE POLICY "Authenticated can view skill categories"
  ON public.skill_categories FOR SELECT TO authenticated
  USING (true);

-- skill_development_plans: ALL covers user; merge manager
DROP POLICY IF EXISTS "Users can view own development plans" ON public.skill_development_plans;
DROP POLICY IF EXISTS "Managers can view team development plans" ON public.skill_development_plans;
CREATE POLICY "Users and managers can view skill development plans"
  ON public.skill_development_plans FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = skill_development_plans.profile_id AND p.manager_id = (SELECT auth.uid())
    )
  );

-- skill_ratings: ALL(admin) covers admin; merge user + manager + admin into one
DROP POLICY IF EXISTS "Users can view own ratings" ON public.skill_ratings;
DROP POLICY IF EXISTS "Managers can view team ratings" ON public.skill_ratings;
DROP POLICY IF EXISTS "Admins can view all ratings" ON public.skill_ratings;
CREATE POLICY "Users managers and admins can view skill ratings"
  ON public.skill_ratings FOR SELECT TO authenticated
  USING (
    employee_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = skill_ratings.employee_id AND p.manager_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::user_role
    )
  );

-- skill_types
DROP POLICY IF EXISTS "Anyone can view skill types" ON public.skill_types;
CREATE POLICY "Authenticated can view skill types"
  ON public.skill_types FOR SELECT TO authenticated
  USING (true);

-- skills
DROP POLICY IF EXISTS "Anyone can view skills" ON public.skills;
CREATE POLICY "Authenticated can view skills"
  ON public.skills FOR SELECT TO authenticated
  USING (true);

-- skills_master
DROP POLICY IF EXISTS "Anyone can view skills" ON public.skills_master;
CREATE POLICY "Authenticated can view skills master"
  ON public.skills_master FOR SELECT TO authenticated
  USING (true);

-- skills_matrices
DROP POLICY IF EXISTS "Anyone can view matrices" ON public.skills_matrices;
CREATE POLICY "Authenticated can view skills matrices"
  ON public.skills_matrices FOR SELECT TO authenticated
  USING (true);

-- skills_matrix
DROP POLICY IF EXISTS "Anyone can view skills matrix" ON public.skills_matrix;
CREATE POLICY "Authenticated can view skills matrix"
  ON public.skills_matrix FOR SELECT TO authenticated
  USING (true);

-- strategic_goals
DROP POLICY IF EXISTS "Anyone can view strategic goals" ON public.strategic_goals;
CREATE POLICY "Authenticated can view strategic goals"
  ON public.strategic_goals FOR SELECT TO authenticated
  USING (true);

-- training_completions: ALL covers user; merge manager
DROP POLICY IF EXISTS "Users can view own completions" ON public.training_completions;
DROP POLICY IF EXISTS "Managers can view team completions" ON public.training_completions;
CREATE POLICY "Users and managers can view training completions"
  ON public.training_completions FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = training_completions.profile_id AND p.manager_id = (SELECT auth.uid())
    )
  );

-- training_courses
DROP POLICY IF EXISTS "Anyone can view courses" ON public.training_courses;
CREATE POLICY "Authenticated can view training courses"
  ON public.training_courses FOR SELECT TO authenticated
  USING (true);

-- training_module_job_family_links
DROP POLICY IF EXISTS "Anyone can view training links" ON public.training_module_job_family_links;
CREATE POLICY "Authenticated can view training module job family links"
  ON public.training_module_job_family_links FOR SELECT TO authenticated
  USING (true);

-- training_modules
DROP POLICY IF EXISTS "Anyone can view modules" ON public.training_modules;
CREATE POLICY "Authenticated can view training modules"
  ON public.training_modules FOR SELECT TO authenticated
  USING (true);

-- training_sessions
DROP POLICY IF EXISTS "Anyone can view training sessions" ON public.training_sessions;
CREATE POLICY "Authenticated can view training sessions"
  ON public.training_sessions FOR SELECT TO authenticated
  USING (true);

-- user_access_levels: ALL(admin) covers admin view; merge user + admin
DROP POLICY IF EXISTS "Users can view own access levels" ON public.user_access_levels;
DROP POLICY IF EXISTS "Admins can view all access levels" ON public.user_access_levels;
CREATE POLICY "Users and admins can view access levels"
  ON public.user_access_levels FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'::user_role
    )
  );

-- user_admin_permissions: "Admins can manage permissions" (ALL) covers admin SELECT; "Users can view own" is already single
-- Consolidate: the ALL policy covers admin SELECT already; user policy remains as is
-- No additional changes needed here since we already dropped Admins can view all permissions in previous migration

/*
  # Consolidate profiles UPDATE policies

  ## Summary
  The profiles table has two permissive UPDATE policies which both fire per row.
  Merge "Users can update own profile" and "Admins can update all profiles" into a single policy.

  ## Changes
  - Drop both existing UPDATE policies
  - Create a single merged UPDATE policy using OR condition
*/

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users and admins can update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR is_user_admin()
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR is_user_admin()
  );

/*
  # Create Weekly Check-ins and Monthly Reviews Tables

  ## Summary
  Creates the core tables needed for the one-to-one review workflow:
  weekly check-ins (with KPI scoring per check-in) and monthly reviews
  (with aggregated KPI scores and role-based competency/values ratings).

  ## New Tables

  ### one_to_one_weekly_checkins
  - Links to one_to_one_scheduled_meetings
  - Stores per-KPI manager scores (0-5) and comments via kpi_discussion JSONB
  - Tracks short-term actions and overall weekly summary
  - performance_score uses 0-5 scale globally

  ### one_to_one_monthly_reviews
  - Links to one_to_one_scheduled_meetings
  - Aggregates average KPI score from weekly check-ins
  - Stores competency ratings (role-based, from job_family_competencies)
  - Stores values ratings (org-wide values with 0-5 scale)

  ## Scoring Scale (applied globally)
  0 = New to role, 1 = Development needed, 2 = Requires guidance,
  3 = On target, 4 = Exceeding, 5 = Exceptional

  ## Security
  - RLS enabled on all tables
  - Managers can manage their team's records
  - Employees can view their own records
*/

CREATE TABLE IF NOT EXISTS one_to_one_weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES one_to_one_scheduled_meetings(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  week_starting date NOT NULL,
  week_number integer,
  kpi_discussion jsonb DEFAULT '{}'::jsonb,
  previous_actions_review jsonb DEFAULT '{}'::jsonb,
  short_term_actions text[] DEFAULT '{}',
  summary text DEFAULT '',
  performance_score integer DEFAULT 3 CHECK (performance_score >= 0 AND performance_score <= 5),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (meeting_id, employee_id, week_starting)
);

ALTER TABLE one_to_one_weekly_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage team weekly checkins"
  ON one_to_one_weekly_checkins FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

CREATE POLICY "Employees can view own weekly checkins"
  ON one_to_one_weekly_checkins FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_weekly_checkins_meeting_id ON one_to_one_weekly_checkins(meeting_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_employee_id ON one_to_one_weekly_checkins(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_checkins_week_starting ON one_to_one_weekly_checkins(week_starting);

CREATE TABLE IF NOT EXISTS one_to_one_monthly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES one_to_one_scheduled_meetings(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  review_month date NOT NULL,
  average_weekly_performance numeric,
  average_kpi_score numeric,
  kpi_ratings jsonb DEFAULT '{}'::jsonb,
  overall_competency_score numeric,
  competency_ratings jsonb DEFAULT '[]'::jsonb,
  values_ratings jsonb DEFAULT '[]'::jsonb,
  manager_summary text DEFAULT '',
  previous_agenda_items text[] DEFAULT '{}',
  requires_moderation boolean DEFAULT false,
  moderation_status text DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (meeting_id, employee_id, review_month)
);

ALTER TABLE one_to_one_monthly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage team monthly reviews"
  ON one_to_one_monthly_reviews FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

CREATE POLICY "Employees can view own monthly reviews"
  ON one_to_one_monthly_reviews FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_monthly_reviews_meeting_id ON one_to_one_monthly_reviews(meeting_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reviews_employee_id ON one_to_one_monthly_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_monthly_reviews_review_month ON one_to_one_monthly_reviews(review_month);

/*
  # Moderation Workflow System

  ## Summary
  Creates a configurable moderation workflow that triggers when KPI or competency ratings
  are 4 or 5 (exceeding expectations). Supports multi-step approval chains with AI
  summarisation for approvers.

  ## New Tables

  ### moderation_workflow_configs
  - Admin-configurable workflow definitions with trigger conditions

  ### moderation_workflow_steps
  - Ordered steps with assigned roles for each workflow

  ### moderation_cases
  - Auto-created when rating meets trigger threshold
  - Tracks AI validation, manager justification, and approval status

  ### moderation_case_decisions
  - Records each approver's decision at each step

  ## Security
  - RLS on all tables
  - Managers create/view own cases; dept leads and leadership approve
*/

CREATE TABLE IF NOT EXISTS moderation_workflow_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  trigger_field text NOT NULL DEFAULT 'rating',
  trigger_operator text NOT NULL DEFAULT 'gte',
  trigger_value numeric NOT NULL DEFAULT 4,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moderation_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES moderation_workflow_configs(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  step_name text NOT NULL,
  assigned_role text NOT NULL,
  description text DEFAULT '',
  requires_justification boolean NOT NULL DEFAULT true,
  allow_rating_adjustment boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(workflow_id, step_number)
);

CREATE TABLE IF NOT EXISTS moderation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES moderation_workflow_configs(id) ON DELETE RESTRICT,
  source_type text NOT NULL CHECK (source_type IN ('kpi_rating', 'competency_assessment')),
  source_id uuid NOT NULL,
  meeting_id uuid,
  employee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  original_rating numeric NOT NULL,
  current_rating numeric NOT NULL,
  manager_justification text DEFAULT '',
  ai_validation_status text NOT NULL DEFAULT 'pending' CHECK (ai_validation_status IN ('pending', 'validated', 'flagged', 'overridden')),
  ai_validation_notes text DEFAULT '',
  ai_summary text DEFAULT '',
  manager_override boolean NOT NULL DEFAULT false,
  manager_override_notes text DEFAULT '',
  current_step integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'adjusted')),
  final_rating numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moderation_case_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES moderation_cases(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  step_name text NOT NULL,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision text NOT NULL CHECK (decision IN ('approve', 'reject', 'adjust_rating', 'request_more_info')),
  notes text DEFAULT '',
  adjusted_rating numeric,
  decided_at timestamptz DEFAULT now()
);

ALTER TABLE moderation_workflow_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_case_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view workflow configs"
  ON moderation_workflow_configs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins insert workflow configs"
  ON moderation_workflow_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership'))
  );

CREATE POLICY "Admins update workflow configs"
  ON moderation_workflow_configs FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')));

CREATE POLICY "Admins delete workflow configs"
  ON moderation_workflow_configs FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')));

CREATE POLICY "All view workflow steps"
  ON moderation_workflow_steps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage workflow steps insert"
  ON moderation_workflow_steps FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')));

CREATE POLICY "Admins manage workflow steps update"
  ON moderation_workflow_steps FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')));

CREATE POLICY "Admins manage workflow steps delete"
  ON moderation_workflow_steps FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')));

CREATE POLICY "View own and approver moderation cases"
  ON moderation_cases FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR employee_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership', 'dept_lead', 'senior'))
  );

CREATE POLICY "Managers create moderation cases"
  ON moderation_cases FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Managers and approvers update moderation cases"
  ON moderation_cases FOR UPDATE
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership', 'dept_lead', 'senior'))
  )
  WITH CHECK (
    manager_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership', 'dept_lead', 'senior'))
  );

CREATE POLICY "View relevant moderation decisions"
  ON moderation_case_decisions FOR SELECT
  TO authenticated
  USING (
    decided_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM moderation_cases mc
      WHERE mc.id = case_id AND (mc.manager_id = auth.uid() OR mc.employee_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership', 'dept_lead', 'senior'))
  );

CREATE POLICY "Approvers insert decisions"
  ON moderation_case_decisions FOR INSERT
  TO authenticated
  WITH CHECK (decided_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_moderation_cases_manager_id ON moderation_cases(manager_id);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_employee_id ON moderation_cases(employee_id);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_status ON moderation_cases(status);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_workflow_id ON moderation_cases(workflow_id);
CREATE INDEX IF NOT EXISTS idx_moderation_workflow_steps_workflow_id ON moderation_workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_moderation_case_decisions_case_id ON moderation_case_decisions(case_id);

INSERT INTO moderation_workflow_configs (name, description, trigger_field, trigger_operator, trigger_value, is_active)
VALUES (
  'Default High Rating Workflow',
  'Standard two-step moderation for ratings of 4 or 5 (exceeding expectations)',
  'rating',
  'gte',
  4,
  true
)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  v_config_id uuid;
BEGIN
  SELECT id INTO v_config_id FROM moderation_workflow_configs WHERE name = 'Default High Rating Workflow' LIMIT 1;

  IF v_config_id IS NOT NULL THEN
    INSERT INTO moderation_workflow_steps (workflow_id, step_number, step_name, assigned_role, description, requires_justification, allow_rating_adjustment)
    VALUES
      (v_config_id, 1, 'Department Lead Review', 'dept_lead', 'Department Lead reviews the rating and justification, then approves or rejects', true, false),
      (v_config_id, 2, 'Executive Review', 'leadership', 'Executive reviews and can approve or adjust the final rating', true, true)
    ON CONFLICT (workflow_id, step_number) DO NOTHING;
  END IF;
END $$;

/*
  # Update Competency Structure and Add competency_level to Profiles

  ## Summary
  This migration replaces the old competency level structure (positive/negative statements, 
  job family dependencies) with a new role-aware structure tied directly to values.

  ## Changes

  ### 1. competencies table
  - Drop old `competency_levels` table dependencies (levels table renamed to new structure)
  - Add new fields directly to `competencies`:
    - `competency_statement` — the overall competency statement
    - `employee_evidence_prompt` — prompt shown to employees
    - `employee_what_good_looks_like` — good performance description for employees
    - `employee_what_great_looks_like` — great performance description for employees
    - `manager_evidence_prompt` — prompt shown to managers
    - `manager_what_good_looks_like` — good performance description for managers
    - `manager_what_great_looks_like` — great performance description for managers
    - `senior_leader_evidence_prompt` — prompt shown to senior leaders
    - `senior_leader_what_good_looks_like` — good performance description for senior leaders
    - `senior_leader_what_great_looks_like` — great performance description for senior leaders

  ### 2. profiles table
  - Add `competency_level` column: text, values 'Employee' | 'Manager' | 'Senior Leader', default 'Employee'

  ### 3. Backfill
  - Set competency_level = 'Employee' for all profiles where null

  ### Notes
  - The old competency_levels table and job_family_competencies table are NOT dropped
    to preserve existing data (role profiles remain intact)
  - New fields allow null so existing competency records don't break
  - The review forms will use competency_level on the user profile to determine 
    which prompt/description to display
*/

-- Add new fields to competencies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'competency_statement'
  ) THEN
    ALTER TABLE competencies ADD COLUMN competency_statement text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'employee_evidence_prompt'
  ) THEN
    ALTER TABLE competencies ADD COLUMN employee_evidence_prompt text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'employee_what_good_looks_like'
  ) THEN
    ALTER TABLE competencies ADD COLUMN employee_what_good_looks_like text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'employee_what_great_looks_like'
  ) THEN
    ALTER TABLE competencies ADD COLUMN employee_what_great_looks_like text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'manager_evidence_prompt'
  ) THEN
    ALTER TABLE competencies ADD COLUMN manager_evidence_prompt text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'manager_what_good_looks_like'
  ) THEN
    ALTER TABLE competencies ADD COLUMN manager_what_good_looks_like text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'manager_what_great_looks_like'
  ) THEN
    ALTER TABLE competencies ADD COLUMN manager_what_great_looks_like text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'senior_leader_evidence_prompt'
  ) THEN
    ALTER TABLE competencies ADD COLUMN senior_leader_evidence_prompt text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'senior_leader_what_good_looks_like'
  ) THEN
    ALTER TABLE competencies ADD COLUMN senior_leader_what_good_looks_like text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competencies' AND column_name = 'senior_leader_what_great_looks_like'
  ) THEN
    ALTER TABLE competencies ADD COLUMN senior_leader_what_great_looks_like text;
  END IF;
END $$;

-- Add competency_level to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'competency_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN competency_level text DEFAULT 'Employee';
  END IF;
END $$;

-- Backfill: set competency_level = 'Employee' for all existing users where null
UPDATE profiles
SET competency_level = 'Employee'
WHERE competency_level IS NULL;

-- Add check constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'profiles_competency_level_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_competency_level_check
      CHECK (competency_level IN ('Employee', 'Manager', 'Senior Leader'));
  END IF;
END $$;

/*
  # Add SERA summary and manager additional context to monthly reviews

  ## Changes
  - Adds `sera_draft_summary` text column to `one_to_one_monthly_reviews`
  - Adds `manager_additional_context` text column to `one_to_one_monthly_reviews`
  - Adds `overall_kpi_average` numeric column for aggregated KPI score
  - Adds `kpi_snapshots` jsonb column for storing KPI running averages snapshot

  These fields support the updated 1:1 flow with SERA draft summaries and manager prompts.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_monthly_reviews' AND column_name = 'sera_draft_summary'
  ) THEN
    ALTER TABLE one_to_one_monthly_reviews ADD COLUMN sera_draft_summary text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_monthly_reviews' AND column_name = 'manager_additional_context'
  ) THEN
    ALTER TABLE one_to_one_monthly_reviews ADD COLUMN manager_additional_context text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_monthly_reviews' AND column_name = 'overall_kpi_average'
  ) THEN
    ALTER TABLE one_to_one_monthly_reviews ADD COLUMN overall_kpi_average numeric(4,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_monthly_reviews' AND column_name = 'kpi_snapshots'
  ) THEN
    ALTER TABLE one_to_one_monthly_reviews ADD COLUMN kpi_snapshots jsonb DEFAULT '{}';
  END IF;
END $$;

/*
  # Cycle employee assignments and scheduling fields

  ## New Tables
  - `one_to_one_cycle_employee_assignments`
    - Links employees to review cycles (one active cycle per employee per manager)
    - Stores assignment date, removed date, and whether active
    - History is preserved; removing from a cycle only sets removed_at, never deletes

  ## Modified Tables
  - `one_to_one_review_cycles`
    - `next_review_date` - date of next scheduled review
    - `cycle_type` - e.g. 'probation', 'standard', 'performance_support'

  ## Security
  - RLS enabled on new table
  - Managers can manage their own assignments
  - Admins have full access
*/

CREATE TABLE IF NOT EXISTS one_to_one_cycle_employee_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES one_to_one_review_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  removed_at timestamptz,
  is_active boolean DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE one_to_one_cycle_employee_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can manage their cycle assignments"
  ON one_to_one_cycle_employee_assignments
  FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'leadership')
    )
  );

CREATE POLICY "Managers can insert cycle assignments"
  ON one_to_one_cycle_employee_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Managers can update cycle assignments"
  ON one_to_one_cycle_employee_assignments
  FOR UPDATE
  TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'next_review_date'
  ) THEN
    ALTER TABLE one_to_one_review_cycles ADD COLUMN next_review_date date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'cycle_type'
  ) THEN
    ALTER TABLE one_to_one_review_cycles ADD COLUMN cycle_type text DEFAULT 'standard';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cycle_employee_assignments_cycle_id
  ON one_to_one_cycle_employee_assignments(cycle_id);

CREATE INDEX IF NOT EXISTS idx_cycle_employee_assignments_employee_id
  ON one_to_one_cycle_employee_assignments(employee_id);

CREATE INDEX IF NOT EXISTS idx_cycle_employee_assignments_manager_id
  ON one_to_one_cycle_employee_assignments(manager_id);

/*
  # Fix unindexed foreign keys - Part 1

  Adds covering indexes for foreign key columns that were missing indexes.
  Tables: assessment_cycles, career_plans, competencies, goal_actions,
          job_history, matrix_assignments, matrix_skills, moderation tables,
          one_to_one tables
*/

-- assessment_cycles
CREATE INDEX IF NOT EXISTS idx_assessment_cycles_created_by ON public.assessment_cycles(created_by);
CREATE INDEX IF NOT EXISTS idx_assessment_cycles_matrix_id ON public.assessment_cycles(matrix_id);

-- career_plans
CREATE INDEX IF NOT EXISTS idx_career_plans_profile_id ON public.career_plans(profile_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_target_job_family_id ON public.career_plans(target_job_family_id);

-- competencies
CREATE INDEX IF NOT EXISTS idx_competencies_value_id ON public.competencies(value_id);

-- goal_actions
CREATE INDEX IF NOT EXISTS idx_goal_actions_assigned_to ON public.goal_actions(assigned_to);

-- job_history
CREATE INDEX IF NOT EXISTS idx_job_history_profile_id ON public.job_history(profile_id);

-- matrix_assignments
CREATE INDEX IF NOT EXISTS idx_matrix_assignments_employee_id ON public.matrix_assignments(employee_id);

-- matrix_skills
CREATE INDEX IF NOT EXISTS idx_matrix_skills_matrix_id ON public.matrix_skills(matrix_id);
CREATE INDEX IF NOT EXISTS idx_matrix_skills_skill_id ON public.matrix_skills(skill_id);

-- moderation_case_decisions
CREATE INDEX IF NOT EXISTS idx_moderation_case_decisions_decided_by ON public.moderation_case_decisions(decided_by);

-- moderation_workflow_configs
CREATE INDEX IF NOT EXISTS idx_moderation_workflow_configs_created_by ON public.moderation_workflow_configs(created_by);

-- one_to_one_action_items
CREATE INDEX IF NOT EXISTS idx_oto_action_items_meeting_id ON public.one_to_one_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_oto_action_items_owner_id ON public.one_to_one_action_items(owner_id);

-- one_to_one_meetings
CREATE INDEX IF NOT EXISTS idx_oto_meetings_employee_id ON public.one_to_one_meetings(employee_id);
CREATE INDEX IF NOT EXISTS idx_oto_meetings_manager_id ON public.one_to_one_meetings(manager_id);

-- one_to_one_monthly_reviews
CREATE INDEX IF NOT EXISTS idx_oto_monthly_reviews_manager_id ON public.one_to_one_monthly_reviews(manager_id);

-- one_to_one_notes
CREATE INDEX IF NOT EXISTS idx_oto_notes_created_by ON public.one_to_one_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_oto_notes_meeting_id ON public.one_to_one_notes(meeting_id);

-- one_to_one_scheduled_meetings
CREATE INDEX IF NOT EXISTS idx_oto_scheduled_meetings_employee_id ON public.one_to_one_scheduled_meetings(employee_id);
CREATE INDEX IF NOT EXISTS idx_oto_scheduled_meetings_manager_id ON public.one_to_one_scheduled_meetings(manager_id);

-- one_to_one_weekly_checkins
CREATE INDEX IF NOT EXISTS idx_oto_weekly_checkins_manager_id ON public.one_to_one_weekly_checkins(manager_id);

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

/*
  # Fix Auth RLS initialization plan performance

  Replaces bare auth.<function>() calls with (select auth.<function>()) in RLS policies
  to prevent per-row re-evaluation. Affects:
  - moderation_workflow_configs (3 write policies)
  - moderation_workflow_steps (3 write policies)
  - moderation_cases (3 policies)
  - moderation_case_decisions (2 policies)
  - one_to_one_cycle_employee_assignments (3 policies)
*/

-- ============================================================
-- moderation_workflow_configs
-- ============================================================
DROP POLICY IF EXISTS "Admins delete workflow configs" ON public.moderation_workflow_configs;
DROP POLICY IF EXISTS "Admins insert workflow configs" ON public.moderation_workflow_configs;
DROP POLICY IF EXISTS "Admins update workflow configs" ON public.moderation_workflow_configs;

CREATE POLICY "Admins delete workflow configs"
  ON public.moderation_workflow_configs FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ));

CREATE POLICY "Admins insert workflow configs"
  ON public.moderation_workflow_configs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ));

CREATE POLICY "Admins update workflow configs"
  ON public.moderation_workflow_configs FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ));

-- ============================================================
-- moderation_workflow_steps
-- ============================================================
DROP POLICY IF EXISTS "Admins manage workflow steps delete" ON public.moderation_workflow_steps;
DROP POLICY IF EXISTS "Admins manage workflow steps insert" ON public.moderation_workflow_steps;
DROP POLICY IF EXISTS "Admins manage workflow steps update" ON public.moderation_workflow_steps;

CREATE POLICY "Admins manage workflow steps delete"
  ON public.moderation_workflow_steps FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ));

CREATE POLICY "Admins manage workflow steps insert"
  ON public.moderation_workflow_steps FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ));

CREATE POLICY "Admins manage workflow steps update"
  ON public.moderation_workflow_steps FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role])
  ));

-- ============================================================
-- moderation_cases
-- ============================================================
DROP POLICY IF EXISTS "Managers and approvers update moderation cases" ON public.moderation_cases;
DROP POLICY IF EXISTS "Managers create moderation cases" ON public.moderation_cases;
DROP POLICY IF EXISTS "View own and approver moderation cases" ON public.moderation_cases;

CREATE POLICY "Managers and approvers update moderation cases"
  ON public.moderation_cases FOR UPDATE TO authenticated
  USING (
    manager_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role, 'dept_lead'::user_role, 'senior'::user_role]))
  )
  WITH CHECK (
    manager_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role, 'dept_lead'::user_role, 'senior'::user_role]))
  );

CREATE POLICY "Managers create moderation cases"
  ON public.moderation_cases FOR INSERT TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

CREATE POLICY "View own and approver moderation cases"
  ON public.moderation_cases FOR SELECT TO authenticated
  USING (
    manager_id = (SELECT auth.uid())
    OR employee_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role, 'dept_lead'::user_role, 'senior'::user_role]))
  );

-- ============================================================
-- moderation_case_decisions
-- ============================================================
DROP POLICY IF EXISTS "Approvers insert decisions" ON public.moderation_case_decisions;
DROP POLICY IF EXISTS "View relevant moderation decisions" ON public.moderation_case_decisions;

CREATE POLICY "Approvers insert decisions"
  ON public.moderation_case_decisions FOR INSERT TO authenticated
  WITH CHECK (decided_by = (SELECT auth.uid()));

CREATE POLICY "View relevant moderation decisions"
  ON public.moderation_case_decisions FOR SELECT TO authenticated
  USING (
    decided_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM moderation_cases mc
      WHERE mc.id = moderation_case_decisions.case_id
        AND (mc.manager_id = (SELECT auth.uid()) OR mc.employee_id = (SELECT auth.uid()))
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role, 'dept_lead'::user_role, 'senior'::user_role]))
  );

-- ============================================================
-- one_to_one_cycle_employee_assignments
-- ============================================================
DROP POLICY IF EXISTS "Managers can insert cycle assignments" ON public.one_to_one_cycle_employee_assignments;
DROP POLICY IF EXISTS "Managers can manage their cycle assignments" ON public.one_to_one_cycle_employee_assignments;
DROP POLICY IF EXISTS "Managers can update cycle assignments" ON public.one_to_one_cycle_employee_assignments;

CREATE POLICY "Managers can manage their cycle assignments"
  ON public.one_to_one_cycle_employee_assignments FOR SELECT TO authenticated
  USING (
    manager_id = (SELECT auth.uid())
    OR employee_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = ANY(ARRAY['admin'::user_role, 'leadership'::user_role]))
  );

CREATE POLICY "Managers can insert cycle assignments"
  ON public.one_to_one_cycle_employee_assignments FOR INSERT TO authenticated
  WITH CHECK (manager_id = (SELECT auth.uid()));

CREATE POLICY "Managers can update cycle assignments"
  ON public.one_to_one_cycle_employee_assignments FOR UPDATE TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

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

/*
  # Add manual_kpi_entries to one_to_one_monthly_reviews

  Adds a JSONB column to store manually entered KPI data when no weekly
  check-ins exist or no review cycle is linked.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_monthly_reviews' AND column_name = 'manual_kpi_entries'
  ) THEN
    ALTER TABLE one_to_one_monthly_reviews ADD COLUMN manual_kpi_entries jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

/*
  # Add overall_average to one_to_one_monthly_reviews

  1. Changes
    - Adds `overall_average` numeric column to `one_to_one_monthly_reviews`
    - This stores the final overall score (average of KPI avg + competency avg) for the monthly review
    - Used by the ReviewFlow component (Step 5 Submit) and surfaced on employee dashboard

  2. Notes
    - Column is nullable — not all reviews will have a calculated average (e.g. in-progress reviews)
    - No default value so that NULL clearly distinguishes "not yet calculated" from "0"
*/

ALTER TABLE one_to_one_monthly_reviews
  ADD COLUMN IF NOT EXISTS overall_average numeric;

/*
  # Review Status: Rescheduled Tracking and Reporting Access

  ## Summary
  Supports the new review status logic by:
  1. Adding `original_scheduled_datetime` to track when a meeting date is changed
     so "Rescheduled" status can be detected (original date set, current date differs).
  2. Adding SELECT policies on scheduled meetings, weekly check-ins, and monthly reviews
     so admin (any role='admin') and dept_lead users can read reviews for reporting.
     Dept_lead access is scoped to their own department via profiles.

  ## Changes
  - `one_to_one_scheduled_meetings`: new nullable column `original_scheduled_datetime`
  - New RLS SELECT policies on meetings, weekly check-ins, monthly reviews for admin + dept_lead

  ## Notes
  - No data is deleted or altered
  - Submission logic is untouched
  - Existing manager/employee policies are unchanged
*/

-- 1. Add original_scheduled_datetime to track rescheduling
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_scheduled_meetings'
      AND column_name = 'original_scheduled_datetime'
  ) THEN
    ALTER TABLE one_to_one_scheduled_meetings
      ADD COLUMN original_scheduled_datetime timestamptz;
  END IF;
END $$;

-- 2. Admin can read all scheduled meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'one_to_one_scheduled_meetings'
      AND policyname = 'Admin can view all scheduled meetings'
  ) THEN
    CREATE POLICY "Admin can view all scheduled meetings"
      ON one_to_one_scheduled_meetings FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = (SELECT auth.uid())
            AND role = 'admin'
        )
      );
  END IF;
END $$;

-- 3. Dept lead can read scheduled meetings in their department
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'one_to_one_scheduled_meetings'
      AND policyname = 'Dept lead can view meetings in own department'
  ) THEN
    CREATE POLICY "Dept lead can view meetings in own department"
      ON one_to_one_scheduled_meetings FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles lead
          WHERE lead.id = (SELECT auth.uid())
            AND lead.role = 'dept_lead'
            AND EXISTS (
              SELECT 1 FROM profiles emp
              WHERE emp.id = one_to_one_scheduled_meetings.employee_id
                AND emp.department = lead.department
            )
        )
      );
  END IF;
END $$;

-- 4. Admin can read all weekly check-ins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'one_to_one_weekly_checkins'
      AND policyname = 'Admin can view all weekly checkins'
  ) THEN
    CREATE POLICY "Admin can view all weekly checkins"
      ON one_to_one_weekly_checkins FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = (SELECT auth.uid())
            AND role = 'admin'
        )
      );
  END IF;
END $$;

-- 5. Dept lead can read weekly check-ins in their department
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'one_to_one_weekly_checkins'
      AND policyname = 'Dept lead can view weekly checkins in own department'
  ) THEN
    CREATE POLICY "Dept lead can view weekly checkins in own department"
      ON one_to_one_weekly_checkins FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles lead
          WHERE lead.id = (SELECT auth.uid())
            AND lead.role = 'dept_lead'
            AND EXISTS (
              SELECT 1 FROM profiles emp
              WHERE emp.id = one_to_one_weekly_checkins.employee_id
                AND emp.department = lead.department
            )
        )
      );
  END IF;
END $$;

-- 6. Admin can read all monthly reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'one_to_one_monthly_reviews'
      AND policyname = 'Admin can view all monthly reviews'
  ) THEN
    CREATE POLICY "Admin can view all monthly reviews"
      ON one_to_one_monthly_reviews FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = (SELECT auth.uid())
            AND role = 'admin'
        )
      );
  END IF;
END $$;

-- 7. Dept lead can read monthly reviews in their department
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'one_to_one_monthly_reviews'
      AND policyname = 'Dept lead can view monthly reviews in own department'
  ) THEN
    CREATE POLICY "Dept lead can view monthly reviews in own department"
      ON one_to_one_monthly_reviews FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles lead
          WHERE lead.id = (SELECT auth.uid())
            AND lead.role = 'dept_lead'
            AND EXISTS (
              SELECT 1 FROM profiles emp
              WHERE emp.id = one_to_one_monthly_reviews.employee_id
                AND emp.department = lead.department
            )
        )
      );
  END IF;
END $$;

/*
  # Add template_start_date and template_end_date to one_to_one_review_cycles

  ## Changes
  - Adds `template_start_date` date column: the start date of the review template
  - Adds `template_end_date` date column: the end date of the review template
  - Both are nullable to allow migration of existing records without breaking changes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'template_start_date'
  ) THEN
    ALTER TABLE one_to_one_review_cycles ADD COLUMN template_start_date date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'one_to_one_review_cycles' AND column_name = 'template_end_date'
  ) THEN
    ALTER TABLE one_to_one_review_cycles ADD COLUMN template_end_date date;
  END IF;
END $$;

