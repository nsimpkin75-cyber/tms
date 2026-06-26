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
