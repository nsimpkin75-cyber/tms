/*
  # Fix Security and Performance Issues - Part 3
  
  Optimize RLS policies for review templates, career management, and user tables
*/

-- review_templates
DROP POLICY IF EXISTS "Admins can create review templates" ON review_templates;
DROP POLICY IF EXISTS "Admins can delete review templates" ON review_templates;
DROP POLICY IF EXISTS "Admins can update review templates" ON review_templates;
DROP POLICY IF EXISTS "Users can view active review templates" ON review_templates;

CREATE POLICY "Admins can create review templates" ON review_templates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can delete review templates" ON review_templates FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can update review templates" ON review_templates FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Users can view active review templates" ON review_templates FOR SELECT TO authenticated
  USING (is_active = true OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

-- review_template_sections
DROP POLICY IF EXISTS "Admins can create sections" ON review_template_sections;
DROP POLICY IF EXISTS "Admins can delete sections" ON review_template_sections;
DROP POLICY IF EXISTS "Admins can update sections" ON review_template_sections;
DROP POLICY IF EXISTS "Users can view sections of active templates" ON review_template_sections;

CREATE POLICY "Admins can create sections" ON review_template_sections FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can delete sections" ON review_template_sections FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can update sections" ON review_template_sections FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Users can view sections of active templates" ON review_template_sections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM review_templates WHERE review_templates.id = review_template_sections.template_id AND review_templates.is_active = true) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

-- review_template_questions
DROP POLICY IF EXISTS "Admins can create questions" ON review_template_questions;
DROP POLICY IF EXISTS "Admins can delete questions" ON review_template_questions;
DROP POLICY IF EXISTS "Admins can update questions" ON review_template_questions;
DROP POLICY IF EXISTS "Users can view questions of active templates" ON review_template_questions;

CREATE POLICY "Admins can create questions" ON review_template_questions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can delete questions" ON review_template_questions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can update questions" ON review_template_questions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Users can view questions of active templates" ON review_template_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM review_template_sections rts JOIN review_templates rt ON rt.id = rts.template_id WHERE rts.id = review_template_questions.section_id AND rt.is_active = true) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

-- weekly_catchups
DROP POLICY IF EXISTS "Managers can create weekly catchups" ON weekly_catchups;
DROP POLICY IF EXISTS "Managers can delete their weekly catchups" ON weekly_catchups;
DROP POLICY IF EXISTS "Managers can update their weekly catchups" ON weekly_catchups;
DROP POLICY IF EXISTS "Users can view their weekly catchups" ON weekly_catchups;

CREATE POLICY "Managers can create weekly catchups" ON weekly_catchups FOR INSERT TO authenticated
  WITH CHECK (manager_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = weekly_catchups.employee_id AND profiles.manager_id = (select auth.uid())));

CREATE POLICY "Managers can delete their weekly catchups" ON weekly_catchups FOR DELETE TO authenticated
  USING (manager_id = (select auth.uid()));

CREATE POLICY "Managers can update their weekly catchups" ON weekly_catchups FOR UPDATE TO authenticated
  USING (manager_id = (select auth.uid())) WITH CHECK (manager_id = (select auth.uid()));

CREATE POLICY "Users can view their weekly catchups" ON weekly_catchups FOR SELECT TO authenticated
  USING (employee_id = (select auth.uid()) OR manager_id = (select auth.uid()));

-- catchup_summaries
DROP POLICY IF EXISTS "Managers can create catchup summaries" ON catchup_summaries;
DROP POLICY IF EXISTS "Managers can update catchup summaries" ON catchup_summaries;
DROP POLICY IF EXISTS "Users can view catchup summaries" ON catchup_summaries;

CREATE POLICY "Managers can create catchup summaries" ON catchup_summaries FOR INSERT TO authenticated
  WITH CHECK (manager_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = catchup_summaries.employee_id AND profiles.manager_id = (select auth.uid())));

CREATE POLICY "Managers can update catchup summaries" ON catchup_summaries FOR UPDATE TO authenticated
  USING (manager_id = (select auth.uid())) WITH CHECK (manager_id = (select auth.uid()));

CREATE POLICY "Users can view catchup summaries" ON catchup_summaries FOR SELECT TO authenticated
  USING (employee_id = (select auth.uid()) OR manager_id = (select auth.uid()));

-- values
DROP POLICY IF EXISTS "Admins can create values" ON values;
DROP POLICY IF EXISTS "Admins can delete values" ON values;
DROP POLICY IF EXISTS "Admins can update values" ON values;
DROP POLICY IF EXISTS "Users can view active values" ON values;

CREATE POLICY "Admins can create values" ON values FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can delete values" ON values FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can update values" ON values FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Users can view active values" ON values FOR SELECT TO authenticated
  USING (is_active = true OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

-- user_cvs
DROP POLICY IF EXISTS "Users can delete own CV" ON user_cvs;
DROP POLICY IF EXISTS "Users can insert own CV" ON user_cvs;
DROP POLICY IF EXISTS "Users can update own CV" ON user_cvs;
DROP POLICY IF EXISTS "Users can view own CV" ON user_cvs;

CREATE POLICY "Users can delete own CV" ON user_cvs FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own CV" ON user_cvs FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own CV" ON user_cvs FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can view own CV" ON user_cvs FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- career_pathways
DROP POLICY IF EXISTS "Users can manage own pathways" ON career_pathways;
DROP POLICY IF EXISTS "Users can view own pathways" ON career_pathways;

CREATE POLICY "Users can manage own pathways" ON career_pathways FOR ALL TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can view own pathways" ON career_pathways FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
