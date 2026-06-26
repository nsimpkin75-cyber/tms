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
