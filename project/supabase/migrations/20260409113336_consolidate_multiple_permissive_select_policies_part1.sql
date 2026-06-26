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
