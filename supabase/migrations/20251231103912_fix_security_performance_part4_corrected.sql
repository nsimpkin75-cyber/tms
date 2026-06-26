/*
  # Fix Security and Performance Issues - Part 4 (Corrected)
  
  Optimize RLS policies for career development, competencies, and job tracking
*/

-- career_development_plans
DROP POLICY IF EXISTS "Managers can update team CDPs" ON career_development_plans;
DROP POLICY IF EXISTS "Managers can view team CDPs" ON career_development_plans;
DROP POLICY IF EXISTS "Users can insert own CDPs" ON career_development_plans;
DROP POLICY IF EXISTS "Users can update own CDPs" ON career_development_plans;
DROP POLICY IF EXISTS "Users can view own CDPs" ON career_development_plans;

CREATE POLICY "Managers can update team CDPs" ON career_development_plans FOR UPDATE TO authenticated
  USING (manager_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = career_development_plans.user_id AND profiles.manager_id = (select auth.uid())))
  WITH CHECK (manager_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = career_development_plans.user_id AND profiles.manager_id = (select auth.uid())));

CREATE POLICY "Managers can view team CDPs" ON career_development_plans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = career_development_plans.user_id AND profiles.manager_id = (select auth.uid())));

CREATE POLICY "Users can insert own CDPs" ON career_development_plans FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own CDPs" ON career_development_plans FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can view own CDPs" ON career_development_plans FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- one_to_one_goals
DROP POLICY IF EXISTS "Managers can insert team goals" ON one_to_one_goals;
DROP POLICY IF EXISTS "Managers can update team goals" ON one_to_one_goals;
DROP POLICY IF EXISTS "Managers can view team goals" ON one_to_one_goals;
DROP POLICY IF EXISTS "Users can update own goals" ON one_to_one_goals;
DROP POLICY IF EXISTS "Users can view own goals" ON one_to_one_goals;

CREATE POLICY "Managers can insert team goals" ON one_to_one_goals FOR INSERT TO authenticated
  WITH CHECK (created_by = (select auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = one_to_one_goals.user_id AND profiles.manager_id = (select auth.uid())));

CREATE POLICY "Managers can update team goals" ON one_to_one_goals FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = one_to_one_goals.user_id AND profiles.manager_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = one_to_one_goals.user_id AND profiles.manager_id = (select auth.uid())));

CREATE POLICY "Managers can view team goals" ON one_to_one_goals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = one_to_one_goals.user_id AND profiles.manager_id = (select auth.uid())));

CREATE POLICY "Users can update own goals" ON one_to_one_goals FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can view own goals" ON one_to_one_goals FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- job_history
DROP POLICY IF EXISTS "Admins can insert job history" ON job_history;
DROP POLICY IF EXISTS "Admins can update job history" ON job_history;
DROP POLICY IF EXISTS "Admins can view all job history" ON job_history;
DROP POLICY IF EXISTS "Managers can view team job history" ON job_history;
DROP POLICY IF EXISTS "Users can view own job history" ON job_history;

CREATE POLICY "Admins can insert job history" ON job_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can update job history" ON job_history FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can view all job history" ON job_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Managers can view team job history" ON job_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = job_history.user_id AND profiles.manager_id = (select auth.uid())));

CREATE POLICY "Users can view own job history" ON job_history FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- competencies
DROP POLICY IF EXISTS "Admins can create competencies" ON competencies;
DROP POLICY IF EXISTS "Admins can delete competencies" ON competencies;
DROP POLICY IF EXISTS "Admins can update competencies" ON competencies;
DROP POLICY IF EXISTS "Users can view competencies" ON competencies;

CREATE POLICY "Admins can create competencies" ON competencies FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can delete competencies" ON competencies FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can update competencies" ON competencies FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Users can view competencies" ON competencies FOR SELECT TO authenticated
  USING (is_active = true OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

-- career_plans
DROP POLICY IF EXISTS "Admins can update any career plan" ON career_plans;
DROP POLICY IF EXISTS "Admins can view all career plans" ON career_plans;
DROP POLICY IF EXISTS "Managers can approve team career plans" ON career_plans;
DROP POLICY IF EXISTS "Managers can view team career plans" ON career_plans;
DROP POLICY IF EXISTS "Users can send plans to manager" ON career_plans;

CREATE POLICY "Admins can update any career plan" ON career_plans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can view all career plans" ON career_plans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Managers can approve team career plans" ON career_plans FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = career_plans.user_id AND profiles.manager_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = career_plans.user_id AND profiles.manager_id = (select auth.uid())));

CREATE POLICY "Managers can view team career plans" ON career_plans FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = career_plans.user_id AND profiles.manager_id = (select auth.uid())));

CREATE POLICY "Users can send plans to manager" ON career_plans FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

-- career_plan_milestones (corrected column name: career_plan_id)
DROP POLICY IF EXISTS "Admins can view all plan milestones" ON career_plan_milestones;
DROP POLICY IF EXISTS "Managers can view team plan milestones" ON career_plan_milestones;
DROP POLICY IF EXISTS "Users can create own plan milestones" ON career_plan_milestones;
DROP POLICY IF EXISTS "Users can delete own plan milestones" ON career_plan_milestones;
DROP POLICY IF EXISTS "Users can update own plan milestones" ON career_plan_milestones;
DROP POLICY IF EXISTS "Users can view own plan milestones" ON career_plan_milestones;

CREATE POLICY "Admins can view all plan milestones" ON career_plan_milestones FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Managers can view team plan milestones" ON career_plan_milestones FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM career_plans cp JOIN profiles p ON p.id = cp.user_id WHERE cp.id = career_plan_milestones.career_plan_id AND p.manager_id = (select auth.uid())));

CREATE POLICY "Users can create own plan milestones" ON career_plan_milestones FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM career_plans WHERE career_plans.id = career_plan_milestones.career_plan_id AND career_plans.user_id = (select auth.uid())));

CREATE POLICY "Users can delete own plan milestones" ON career_plan_milestones FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM career_plans WHERE career_plans.id = career_plan_milestones.career_plan_id AND career_plans.user_id = (select auth.uid())));

CREATE POLICY "Users can update own plan milestones" ON career_plan_milestones FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM career_plans WHERE career_plans.id = career_plan_milestones.career_plan_id AND career_plans.user_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM career_plans WHERE career_plans.id = career_plan_milestones.career_plan_id AND career_plans.user_id = (select auth.uid())));

CREATE POLICY "Users can view own plan milestones" ON career_plan_milestones FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM career_plans WHERE career_plans.id = career_plan_milestones.career_plan_id AND career_plans.user_id = (select auth.uid())));

-- competency_levels
DROP POLICY IF EXISTS "Admins can create competency levels" ON competency_levels;
DROP POLICY IF EXISTS "Admins can delete competency levels" ON competency_levels;
DROP POLICY IF EXISTS "Admins can update competency levels" ON competency_levels;
DROP POLICY IF EXISTS "Users can view competency levels" ON competency_levels;

CREATE POLICY "Admins can create competency levels" ON competency_levels FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can delete competency levels" ON competency_levels FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can update competency levels" ON competency_levels FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Users can view competency levels" ON competency_levels FOR SELECT TO authenticated
  USING (true);

-- user_skill_assessments
DROP POLICY IF EXISTS "Managers can view team skill assessments" ON user_skill_assessments;

CREATE POLICY "Managers can view team skill assessments" ON user_skill_assessments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = user_skill_assessments.user_id AND profiles.manager_id = (select auth.uid())));

-- job_family_competencies
DROP POLICY IF EXISTS "Admins can create job family competencies" ON job_family_competencies;
DROP POLICY IF EXISTS "Admins can delete job family competencies" ON job_family_competencies;
DROP POLICY IF EXISTS "Admins can update job family competencies" ON job_family_competencies;

CREATE POLICY "Admins can create job family competencies" ON job_family_competencies FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can delete job family competencies" ON job_family_competencies FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can update job family competencies" ON job_family_competencies FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));
