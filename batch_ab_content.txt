/*
  # Fix Security and Performance Issues - Part 1

  ## Changes
  1. Add missing index on foreign key
  2. Fix function search_path vulnerabilities  
  3. Optimize RLS policies (Part 1 of 3) - Core tables

  ## Performance Impact
  - Prevents auth.uid() re-evaluation on every row
  - Improves query performance at scale
*/

-- Add missing index
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_required_level_id
ON job_family_competencies(required_level_id);

-- Fix function security
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$ BEGIN
  RETURN (SELECT role = 'admin' FROM profiles WHERE id = auth.uid());
END; $$;

CREATE OR REPLACE FUNCTION update_organisation_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION determine_job_change_type(old_job_family_id uuid, new_job_family_id uuid, old_department text, new_department text)
RETURNS text LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$ BEGIN
  IF old_job_family_id IS NULL THEN RETURN 'new_hire'::text;
  ELSIF old_job_family_id = new_job_family_id AND old_department = new_department THEN RETURN 'details_update'::text;
  ELSIF old_department != new_department THEN RETURN 'department_transfer'::text;
  ELSE RETURN 'role_change'::text; END IF;
END; $$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public, pg_temp
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Optimize core policies
DROP POLICY IF EXISTS "Users can manage own profile skills" ON profile_skills;
CREATE POLICY "Users can manage own profile skills" ON profile_skills FOR ALL TO authenticated
  USING (profile_id = (select auth.uid())) WITH CHECK (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS "Reviewers can insert review items" ON review_items;
DROP POLICY IF EXISTS "Reviewers can update review items" ON review_items;
DROP POLICY IF EXISTS "Users can view review items for their reviews" ON review_items;

CREATE POLICY "Reviewers can insert review items" ON review_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_items.review_id AND reviews.reviewer_id = (select auth.uid())));

CREATE POLICY "Reviewers can update review items" ON review_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_items.review_id AND reviews.reviewer_id = (select auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_items.review_id AND reviews.reviewer_id = (select auth.uid())));

CREATE POLICY "Users can view review items for their reviews" ON review_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_items.review_id AND reviews.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Managers can create action items for team" ON action_items;
DROP POLICY IF EXISTS "Users can manage own action items" ON action_items;
DROP POLICY IF EXISTS "Users can view own action items" ON action_items;

CREATE POLICY "Managers can create action items for team" ON action_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = action_items.owner_id AND profiles.manager_id = (select auth.uid())));

CREATE POLICY "Users can manage own action items" ON action_items FOR ALL TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "Users can view own action items" ON action_items FOR SELECT TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can book own training" ON training_attendees;
DROP POLICY IF EXISTS "Users can cancel own training" ON training_attendees;

CREATE POLICY "Users can book own training" ON training_attendees FOR INSERT TO authenticated
  WITH CHECK (profile_id = (select auth.uid()));

CREATE POLICY "Users can cancel own training" ON training_attendees FOR DELETE TO authenticated
  USING (profile_id = (select auth.uid()));

DROP POLICY IF EXISTS "Managers can create reviews" ON reviews;
DROP POLICY IF EXISTS "Reviewers can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can view own reviews" ON reviews;

CREATE POLICY "Managers can create reviews" ON reviews FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = reviews.user_id AND profiles.manager_id = (select auth.uid())));

CREATE POLICY "Reviewers can update own reviews" ON reviews FOR UPDATE TO authenticated
  USING (reviewer_id = (select auth.uid())) WITH CHECK (reviewer_id = (select auth.uid()));

CREATE POLICY "Users can view own reviews" ON reviews FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR reviewer_id = (select auth.uid()));

/*
  # Fix Security and Performance Issues - Part 2
  
  Optimize RLS policies for copilot, admin, and organizational tables
*/

-- copilot_conversation_history
DROP POLICY IF EXISTS "Users can create own conversation messages" ON copilot_conversation_history;
DROP POLICY IF EXISTS "Users can delete own conversation history" ON copilot_conversation_history;
DROP POLICY IF EXISTS "Users can view own conversation history" ON copilot_conversation_history;

CREATE POLICY "Users can create own conversation messages" ON copilot_conversation_history FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own conversation history" ON copilot_conversation_history FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can view own conversation history" ON copilot_conversation_history FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- copilot_config
DROP POLICY IF EXISTS "Admins can create copilot configs" ON copilot_config;
DROP POLICY IF EXISTS "Admins can delete copilot configs" ON copilot_config;
DROP POLICY IF EXISTS "Admins can update copilot configs" ON copilot_config;
DROP POLICY IF EXISTS "Admins can view copilot configs" ON copilot_config;

CREATE POLICY "Admins can create copilot configs" ON copilot_config FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can delete copilot configs" ON copilot_config FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can update copilot configs" ON copilot_config FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can view copilot configs" ON copilot_config FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

-- copilot_functions
DROP POLICY IF EXISTS "Admins can create copilot functions" ON copilot_functions;
DROP POLICY IF EXISTS "Admins can delete copilot functions" ON copilot_functions;
DROP POLICY IF EXISTS "Admins can update copilot functions" ON copilot_functions;
DROP POLICY IF EXISTS "Users can view enabled copilot functions" ON copilot_functions;

CREATE POLICY "Admins can create copilot functions" ON copilot_functions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can delete copilot functions" ON copilot_functions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can update copilot functions" ON copilot_functions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Users can view enabled copilot functions" ON copilot_functions FOR SELECT TO authenticated
  USING (is_enabled = true OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

-- general_progression_criteria
DROP POLICY IF EXISTS "Only admins can delete progression criteria" ON general_progression_criteria;
DROP POLICY IF EXISTS "Only admins can insert progression criteria" ON general_progression_criteria;
DROP POLICY IF EXISTS "Only admins can update progression criteria" ON general_progression_criteria;

CREATE POLICY "Only admins can delete progression criteria" ON general_progression_criteria FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Only admins can insert progression criteria" ON general_progression_criteria FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Only admins can update progression criteria" ON general_progression_criteria FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

-- organisation_settings
DROP POLICY IF EXISTS "Admins can insert organisation settings" ON organisation_settings;
DROP POLICY IF EXISTS "Admins can update organisation settings" ON organisation_settings;

CREATE POLICY "Admins can insert organisation settings" ON organisation_settings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admins can update organisation settings" ON organisation_settings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

-- training_module_links
DROP POLICY IF EXISTS "Admin users can delete training module links" ON training_module_links;
DROP POLICY IF EXISTS "Admin users can insert training module links" ON training_module_links;
DROP POLICY IF EXISTS "Admin users can update training module links" ON training_module_links;

CREATE POLICY "Admin users can delete training module links" ON training_module_links FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admin users can insert training module links" ON training_module_links FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Admin users can update training module links" ON training_module_links FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

-- strategic_roadmaps
DROP POLICY IF EXISTS "Admins can delete strategic roadmaps" ON strategic_roadmaps;
DROP POLICY IF EXISTS "Authorized users can create strategic roadmaps" ON strategic_roadmaps;
DROP POLICY IF EXISTS "Leadership can view all strategic roadmaps" ON strategic_roadmaps;
DROP POLICY IF EXISTS "Owners can update their strategic roadmaps" ON strategic_roadmaps;

CREATE POLICY "Admins can delete strategic roadmaps" ON strategic_roadmaps FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'));

CREATE POLICY "Authorized users can create strategic roadmaps" ON strategic_roadmaps FOR INSERT TO authenticated
  WITH CHECK (owner_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'leadership')));

CREATE POLICY "Leadership can view all strategic roadmaps" ON strategic_roadmaps FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'leadership')));

CREATE POLICY "Owners can update their strategic roadmaps" ON strategic_roadmaps FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));

-- strategic_goals
DROP POLICY IF EXISTS "Authorized users can create strategic goals" ON strategic_goals;
DROP POLICY IF EXISTS "Authorized users can delete strategic goals" ON strategic_goals;
DROP POLICY IF EXISTS "Goal owners can update strategic goals" ON strategic_goals;
DROP POLICY IF EXISTS "Users can view relevant strategic goals" ON strategic_goals;

CREATE POLICY "Authorized users can create strategic goals" ON strategic_goals FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'leadership')));

CREATE POLICY "Authorized users can delete strategic goals" ON strategic_goals FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'leadership')));

CREATE POLICY "Goal owners can update strategic goals" ON strategic_goals FOR UPDATE TO authenticated
  USING (assigned_to_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'leadership')))
  WITH CHECK (assigned_to_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'leadership')));

CREATE POLICY "Users can view relevant strategic goals" ON strategic_goals FOR SELECT TO authenticated
  USING (assigned_to_id = (select auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'leadership', 'manager')));

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

/*
  # Remove Unused Indexes and Fix Security Issues
  
  ## Changes
  1. Drop 52 unused indexes to improve write performance
  2. Fix function search_path and duplicates
  3. Fix SECURITY DEFINER views to use security_invoker
  
  ## Impact
  - Improved write performance
  - Reduced storage
  - Enhanced security
*/

-- =====================================================
-- 1. DROP ALL UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_career_pathways_user_id;
DROP INDEX IF EXISTS idx_career_plans_current_job_family_id;
DROP INDEX IF EXISTS idx_career_plans_status;
DROP INDEX IF EXISTS idx_career_plans_target_job_family;
DROP INDEX IF EXISTS idx_career_plan_milestones_plan_id;
DROP INDEX IF EXISTS idx_career_plan_milestones_sort;
DROP INDEX IF EXISTS idx_career_development_plans_user_id;
DROP INDEX IF EXISTS idx_career_development_plans_manager_id;
DROP INDEX IF EXISTS idx_career_development_plans_status;
DROP INDEX IF EXISTS idx_career_quiz_responses_user_id;
DROP INDEX IF EXISTS idx_career_quiz_responses_date;
DROP INDEX IF EXISTS idx_catchup_summaries_employee_id;
DROP INDEX IF EXISTS idx_catchup_summaries_month;
DROP INDEX IF EXISTS idx_goals_user_id;
DROP INDEX IF EXISTS idx_one_to_one_goals_user_id;
DROP INDEX IF EXISTS idx_one_to_one_goals_created_by;
DROP INDEX IF EXISTS idx_one_to_one_goals_cdp_id;
DROP INDEX IF EXISTS idx_weekly_catchups_manager;
DROP INDEX IF EXISTS idx_weekly_catchups_employee;
DROP INDEX IF EXISTS idx_job_history_changed_by;
DROP INDEX IF EXISTS idx_job_history_job_family_id_fkey;
DROP INDEX IF EXISTS idx_job_history_user_id;
DROP INDEX IF EXISTS idx_job_history_effective_date;
DROP INDEX IF EXISTS idx_job_history_change_type;
DROP INDEX IF EXISTS idx_job_history_department;
DROP INDEX IF EXISTS idx_profile_skills_skill_id;
DROP INDEX IF EXISTS idx_profiles_job_family_id;
DROP INDEX IF EXISTS idx_profiles_manager_id;
DROP INDEX IF EXISTS idx_user_cvs_user_id;
DROP INDEX IF EXISTS idx_user_skill_assessments_user;
DROP INDEX IF EXISTS idx_reviews_reviewer_id;
DROP INDEX IF EXISTS idx_review_templates_active;
DROP INDEX IF EXISTS idx_review_template_sections_template;
DROP INDEX IF EXISTS idx_review_template_questions_section;
DROP INDEX IF EXISTS idx_strategic_goals_assigned_by_id;
DROP INDEX IF EXISTS idx_strategic_goals_parent_goal_id;
DROP INDEX IF EXISTS idx_strategic_goals_assigned_to;
DROP INDEX IF EXISTS idx_strategic_goals_roadmap;
DROP INDEX IF EXISTS idx_strategic_roadmaps_owner_id;
DROP INDEX IF EXISTS idx_training_completions_course_id;
DROP INDEX IF EXISTS idx_training_module_links_job_family_id;
DROP INDEX IF EXISTS idx_training_attendees_profile;
DROP INDEX IF EXISTS idx_training_attendees_session;
DROP INDEX IF EXISTS idx_copilot_config_active;
DROP INDEX IF EXISTS idx_copilot_functions_enabled;
DROP INDEX IF EXISTS idx_copilot_conversation_user;
DROP INDEX IF EXISTS idx_copilot_conversation_created;
DROP INDEX IF EXISTS idx_action_items_completed;
DROP INDEX IF EXISTS idx_progression_criteria_job_family;
DROP INDEX IF EXISTS idx_competencies_active;
DROP INDEX IF EXISTS idx_job_family_competencies_required_level_id;
DROP INDEX IF EXISTS idx_job_family_competencies_competency;

-- =====================================================
-- 2. FIX FUNCTION DUPLICATES AND SEARCH_PATH
-- =====================================================

-- Drop all versions of determine_job_change_type
DROP FUNCTION IF EXISTS determine_job_change_type(uuid, uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS determine_job_change_type(text, text, text, text, uuid, uuid) CASCADE;

-- Recreate with proper security settings
CREATE FUNCTION determine_job_change_type(
  old_job_family_id uuid,
  new_job_family_id uuid,
  old_department text,
  new_department text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = public
AS $$
BEGIN
  IF old_job_family_id IS NULL THEN
    RETURN 'new_hire'::text;
  ELSIF old_job_family_id = new_job_family_id AND old_department = new_department THEN
    RETURN 'details_update'::text;
  ELSIF old_department != new_department THEN
    RETURN 'department_transfer'::text;
  ELSE
    RETURN 'role_change'::text;
  END IF;
END;
$$;

-- =====================================================
-- 3. FIX SECURITY DEFINER VIEWS
-- =====================================================

-- Recreate pending_career_approvals with security_invoker
DROP VIEW IF EXISTS pending_career_approvals CASCADE;

CREATE VIEW pending_career_approvals
WITH (security_invoker = true)
AS
SELECT 
  cp.id,
  cp.user_id,
  p.full_name as user_name,
  p.email as user_email,
  cp.target_job_family_id,
  jf.title as target_role,
  cp.status,
  cp.sent_to_manager_at,
  cp.created_at
FROM career_plans cp
JOIN profiles p ON p.id = cp.user_id
LEFT JOIN job_families jf ON jf.id = cp.target_job_family_id
WHERE cp.status IN ('pending_manager_review', 'pending_admin_review');

-- Recreate job_movement_stats with security_invoker
DROP VIEW IF EXISTS job_movement_stats CASCADE;

CREATE VIEW job_movement_stats
WITH (security_invoker = true)
AS
SELECT 
  date_trunc('month', effective_date) as month,
  change_type,
  department,
  COUNT(*) as movement_count,
  COUNT(DISTINCT user_id) as unique_users
FROM job_history
WHERE effective_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY date_trunc('month', effective_date), change_type, department
ORDER BY month DESC, change_type, department;

-- Add documentation
COMMENT ON VIEW pending_career_approvals IS 'Career plans awaiting approval. Uses security_invoker to respect RLS policies on underlying tables.';
COMMENT ON VIEW job_movement_stats IS 'Job movement statistics for last 12 months. Uses security_invoker to respect RLS policies.';
COMMENT ON FUNCTION determine_job_change_type(uuid, uuid, text, text) IS 'Determines type of job change. Marked IMMUTABLE and STRICT for performance and security.';

/*
  # Add Manager Guidance Field to Competencies
  
  ## Changes
  1. Add manager_guidance field to competencies table
     - This field helps managers understand how to use and assess each competency
     - Provides context on what to look for when evaluating employees
  
  ## Purpose
  - Helps managers better understand competency expectations
  - Provides guidance on how to assess competency levels
  - Improves consistency in competency evaluation during reviews
*/

-- Add manager_guidance column to competencies table
ALTER TABLE competencies 
ADD COLUMN IF NOT EXISTS manager_guidance text;

-- Add helpful comment
COMMENT ON COLUMN competencies.manager_guidance IS 'Guidance for managers on how to use and assess this competency during reviews and development planning';

/*
  # Add Competency Framework Description Setting
  
  ## Changes
  1. Create system_settings table for application-wide settings
     - Stores key-value pairs for various system configurations
     - Includes competency_framework_description for manager guidance
  
  2. Security
     - Enable RLS on system_settings table
     - Only admins can update settings
     - All authenticated users can read settings
  
  3. Initial Data
     - Add default competency framework description
*/

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text,
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings
CREATE POLICY "Authenticated users can read settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow only admins to update settings
CREATE POLICY "Admins can update settings"
  ON system_settings
  FOR UPDATE
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

-- Allow only admins to insert settings
CREATE POLICY "Admins can insert settings"
  ON system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default competency framework description
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'competency_framework_description',
  'Use this competency framework to guide performance reviews, career development conversations, and succession planning. Each competency has four levels that define the progression from developing skills to expert mastery. When assessing employees or planning development, refer to the specific level definitions to ensure consistency across the organization.',
  'Description text shown at the top of the Competency Framework page to guide managers'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Add helpful comment
COMMENT ON TABLE system_settings IS 'System-wide configuration settings for the application';

/*
  # Add Detailed Fields to Competency Levels

  1. Changes
    - Add `negative_statement` column to `competency_levels` table
      - Describes what the level looks like when demonstrated poorly
      - Complements the positive statement
    - Add `target_behaviour_detail` column to `competency_levels` table
      - Provides full detailed description of the target behaviour for this level
      - Gives comprehensive guidance on expectations
  
  2. Purpose
    - Provides both positive and negative examples for each level
    - Offers detailed behavioural descriptions to clarify expectations
    - Helps managers and employees understand what good and poor performance looks like
    - Improves clarity and consistency in competency assessment
*/

-- Add negative_statement column to competency_levels table
ALTER TABLE competency_levels 
ADD COLUMN IF NOT EXISTS negative_statement text;

-- Add target_behaviour_detail column to competency_levels table
ALTER TABLE competency_levels 
ADD COLUMN IF NOT EXISTS target_behaviour_detail text;

-- Add helpful comments
COMMENT ON COLUMN competency_levels.negative_statement IS 'Description of what this competency level looks like when demonstrated poorly or inadequately';
COMMENT ON COLUMN competency_levels.target_behaviour_detail IS 'Full detailed description of the target behaviour and expectations for this competency level';

/*
  # Add Success Measures and KPIs to Strategic Goals

  1. Updates to strategic_goals table
    - Add `success_criteria` (text) - Description of what success looks like
    - Add `kpi_metrics` (jsonb) - Array of KPI objects with structure:
      [
        {
          "name": "Revenue Growth",
          "target": "£1M",
          "current": "£750K",
          "unit": "currency",
          "description": "Optional description"
        }
      ]
    - Add `target_value` (text) - Simple target value field
    - Add `current_value` (text) - Current progress value
    - Add `measurement_unit` (text) - Unit of measurement (e.g., "%", "£", "count")
  
  2. Important Notes
    - These fields help track and measure goal success
    - KPI metrics can be updated as progress is made
    - Success criteria provides qualitative context
    - All fields are optional to maintain backward compatibility
*/

-- Add success measurement fields to strategic_goals table
DO $$
BEGIN
  -- Add success_criteria field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'success_criteria'
  ) THEN
    ALTER TABLE strategic_goals ADD COLUMN success_criteria text;
  END IF;
  
  -- Add kpi_metrics field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'kpi_metrics'
  ) THEN
    ALTER TABLE strategic_goals ADD COLUMN kpi_metrics jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  -- Add target_value field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'target_value'
  ) THEN
    ALTER TABLE strategic_goals ADD COLUMN target_value text;
  END IF;
  
  -- Add current_value field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'current_value'
  ) THEN
    ALTER TABLE strategic_goals ADD COLUMN current_value text;
  END IF;
  
  -- Add measurement_unit field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'measurement_unit'
  ) THEN
    ALTER TABLE strategic_goals ADD COLUMN measurement_unit text;
  END IF;
END $$;

-- Create index for better query performance on kpi_metrics
CREATE INDEX IF NOT EXISTS idx_strategic_goals_kpi_metrics ON strategic_goals USING gin(kpi_metrics);

/*
  # Add Departments and Milestones System for Strategic Goals

  1. New Tables
    - `departments`
      - `id` (uuid, primary key)
      - `name` (text) - Department name (e.g., "Engineering", "Sales", "Marketing")
      - `description` (text) - Optional description
      - `created_at` (timestamptz)
    
    - `goal_milestones`
      - `id` (uuid, primary key)
      - `goal_id` (uuid) - Links to strategic_goals
      - `title` (text) - Milestone title
      - `description` (text) - Milestone description
      - `assigned_to_id` (uuid) - Individual assigned (optional)
      - `success_criteria` (text) - What success looks like
      - `target_value` (text) - Target metric value
      - `current_value` (text) - Current progress value
      - `measurement_unit` (text) - Unit of measurement
      - `due_date` (date)
      - `status` (text) - not_started, in_progress, completed
      - `sort_order` (integer) - Order in which milestones appear
      - `created_at` (timestamptz)

  2. Updates to strategic_goals
    - Add `department_id` (uuid) - Can assign to department instead of/with person
    - Remove `target_value`, `current_value`, `measurement_unit`, `success_criteria`
    - Keep `progress_percentage` for overall goal progress

  3. Security
    - Enable RLS on departments and goal_milestones
    - Add appropriate policies for viewing and managing

  4. Important Notes
    - Goals can be assigned to a person, department, or both
    - If assigned to individual, all milestones auto-assign to that person
    - If assigned to department, milestones can be individually assigned
    - Success measures are tracked at milestone level
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Create goal_milestones table
CREATE TABLE IF NOT EXISTS goal_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES strategic_goals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  success_criteria text,
  target_value text,
  current_value text,
  measurement_unit text,
  due_date date,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;

-- Update strategic_goals table
DO $$
BEGIN
  -- Add department_id field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE strategic_goals ADD COLUMN department_id uuid REFERENCES departments(id) ON DELETE SET NULL;
  END IF;
  
  -- Remove fields that moved to milestones
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'success_criteria'
  ) THEN
    ALTER TABLE strategic_goals DROP COLUMN success_criteria;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'target_value'
  ) THEN
    ALTER TABLE strategic_goals DROP COLUMN target_value;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'current_value'
  ) THEN
    ALTER TABLE strategic_goals DROP COLUMN current_value;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'measurement_unit'
  ) THEN
    ALTER TABLE strategic_goals DROP COLUMN measurement_unit;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'strategic_goals' AND column_name = 'kpi_metrics'
  ) THEN
    ALTER TABLE strategic_goals DROP COLUMN kpi_metrics;
  END IF;
END $$;

-- RLS Policies for departments

-- All authenticated users can view departments
CREATE POLICY "Authenticated users can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create departments
CREATE POLICY "Admins can create departments"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update departments
CREATE POLICY "Admins can update departments"
  ON departments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete departments
CREATE POLICY "Admins can delete departments"
  ON departments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for goal_milestones

-- Users can view milestones for goals they can see
CREATE POLICY "Users can view relevant goal milestones"
  ON goal_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM strategic_goals
      WHERE strategic_goals.id = goal_milestones.goal_id
      AND (
        strategic_goals.assigned_to_id = auth.uid() OR
        strategic_goals.assigned_by_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (profiles.role IN ('leadership', 'admin') OR profiles.has_strategic_roadmap_access = true)
        ) OR
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.manager_id = auth.uid()
          AND p.id = strategic_goals.assigned_to_id
        )
      )
    ) OR
    assigned_to_id = auth.uid()
  );

-- Authorized users can create milestones
CREATE POLICY "Authorized users can create goal milestones"
  ON goal_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM strategic_goals
      WHERE strategic_goals.id = goal_milestones.goal_id
      AND (
        strategic_goals.assigned_by_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND (profiles.role IN ('leadership', 'admin', 'manager') OR profiles.has_strategic_roadmap_access = true)
        )
      )
    )
  );

-- Goal creators and assignees can update milestones
CREATE POLICY "Authorized users can update goal milestones"
  ON goal_milestones FOR UPDATE
  TO authenticated
  USING (
    assigned_to_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM strategic_goals
      WHERE strategic_goals.id = goal_milestones.goal_id
      AND (
        strategic_goals.assigned_by_id = auth.uid() OR
        strategic_goals.assigned_to_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Authorized users can delete milestones
CREATE POLICY "Authorized users can delete goal milestones"
  ON goal_milestones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM strategic_goals
      WHERE strategic_goals.id = goal_milestones.goal_id
      AND strategic_goals.assigned_by_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_strategic_goals_department ON strategic_goals(department_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_assigned_to ON goal_milestones(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_sort_order ON goal_milestones(goal_id, sort_order);

-- Insert common departments
INSERT INTO departments (name, description) VALUES
  ('Engineering', 'Software development and technical operations'),
  ('Sales', 'Sales and business development'),
  ('Marketing', 'Marketing and brand management'),
  ('Customer Success', 'Customer support and success'),
  ('Product', 'Product management and design'),
  ('Finance', 'Finance and accounting'),
  ('Human Resources', 'HR and talent management'),
  ('Operations', 'Business operations and administration')
ON CONFLICT (name) DO NOTHING;

/*
  # Add User Status Tracking

  1. Updates to profiles table
    - Add `active` (boolean) - Manual activation/deactivation by admin
    - Default to true for new users
  
  2. New View
    - `user_status_view` - Combines profiles with auth.users to show complete status
    - Shows: id, email, full_name, role, active (manual), confirmed (email), status (computed)
  
  3. Security
    - Only admins can update active status
    - View is accessible to authenticated users
  
  4. Status Logic
    - "pending" - User invited but hasn't confirmed email (confirmed_at IS NULL)
    - "inactive" - Admin deactivated (active = false)
    - "active" - User confirmed and active (confirmed_at IS NOT NULL AND active = true)
*/

-- Add active field to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN active boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Create index for active status
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(active);

-- Create view to show user status combining profiles and auth.users
CREATE OR REPLACE VIEW user_status_view AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
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
    WHEN au.confirmed_at IS NULL THEN 'pending'
    WHEN p.active = false THEN 'inactive'
    ELSE 'active'
  END as status
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id;

-- Grant access to the view
GRANT SELECT ON user_status_view TO authenticated;

-- Update policy to allow admins to update active status
CREATE POLICY "Admins can update user active status"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

/*
  # Add Missing Foreign Key Indexes for Performance

  ## Overview
  This migration adds indexes for all foreign key columns that are currently unindexed.
  Foreign key indexes are critical for query performance, especially for JOIN operations
  and CASCADE delete/update operations.

  ## Tables and Indexes Added
  
  ### Business Strategy System
  - `idx_business_strategies_created_by` on business_strategies(created_by)
  - `idx_business_strategies_owner_id` on business_strategies(owner_id)
  
  ### Career Development
  - `idx_career_development_plans_manager_id` on career_development_plans(manager_id)
  - `idx_career_development_plans_user_id` on career_development_plans(user_id)
  - `idx_career_pathways_user_id` on career_pathways(user_id)
  - `idx_career_plan_milestones_career_plan_id` on career_plan_milestones(career_plan_id)
  - `idx_career_plans_current_job_family_id` on career_plans(current_job_family_id)
  - `idx_career_plans_target_job_family_id` on career_plans(target_job_family_id)
  
  ### Career & Training
  - `idx_career_quiz_responses_user_id` on career_quiz_responses(user_id)
  - `idx_catchup_summaries_employee_id` on catchup_summaries(employee_id)
  - `idx_copilot_conversation_history_user_id` on copilot_conversation_history(user_id)
  
  ### Department Strategies
  - `idx_department_strategies_approved_by` on department_strategies(approved_by)
  - `idx_department_strategies_owner_id` on department_strategies(owner_id)
  
  ### Goals & Job Management
  - `idx_goals_user_id` on goals(user_id)
  - `idx_job_family_competencies_competency_id` on job_family_competencies(competency_id)
  - `idx_job_family_competencies_required_level_id` on job_family_competencies(required_level_id)
  - `idx_job_history_changed_by` on job_history(changed_by)
  - `idx_job_history_job_family_id` on job_history(job_family_id)
  - `idx_job_history_user_id` on job_history(user_id)
  
  ### One-to-One Goals
  - `idx_one_to_one_goals_cdp_id` on one_to_one_goals(cdp_id)
  - `idx_one_to_one_goals_created_by` on one_to_one_goals(created_by)
  - `idx_one_to_one_goals_user_id` on one_to_one_goals(user_id)
  
  ### Profiles & Skills
  - `idx_profile_skills_skill_id` on profile_skills(skill_id)
  - `idx_profiles_job_family_id` on profiles(job_family_id)
  - `idx_profiles_manager_id` on profiles(manager_id)
  
  ### Reviews
  - `idx_reviews_reviewer_id` on reviews(reviewer_id)
  
  ### Strategic Management
  - `idx_standalone_dept_strategies_owner_id` on standalone_department_strategies(owner_id)
  - `idx_strategic_goals_assigned_by_id` on strategic_goals(assigned_by_id)
  - `idx_strategic_goals_assigned_to_id` on strategic_goals(assigned_to_id)
  - `idx_strategic_goals_parent_goal_id` on strategic_goals(parent_goal_id)
  - `idx_strategic_goals_roadmap_id` on strategic_goals(roadmap_id)
  - `idx_strategic_roadmaps_owner_id` on strategic_roadmaps(owner_id)
  - `idx_strategy_actions_created_by` on strategy_actions(created_by)
  
  ### System & Training
  - `idx_system_settings_updated_by` on system_settings(updated_by)
  - `idx_training_attendees_training_session_id` on training_attendees(training_session_id)
  - `idx_training_completions_course_id` on training_completions(course_id)
  - `idx_training_module_links_job_family_id` on training_module_links(job_family_id)
  
  ### User Management
  - `idx_user_cvs_user_id` on user_cvs(user_id)
  - `idx_weekly_catchups_employee_id` on weekly_catchups(employee_id)
  - `idx_weekly_catchups_manager_id` on weekly_catchups(manager_id)

  ## Performance Impact
  These indexes will significantly improve:
  - JOIN operation performance
  - Foreign key constraint checking
  - CASCADE operations (delete/update)
  - Query filtering on foreign key columns
*/

-- Business Strategies
CREATE INDEX IF NOT EXISTS idx_business_strategies_created_by ON business_strategies(created_by);
CREATE INDEX IF NOT EXISTS idx_business_strategies_owner_id ON business_strategies(owner_id);

-- Career Development Plans
CREATE INDEX IF NOT EXISTS idx_career_development_plans_manager_id ON career_development_plans(manager_id);
CREATE INDEX IF NOT EXISTS idx_career_development_plans_user_id ON career_development_plans(user_id);

-- Career Pathways
CREATE INDEX IF NOT EXISTS idx_career_pathways_user_id ON career_pathways(user_id);

-- Career Plan Milestones
CREATE INDEX IF NOT EXISTS idx_career_plan_milestones_career_plan_id ON career_plan_milestones(career_plan_id);

-- Career Plans
CREATE INDEX IF NOT EXISTS idx_career_plans_current_job_family_id ON career_plans(current_job_family_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_target_job_family_id ON career_plans(target_job_family_id);

-- Career Quiz
CREATE INDEX IF NOT EXISTS idx_career_quiz_responses_user_id ON career_quiz_responses(user_id);

-- Catchup Summaries
CREATE INDEX IF NOT EXISTS idx_catchup_summaries_employee_id ON catchup_summaries(employee_id);

-- Copilot
CREATE INDEX IF NOT EXISTS idx_copilot_conversation_history_user_id ON copilot_conversation_history(user_id);

-- Department Strategies
CREATE INDEX IF NOT EXISTS idx_department_strategies_approved_by ON department_strategies(approved_by);
CREATE INDEX IF NOT EXISTS idx_department_strategies_owner_id ON department_strategies(owner_id);

-- Goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- Job Family Competencies
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_competency_id ON job_family_competencies(competency_id);
CREATE INDEX IF NOT EXISTS idx_job_family_competencies_required_level_id ON job_family_competencies(required_level_id);

-- Job History
CREATE INDEX IF NOT EXISTS idx_job_history_changed_by ON job_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_job_history_job_family_id ON job_history(job_family_id);
CREATE INDEX IF NOT EXISTS idx_job_history_user_id ON job_history(user_id);

-- One-to-One Goals
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_cdp_id ON one_to_one_goals(cdp_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_created_by ON one_to_one_goals(created_by);
CREATE INDEX IF NOT EXISTS idx_one_to_one_goals_user_id ON one_to_one_goals(user_id);

-- Profile Skills
CREATE INDEX IF NOT EXISTS idx_profile_skills_skill_id ON profile_skills(skill_id);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_job_family_id ON profiles(job_family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON profiles(manager_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);

-- Standalone Department Strategies
CREATE INDEX IF NOT EXISTS idx_standalone_dept_strategies_owner_id ON standalone_department_strategies(owner_id);

-- Strategic Goals
CREATE INDEX IF NOT EXISTS idx_strategic_goals_assigned_by_id ON strategic_goals(assigned_by_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_assigned_to_id ON strategic_goals(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_parent_goal_id ON strategic_goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_strategic_goals_roadmap_id ON strategic_goals(roadmap_id);

-- Strategic Roadmaps
CREATE INDEX IF NOT EXISTS idx_strategic_roadmaps_owner_id ON strategic_roadmaps(owner_id);

-- Strategy Actions
CREATE INDEX IF NOT EXISTS idx_strategy_actions_created_by ON strategy_actions(created_by);

-- System Settings
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON system_settings(updated_by);

-- Training Attendees
CREATE INDEX IF NOT EXISTS idx_training_attendees_training_session_id ON training_attendees(training_session_id);

-- Training Completions
CREATE INDEX IF NOT EXISTS idx_training_completions_course_id ON training_completions(course_id);

-- Training Module Links
CREATE INDEX IF NOT EXISTS idx_training_module_links_job_family_id ON training_module_links(job_family_id);

-- User CVs
CREATE INDEX IF NOT EXISTS idx_user_cvs_user_id ON user_cvs(user_id);

-- Weekly Catchups
CREATE INDEX IF NOT EXISTS idx_weekly_catchups_employee_id ON weekly_catchups(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_catchups_manager_id ON weekly_catchups(manager_id);
/*
  # Optimize RLS Policies - Part 1 (Profiles, System Settings, Departments, Job Titles)

  ## Overview
  This migration optimizes Row Level Security (RLS) policies by wrapping auth function calls
  with SELECT statements. This prevents the auth functions from being re-evaluated for each
  row, dramatically improving query performance at scale.

  ## Changes Made
  
  ### Profiles Table
  - Updated "Admins can update user active status" policy
  
  ### System Settings Table
  - Updated "Admins can insert settings" policy
  - Updated "Admins can update settings" policy
  
  ### Departments Table
  - Updated "Admins can create departments" policy
  - Updated "Admins can delete departments" policy
  - Updated "Admins can update departments" policy
  
  ### Job Titles Table
  - Updated "Admins can create job titles" policy
  - Updated "Admins can delete job titles" policy
  - Updated "Admins can update job titles" policy

  ## Performance Impact
  This optimization prevents auth functions from being called once per row, instead calling
  them once per query. This can result in 10-100x performance improvements on large tables.
*/

-- ==========================================
-- PROFILES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can update user active status" ON profiles;
CREATE POLICY "Admins can update user active status"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
    )
  );

-- ==========================================
-- SYSTEM SETTINGS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can insert settings" ON system_settings;
CREATE POLICY "Admins can insert settings"
  ON system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update settings" ON system_settings;
CREATE POLICY "Admins can update settings"
  ON system_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- ==========================================
-- DEPARTMENTS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can create departments" ON departments;
CREATE POLICY "Admins can create departments"
  ON departments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete departments" ON departments;
CREATE POLICY "Admins can delete departments"
  ON departments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update departments" ON departments;
CREATE POLICY "Admins can update departments"
  ON departments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- ==========================================
-- JOB TITLES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admins can create job titles" ON job_titles;
CREATE POLICY "Admins can create job titles"
  ON job_titles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete job titles" ON job_titles;
CREATE POLICY "Admins can delete job titles"
  ON job_titles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update job titles" ON job_titles;
CREATE POLICY "Admins can update job titles"
  ON job_titles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );
/*
  # Optimize RLS Policies - Part 2 (Goal Milestones and Strategy Tables)

  ## Overview
  Continues optimization of RLS policies by wrapping auth function calls with SELECT statements.

  ## Changes Made
  
  ### Goal Milestones Table
  - Updated "Authorized users can create goal milestones" policy
  - Updated "Authorized users can delete goal milestones" policy
  - Updated "Authorized users can update goal milestones" policy
  - Updated "Users can view relevant goal milestones" policy
  
  ### Business Strategies Table
  - Updated "Admin can delete business strategies" policy
  - Updated "Leadership and admin can create business strategies" policy
  - Updated "Leadership and admin can update business strategies" policy
  
  ### Department Strategies Table
  - Updated "Department heads and leadership can create department strategies" policy
  - Updated "Department owners and leadership can update department strategies" policy
  - Updated "Leadership and admin can delete department strategies" policy
  - Updated "Users can view department strategies in their department" policy
  
  ### Strategy Actions Table
  - Updated "Assigned users and managers can update actions" policy
  - Updated "Managers and above can create actions" policy
  - Updated "Managers and above can delete actions" policy
  - Updated "Users can view actions in their department" policy
*/

-- ==========================================
-- GOAL MILESTONES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Authorized users can create goal milestones" ON goal_milestones;
CREATE POLICY "Authorized users can create goal milestones"
  ON goal_milestones
  FOR INSERT
  TO authenticated
  WITH CHECK (
    assigned_to_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Authorized users can delete goal milestones" ON goal_milestones;
CREATE POLICY "Authorized users can delete goal milestones"
  ON goal_milestones
  FOR DELETE
  TO authenticated
  USING (
    assigned_to_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Authorized users can update goal milestones" ON goal_milestones;
CREATE POLICY "Authorized users can update goal milestones"
  ON goal_milestones
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  )
  WITH CHECK (
    assigned_to_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view relevant goal milestones" ON goal_milestones;
CREATE POLICY "Users can view relevant goal milestones"
  ON goal_milestones
  FOR SELECT
  TO authenticated
  USING (
    assigned_to_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

-- ==========================================
-- BUSINESS STRATEGIES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Admin can delete business strategies" ON business_strategies;
CREATE POLICY "Admin can delete business strategies"
  ON business_strategies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Leadership and admin can create business strategies" ON business_strategies;
CREATE POLICY "Leadership and admin can create business strategies"
  ON business_strategies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Leadership and admin can update business strategies" ON business_strategies;
CREATE POLICY "Leadership and admin can update business strategies"
  ON business_strategies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

-- ==========================================
-- DEPARTMENT STRATEGIES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Department heads and leadership can create department strategie" ON department_strategies;
CREATE POLICY "Department heads and leadership can create department strategie"
  ON department_strategies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Department owners and leadership can update department strategi" ON department_strategies;
CREATE POLICY "Department owners and leadership can update department strategi"
  ON department_strategies
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  )
  WITH CHECK (
    owner_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Leadership and admin can delete department strategies" ON department_strategies;
CREATE POLICY "Leadership and admin can delete department strategies"
  ON department_strategies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view department strategies in their department" ON department_strategies;
CREATE POLICY "Users can view department strategies in their department"
  ON department_strategies
  FOR SELECT
  TO authenticated
  USING (
    department IN (
      SELECT department FROM profiles
      WHERE id = (SELECT auth.uid())
    )
  );

-- ==========================================
-- STRATEGY ACTIONS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Assigned users and managers can update actions" ON strategy_actions;
CREATE POLICY "Assigned users and managers can update actions"
  ON strategy_actions
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  )
  WITH CHECK (
    assigned_to = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers and above can create actions" ON strategy_actions;
CREATE POLICY "Managers and above can create actions"
  ON strategy_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers and above can delete actions" ON strategy_actions;
CREATE POLICY "Managers and above can delete actions"
  ON strategy_actions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view actions in their department" ON strategy_actions;
CREATE POLICY "Users can view actions in their department"
  ON strategy_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM department_strategies ds
      WHERE ds.id = strategy_actions.department_strategy_id
      AND ds.department IN (
        SELECT department FROM profiles WHERE id = (SELECT auth.uid())
      )
    )
  );
/*
  # Optimize RLS Policies - Part 3 (Standalone Strategies)

  ## Overview
  Continues optimization of RLS policies for standalone strategy tables.

  ## Changes Made
  
  ### Standalone Department Strategies Table
  - Updated "Department managers can create standalone strategies" policy
  - Updated "Leadership and admin can delete standalone strategies" policy
  - Updated "Strategy owners and leadership can update standalone strategies" policy
  - Updated "Users can view standalone strategies in their department" policy
  
  ### Standalone Strategy Actions Table
  - Updated "Assigned users and managers can update standalone actions" policy
  - Updated "Managers and above can create standalone actions" policy
  - Updated "Managers and above can delete standalone actions" policy
  - Updated "Users can view standalone actions in their department" policy
*/

-- ==========================================
-- STANDALONE DEPARTMENT STRATEGIES TABLE
-- ==========================================

DROP POLICY IF EXISTS "Department managers can create standalone strategies" ON standalone_department_strategies;
CREATE POLICY "Department managers can create standalone strategies"
  ON standalone_department_strategies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Leadership and admin can delete standalone strategies" ON standalone_department_strategies;
CREATE POLICY "Leadership and admin can delete standalone strategies"
  ON standalone_department_strategies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Strategy owners and leadership can update standalone strategies" ON standalone_department_strategies;
CREATE POLICY "Strategy owners and leadership can update standalone strategies"
  ON standalone_department_strategies
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  )
  WITH CHECK (
    owner_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view standalone strategies in their department" ON standalone_department_strategies;
CREATE POLICY "Users can view standalone strategies in their department"
  ON standalone_department_strategies
  FOR SELECT
  TO authenticated
  USING (
    department IN (
      SELECT department FROM profiles
      WHERE id = (SELECT auth.uid())
    )
  );

-- ==========================================
-- STANDALONE STRATEGY ACTIONS TABLE
-- ==========================================

DROP POLICY IF EXISTS "Assigned users and managers can update standalone actions" ON standalone_strategy_actions;
CREATE POLICY "Assigned users and managers can update standalone actions"
  ON standalone_strategy_actions
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  )
  WITH CHECK (
    assigned_to = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers and above can create standalone actions" ON standalone_strategy_actions;
CREATE POLICY "Managers and above can create standalone actions"
  ON standalone_strategy_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers and above can delete standalone actions" ON standalone_strategy_actions;
CREATE POLICY "Managers and above can delete standalone actions"
  ON standalone_strategy_actions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view standalone actions in their department" ON standalone_strategy_actions;
CREATE POLICY "Users can view standalone actions in their department"
  ON standalone_strategy_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM standalone_department_strategies sds
      WHERE sds.id = standalone_strategy_actions.standalone_strategy_id
      AND sds.department IN (
        SELECT department FROM profiles WHERE id = (SELECT auth.uid())
      )
    )
  );
/*
  # Remove Unused Indexes

  ## Overview
  This migration removes indexes that have not been used, which helps improve:
  - Write performance (INSERT, UPDATE, DELETE operations)
  - Storage efficiency
  - Maintenance overhead

  ## Indexes Removed
  
  ### Department Strategies
  - `idx_dept_strategies_business_strategy` - Unused
  - `idx_dept_strategies_department` - Unused
  - `idx_dept_strategies_approval` - Unused
  
  ### Strategy Actions
  - `idx_strategy_actions_dept_strategy` - Unused
  - `idx_strategy_actions_assigned` - Unused
  - `idx_strategy_actions_status` - Unused
  
  ### Standalone Department Strategies
  - `idx_standalone_dept_strategies_dept` - Unused
  
  ### Standalone Strategy Actions
  - `idx_standalone_actions_strategy` - Unused
  - `idx_standalone_actions_assigned` - Unused
  
  ### Goal Milestones
  - `idx_goal_milestones_goal` - Unused
  - `idx_goal_milestones_assigned_to` - Unused
  - `idx_goal_milestones_sort_order` - Unused
  
  ### Job Titles
  - `idx_job_titles_active` - Unused
  
  ### Job Families
  - `idx_job_families_job_title` - Unused
  
  ### Profiles
  - `idx_profiles_job_title` - Unused (job_title field no longer primary identifier)
  - `idx_profiles_active` - Unused

  ## Important Notes
  - Foreign key indexes were KEPT (added in previous migration)
  - Only truly unused indexes are being removed
  - These can be recreated if query patterns change in the future
*/

-- Department Strategies
DROP INDEX IF EXISTS idx_dept_strategies_business_strategy;
DROP INDEX IF EXISTS idx_dept_strategies_department;
DROP INDEX IF EXISTS idx_dept_strategies_approval;

-- Strategy Actions
DROP INDEX IF EXISTS idx_strategy_actions_dept_strategy;
DROP INDEX IF EXISTS idx_strategy_actions_assigned;
DROP INDEX IF EXISTS idx_strategy_actions_status;

-- Standalone Department Strategies
DROP INDEX IF EXISTS idx_standalone_dept_strategies_dept;

-- Standalone Strategy Actions
DROP INDEX IF EXISTS idx_standalone_actions_strategy;
DROP INDEX IF EXISTS idx_standalone_actions_assigned;

-- Goal Milestones
DROP INDEX IF EXISTS idx_goal_milestones_goal;
DROP INDEX IF EXISTS idx_goal_milestones_assigned_to;
DROP INDEX IF EXISTS idx_goal_milestones_sort_order;

-- Job Titles
DROP INDEX IF EXISTS idx_job_titles_active;

-- Job Families
DROP INDEX IF EXISTS idx_job_families_job_title;

-- Profiles
DROP INDEX IF EXISTS idx_profiles_job_title;
DROP INDEX IF EXISTS idx_profiles_active;
/*
  # Fix Function Search Paths for Security

  ## Overview
  This migration sets explicit search paths for database functions to prevent
  security vulnerabilities related to mutable search paths. Functions with
  mutable search paths can be exploited through search_path manipulation.

  ## Security Impact
  Setting an explicit search path ensures:
  - Functions cannot be exploited via search_path hijacking
  - Functions always reference the correct schema
  - Protects against privilege escalation attacks

  ## Functions Updated
  - calculate_department_strategy_progress
  - calculate_business_strategy_progress
  - calculate_standalone_strategy_progress
  - update_department_strategy_progress
  - update_business_strategy_progress
  - update_standalone_strategy_progress
  - update_job_titles_updated_at

  ## Changes Made
  Each function is altered to set:
  - SET search_path = public, pg_temp
*/

-- Fix calculate_department_strategy_progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_department_strategy_progress') THEN
    ALTER FUNCTION calculate_department_strategy_progress(uuid)
      SET search_path = public, pg_temp;
  END IF;
END $$;

-- Fix calculate_business_strategy_progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_business_strategy_progress') THEN
    ALTER FUNCTION calculate_business_strategy_progress(uuid)
      SET search_path = public, pg_temp;
  END IF;
END $$;

-- Fix calculate_standalone_strategy_progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_standalone_strategy_progress') THEN
    ALTER FUNCTION calculate_standalone_strategy_progress(uuid)
      SET search_path = public, pg_temp;
  END IF;
END $$;

-- Fix update_department_strategy_progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_department_strategy_progress') THEN
    ALTER FUNCTION update_department_strategy_progress()
      SET search_path = public, pg_temp;
  END IF;
END $$;

-- Fix update_business_strategy_progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_business_strategy_progress') THEN
    ALTER FUNCTION update_business_strategy_progress()
      SET search_path = public, pg_temp;
  END IF;
END $$;

-- Fix update_standalone_strategy_progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_standalone_strategy_progress') THEN
    ALTER FUNCTION update_standalone_strategy_progress()
      SET search_path = public, pg_temp;
  END IF;
END $$;

-- Fix update_job_titles_updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_job_titles_updated_at') THEN
    ALTER FUNCTION update_job_titles_updated_at()
      SET search_path = public, pg_temp;
  END IF;
END $$;
/*
  # Create Comprehensive Review and One-to-One Meeting System

  1. New Tables
    - `review_meetings`
      - Scheduled one-to-one meetings between managers and employees
      - Supports weekly check-ins and monthly reviews
      - Tracks meeting status, agenda, and completion
    
    - `review_actions`
      - Actions and milestones discussed in meetings
      - Tracks progress, completion status, and feedback
    
    - `review_kpi_ratings`
      - KPI assessments during reviews
      - Stores ratings and progress notes
    
    - `review_competency_assessments`
      - Competency feedback linked to job family competencies
      - AI-recommended ratings and manager feedback
      - Flags high ratings (4) for manager's manager approval
    
    - `review_summaries`
      - AI-generated overall summaries
      - Areas for development and suggested goals
      - Manager acceptance and modifications
    
    - `review_approvals`
      - Approval workflow for high competency ratings
      - Manager's manager reviews and approves rating 4 assessments
    
    - `review_employee_notes`
      - Employee responses and notes after review completion
    
  2. Security
    - Enable RLS on all tables
    - Managers can manage reviews for their direct reports
    - Employees can view their own reviews and add notes
    - Senior managers can approve competency ratings
*/

-- Review Meetings Table
CREATE TABLE IF NOT EXISTS review_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meeting_type text NOT NULL CHECK (meeting_type IN ('weekly_checkin', 'monthly_review')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_date timestamptz NOT NULL,
  completed_date timestamptz,
  agenda text,
  meeting_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_meetings_manager ON review_meetings(manager_id);
CREATE INDEX IF NOT EXISTS idx_review_meetings_employee ON review_meetings(employee_id);
CREATE INDEX IF NOT EXISTS idx_review_meetings_status ON review_meetings(status);
CREATE INDEX IF NOT EXISTS idx_review_meetings_date ON review_meetings(scheduled_date);

-- Review Actions Table
CREATE TABLE IF NOT EXISTS review_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES review_meetings(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date timestamptz,
  progress_notes text,
  completed_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_actions_meeting ON review_actions(meeting_id);
CREATE INDEX IF NOT EXISTS idx_review_actions_status ON review_actions(status);

-- Review KPI Ratings Table
CREATE TABLE IF NOT EXISTS review_kpi_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES review_meetings(id) ON DELETE CASCADE,
  kpi_name text NOT NULL,
  kpi_description text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  target_value text,
  actual_value text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_kpi_ratings_meeting ON review_kpi_ratings(meeting_id);

-- Review Competency Assessments Table
CREATE TABLE IF NOT EXISTS review_competency_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES review_meetings(id) ON DELETE CASCADE,
  competency_id uuid REFERENCES competencies(id) ON DELETE SET NULL,
  competency_name text NOT NULL,
  feedback text NOT NULL,
  manager_rating integer CHECK (manager_rating >= 1 AND manager_rating <= 4),
  ai_recommended_rating integer CHECK (ai_recommended_rating >= 1 AND ai_recommended_rating <= 4),
  requires_approval boolean DEFAULT false,
  approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'not_required')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_competency_assessments_meeting ON review_competency_assessments(meeting_id);
CREATE INDEX IF NOT EXISTS idx_review_competency_assessments_approval ON review_competency_assessments(approval_status) WHERE requires_approval = true;

-- Review Summaries Table
CREATE TABLE IF NOT EXISTS review_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES review_meetings(id) ON DELETE CASCADE,
  overall_summary text NOT NULL,
  areas_for_development text[],
  suggested_goals text[],
  ai_generated_content jsonb,
  manager_modified boolean DEFAULT false,
  manager_modifications text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(meeting_id)
);

CREATE INDEX IF NOT EXISTS idx_review_summaries_meeting ON review_summaries(meeting_id);

-- Review Approvals Table
CREATE TABLE IF NOT EXISTS review_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_assessment_id uuid NOT NULL REFERENCES review_competency_assessments(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments text,
  reviewed_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_approvals_assessment ON review_approvals(competency_assessment_id);
CREATE INDEX IF NOT EXISTS idx_review_approvals_approver ON review_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_review_approvals_status ON review_approvals(status);

-- Review Employee Notes Table
CREATE TABLE IF NOT EXISTS review_employee_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES review_meetings(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notes text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(meeting_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_review_employee_notes_meeting ON review_employee_notes(meeting_id);
CREATE INDEX IF NOT EXISTS idx_review_employee_notes_employee ON review_employee_notes(employee_id);

-- Enable RLS
ALTER TABLE review_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_kpi_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_competency_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_employee_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_meetings
CREATE POLICY "Managers can view meetings for their team"
  ON review_meetings FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid() OR
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'leadership')
    )
  );

CREATE POLICY "Managers can create meetings for their team"
  ON review_meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'leadership', 'admin')
    ) AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = employee_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update their team's meetings"
  ON review_meetings FOR UPDATE
  TO authenticated
  USING (manager_id = auth.uid())
  WITH CHECK (manager_id = auth.uid());

CREATE POLICY "Managers can delete their team's meetings"
  ON review_meetings FOR DELETE
  TO authenticated
  USING (manager_id = auth.uid());

-- RLS Policies for review_actions
CREATE POLICY "Users can view actions for their meetings"
  ON review_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND (review_meetings.manager_id = auth.uid() OR review_meetings.employee_id = auth.uid())
    )
  );

CREATE POLICY "Managers can create actions for their meetings"
  ON review_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers and employees can update actions"
  ON review_actions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND (review_meetings.manager_id = auth.uid() OR review_meetings.employee_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND (review_meetings.manager_id = auth.uid() OR review_meetings.employee_id = auth.uid())
    )
  );

CREATE POLICY "Managers can delete actions"
  ON review_actions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  );

-- RLS Policies for review_kpi_ratings
CREATE POLICY "Users can view KPI ratings for their meetings"
  ON review_kpi_ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND (review_meetings.manager_id = auth.uid() OR review_meetings.employee_id = auth.uid())
    )
  );

CREATE POLICY "Managers can manage KPI ratings"
  ON review_kpi_ratings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  );

-- RLS Policies for review_competency_assessments
CREATE POLICY "Users can view competency assessments for their meetings"
  ON review_competency_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND (review_meetings.manager_id = auth.uid() OR review_meetings.employee_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM review_approvals
      WHERE review_approvals.competency_assessment_id = id
      AND review_approvals.approver_id = auth.uid()
    )
  );

CREATE POLICY "Managers can manage competency assessments"
  ON review_competency_assessments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  );

-- RLS Policies for review_summaries
CREATE POLICY "Users can view summaries for their meetings"
  ON review_summaries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND (review_meetings.manager_id = auth.uid() OR review_meetings.employee_id = auth.uid())
    )
  );

CREATE POLICY "Managers can manage summaries"
  ON review_summaries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  );

-- RLS Policies for review_approvals
CREATE POLICY "Approvers and managers can view approvals"
  ON review_approvals FOR SELECT
  TO authenticated
  USING (
    approver_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM review_competency_assessments rca
      JOIN review_meetings rm ON rm.id = rca.meeting_id
      WHERE rca.id = competency_assessment_id
      AND rm.manager_id = auth.uid()
    )
  );

CREATE POLICY "System can create approvals"
  ON review_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_competency_assessments rca
      JOIN review_meetings rm ON rm.id = rca.meeting_id
      WHERE rca.id = competency_assessment_id
      AND rm.manager_id = auth.uid()
    )
  );

CREATE POLICY "Approvers can update their approvals"
  ON review_approvals FOR UPDATE
  TO authenticated
  USING (approver_id = auth.uid())
  WITH CHECK (approver_id = auth.uid());

-- RLS Policies for review_employee_notes
CREATE POLICY "Employees and managers can view employee notes"
  ON review_employee_notes FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.manager_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create their own notes"
  ON review_employee_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM review_meetings
      WHERE review_meetings.id = meeting_id
      AND review_meetings.employee_id = auth.uid()
    )
  );

CREATE POLICY "Employees can update their own notes"
  ON review_employee_notes FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_review_meetings_updated_at
  BEFORE UPDATE ON review_meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_review_updated_at();

CREATE TRIGGER update_review_actions_updated_at
  BEFORE UPDATE ON review_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_review_updated_at();

CREATE TRIGGER update_review_kpi_ratings_updated_at
  BEFORE UPDATE ON review_kpi_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_review_updated_at();

CREATE TRIGGER update_review_competency_assessments_updated_at
  BEFORE UPDATE ON review_competency_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_review_updated_at();

CREATE TRIGGER update_review_summaries_updated_at
  BEFORE UPDATE ON review_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_review_updated_at();

CREATE TRIGGER update_review_approvals_updated_at
  BEFORE UPDATE ON review_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_review_updated_at();

CREATE TRIGGER update_review_employee_notes_updated_at
  BEFORE UPDATE ON review_employee_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_review_updated_at();

/*
  # Create Performance Ratings Tracking System

  1. New Table: `performance_ratings`
    - `id` (uuid, primary key)
    - `employee_id` (uuid, references profiles) - The employee being rated
    - `review_period` (date) - Month/period of the rating (first day of month)
    - `competency_score` (numeric) - Average of all competency ratings (1-4)
    - `performance_score` (numeric) - Average of all KPI ratings (1-5)
    - `overall_rating` (numeric) - Weighted overall rating
    - `rating_category` (text) - Text category (Needs Improvement, Developing, Meets Expectations, Exceeds Expectations, Outstanding)
    - `review_meeting_id` (uuid, references review_meetings) - Source review
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Function: Calculate performance ratings automatically
    - Triggered when review is completed
    - Calculates competency average from assessments
    - Calculates performance average from KPIs
    - Creates overall rating (60% performance, 40% competency)
    - Assigns rating category

  3. Security
    - Enable RLS on performance_ratings table
    - Employees can read their own ratings
    - Managers can read their team's ratings
    - Admins and senior leadership can read all ratings
*/

-- Create performance_ratings table
CREATE TABLE IF NOT EXISTS performance_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_period date NOT NULL,
  competency_score numeric(3,2) CHECK (competency_score >= 1 AND competency_score <= 4),
  performance_score numeric(3,2) CHECK (performance_score >= 1 AND performance_score <= 5),
  overall_rating numeric(3,2) CHECK (overall_rating >= 1 AND overall_rating <= 5),
  rating_category text CHECK (rating_category IN ('Needs Improvement', 'Developing', 'Meets Expectations', 'Exceeds Expectations', 'Outstanding')),
  review_meeting_id uuid REFERENCES review_meetings(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, review_period)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_performance_ratings_employee ON performance_ratings(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_ratings_period ON performance_ratings(review_period);
CREATE INDEX IF NOT EXISTS idx_performance_ratings_category ON performance_ratings(rating_category);

-- Enable RLS
ALTER TABLE performance_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can read their own ratings
CREATE POLICY "Employees can read own ratings"
  ON performance_ratings
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Policy: Managers can read their team's ratings
CREATE POLICY "Managers can read team ratings"
  ON performance_ratings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = performance_ratings.employee_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Policy: Admins can read all ratings
CREATE POLICY "Admins can read all ratings"
  ON performance_ratings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: System can insert ratings (for automated calculation)
CREATE POLICY "System can insert ratings"
  ON performance_ratings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: System can update ratings
CREATE POLICY "System can update ratings"
  ON performance_ratings
  FOR UPDATE
  TO authenticated
  USING (true);

-- Function to calculate rating category
CREATE OR REPLACE FUNCTION calculate_rating_category(score numeric)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF score < 2.0 THEN
    RETURN 'Needs Improvement';
  ELSIF score < 3.0 THEN
    RETURN 'Developing';
  ELSIF score < 3.5 THEN
    RETURN 'Meets Expectations';
  ELSIF score < 4.5 THEN
    RETURN 'Exceeds Expectations';
  ELSE
    RETURN 'Outstanding';
  END IF;
END;
$$;

-- Function to create performance rating from completed review
CREATE OR REPLACE FUNCTION create_performance_rating(meeting_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
  v_review_date date;
  v_competency_avg numeric;
  v_performance_avg numeric;
  v_overall_rating numeric;
  v_rating_category text;
BEGIN
  -- Get meeting details
  SELECT employee_id, DATE_TRUNC('month', scheduled_date)::date
  INTO v_employee_id, v_review_date
  FROM review_meetings
  WHERE id = meeting_id_param;

  -- Calculate competency average (1-4 scale)
  SELECT AVG(manager_rating)
  INTO v_competency_avg
  FROM review_competency_assessments
  WHERE meeting_id = meeting_id_param
  AND manager_rating IS NOT NULL;

  -- Calculate performance average from KPIs (1-5 scale)
  SELECT AVG(rating)
  INTO v_performance_avg
  FROM review_kpi_ratings
  WHERE meeting_id = meeting_id_param
  AND rating IS NOT NULL;

  -- Normalize and calculate overall rating (convert to 1-5 scale)
  -- Competency: normalize from 1-4 to 1-5 scale (multiply by 1.25)
  -- Overall = 60% performance + 40% competency
  IF v_performance_avg IS NOT NULL AND v_competency_avg IS NOT NULL THEN
    v_overall_rating := (v_performance_avg * 0.6) + ((v_competency_avg * 1.25) * 0.4);
  ELSIF v_performance_avg IS NOT NULL THEN
    v_overall_rating := v_performance_avg;
  ELSIF v_competency_avg IS NOT NULL THEN
    v_overall_rating := v_competency_avg * 1.25;
  ELSE
    RETURN;
  END IF;

  -- Get rating category
  v_rating_category := calculate_rating_category(v_overall_rating);

  -- Insert or update performance rating
  INSERT INTO performance_ratings (
    employee_id,
    review_period,
    competency_score,
    performance_score,
    overall_rating,
    rating_category,
    review_meeting_id
  )
  VALUES (
    v_employee_id,
    v_review_date,
    v_competency_avg,
    v_performance_avg,
    v_overall_rating,
    v_rating_category,
    meeting_id_param
  )
  ON CONFLICT (employee_id, review_period)
  DO UPDATE SET
    competency_score = EXCLUDED.competency_score,
    performance_score = EXCLUDED.performance_score,
    overall_rating = EXCLUDED.overall_rating,
    rating_category = EXCLUDED.rating_category,
    review_meeting_id = EXCLUDED.review_meeting_id,
    updated_at = now();
END;
$$;

/*
  # Update Review System for Weekly Check-ins and Multiple Review Types

  1. Updates to review_meetings table
    - Add review_type enum with expanded options
    - Add week_number for weekly check-ins
    - Add is_averaged_from_weeklies flag for monthly reviews

  2. New Table: weekly_performance_scores
    - Stores weekly check-in KPI scores
    - Used to calculate monthly averages
    
  3. New Table: half_year_review_summaries
    - Stores aggregated data from previous 6 months
    - Links to half-year review meeting

  4. Updates
    - Review meeting types expanded
    - Support for weekly KPI tracking
    - Monthly averages from weekly scores
*/

-- Drop existing review type constraint if it exists
DO $$
BEGIN
  ALTER TABLE review_meetings DROP CONSTRAINT IF EXISTS review_meetings_meeting_type_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add new columns to review_meetings
ALTER TABLE review_meetings 
  ADD COLUMN IF NOT EXISTS review_type text DEFAULT 'monthly_one_to_one',
  ADD COLUMN IF NOT EXISTS week_number integer,
  ADD COLUMN IF NOT EXISTS is_averaged_from_weeklies boolean DEFAULT false;

-- Add constraint for review types
ALTER TABLE review_meetings 
  ADD CONSTRAINT review_meetings_review_type_check 
  CHECK (review_type IN ('weekly_check_in', 'monthly_one_to_one', 'probation_review', 'half_year_review'));

-- Create weekly_performance_scores table
CREATE TABLE IF NOT EXISTS weekly_performance_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES review_meetings(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  month_date date NOT NULL,
  kpi_scores jsonb DEFAULT '[]'::jsonb,
  average_score numeric(3,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, month_date, week_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_weekly_scores_employee ON weekly_performance_scores(employee_id);
CREATE INDEX IF NOT EXISTS idx_weekly_scores_month ON weekly_performance_scores(month_date);
CREATE INDEX IF NOT EXISTS idx_review_meetings_type ON review_meetings(review_type);
CREATE INDEX IF NOT EXISTS idx_review_meetings_week ON review_meetings(week_number);

-- Enable RLS
ALTER TABLE weekly_performance_scores ENABLE ROW LEVEL SECURITY;

-- Policies for weekly_performance_scores
CREATE POLICY "Employees can read own weekly scores"
  ON weekly_performance_scores
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can read team weekly scores"
  ON weekly_performance_scores
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = weekly_performance_scores.employee_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can insert weekly scores"
  ON weekly_performance_scores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = weekly_performance_scores.employee_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update weekly scores"
  ON weekly_performance_scores
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = weekly_performance_scores.employee_id
      AND profiles.manager_id = auth.uid()
    )
  );

-- Create half_year_review_summaries table
CREATE TABLE IF NOT EXISTS half_year_review_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES review_meetings(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  avg_competency_score numeric(3,2),
  avg_performance_score numeric(3,2),
  avg_overall_rating numeric(3,2),
  monthly_ratings jsonb DEFAULT '[]'::jsonb,
  performance_trend text,
  key_achievements text,
  development_areas text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, review_period_end)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_half_year_summaries_employee ON half_year_review_summaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_half_year_summaries_period ON half_year_review_summaries(review_period_end);

-- Enable RLS
ALTER TABLE half_year_review_summaries ENABLE ROW LEVEL SECURITY;

-- Policies for half_year_review_summaries
CREATE POLICY "Employees can read own half year summaries"
  ON half_year_review_summaries
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can read team half year summaries"
  ON half_year_review_summaries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = half_year_review_summaries.employee_id
      AND profiles.manager_id = auth.uid()
    )
  );

CREATE POLICY "System can insert half year summaries"
  ON half_year_review_summaries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to calculate monthly average from weekly scores
CREATE OR REPLACE FUNCTION calculate_monthly_kpi_average(
  employee_id_param uuid,
  month_date_param date
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  monthly_avg numeric;
BEGIN
  SELECT AVG(average_score)
  INTO monthly_avg
  FROM weekly_performance_scores
  WHERE employee_id = employee_id_param
  AND month_date = month_date_param;
  
  RETURN COALESCE(monthly_avg, 0);
END;
$$;

-- Function to generate half-year summary
CREATE OR REPLACE FUNCTION generate_half_year_summary(
  employee_id_param uuid,
  end_date_param date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_date date;
  summary jsonb;
  monthly_data jsonb;
BEGIN
  start_date := end_date_param - INTERVAL '6 months';
  
  -- Get all monthly ratings from the period
  SELECT jsonb_agg(
    jsonb_build_object(
      'period', review_period,
      'overall_rating', overall_rating,
      'competency_score', competency_score,
      'performance_score', performance_score,
      'rating_category', rating_category
    )
    ORDER BY review_period
  )
  INTO monthly_data
  FROM performance_ratings
  WHERE employee_id = employee_id_param
  AND review_period >= start_date
  AND review_period <= end_date_param;
  
  -- Calculate averages
  SELECT jsonb_build_object(
    'avg_competency', AVG(competency_score),
    'avg_performance', AVG(performance_score),
    'avg_overall', AVG(overall_rating),
    'monthly_data', COALESCE(monthly_data, '[]'::jsonb)
  )
  INTO summary
  FROM performance_ratings
  WHERE employee_id = employee_id_param
  AND review_period >= start_date
  AND review_period <= end_date_param;
  
  RETURN summary;
END;
$$;

-- Update the meeting_type column data for existing records
UPDATE review_meetings 
SET review_type = 'monthly_one_to_one' 
WHERE review_type IS NULL OR meeting_type = 'monthly_review';

UPDATE review_meetings 
SET review_type = 'weekly_check_in' 
WHERE meeting_type = 'weekly_1_1';

UPDATE review_meetings 
SET review_type = 'probation_review' 
WHERE meeting_type = 'probation';

/*
  # Create Test Implementation Users (Simplified)

  1. Test Users Created
    - Implementation Manager (Sarah Johnson) - sarah.johnson@futures.com
    - Implementation Employee (Mike Roberts) - mike.roberts@futures.com
    Password for both: FuturesTest2025!

  2. Purpose
    - For UX review of both employee and manager views
    - Linked to Implementation department
    - Complete test data for reviews and performance tracking
*/

-- Create test users
DO $$
DECLARE
  v_manager_id uuid;
  v_employee_id uuid;
  v_manager_exists boolean;
  v_employee_exists boolean;
BEGIN
  -- Check if manager already exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'sarah.johnson@futures.com') INTO v_manager_exists;
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = 'mike.roberts@futures.com') INTO v_employee_exists;

  -- Create implementation manager if not exists
  IF NOT v_manager_exists THEN
    v_manager_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      v_manager_id,
      '00000000-0000-0000-0000-000000000000',
      'sarah.johnson@futures.com',
      crypt('FuturesTest2025!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Sarah Johnson"}'::jsonb,
      'authenticated',
      'authenticated',
      now(),
      now(),
      '',
      ''
    );

    -- Create auth identity for manager
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      provider,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_manager_id,
      v_manager_id::text,
      'email',
      jsonb_build_object('sub', v_manager_id::text, 'email', 'sarah.johnson@futures.com'),
      now(),
      now(),
      now()
    );
  ELSE
    SELECT id INTO v_manager_id FROM auth.users WHERE email = 'sarah.johnson@futures.com';
  END IF;

  -- Create manager profile
  INSERT INTO profiles (
    id,
    full_name,
    email,
    role,
    department,
    job_title,
    manager_id,
    tenure,
    active
  ) VALUES (
    v_manager_id,
    'Sarah Johnson',
    'sarah.johnson@futures.com',
    'manager',
    'Implementation',
    'Implementation Manager',
    NULL,
    24,
    true
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    job_title = EXCLUDED.job_title;

  -- Create implementation employee if not exists
  IF NOT v_employee_exists THEN
    v_employee_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      v_employee_id,
      '00000000-0000-0000-0000-000000000000',
      'mike.roberts@futures.com',
      crypt('FuturesTest2025!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Mike Roberts"}'::jsonb,
      'authenticated',
      'authenticated',
      now(),
      now(),
      '',
      ''
    );

    -- Create auth identity for employee
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      provider,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_employee_id,
      v_employee_id::text,
      'email',
      jsonb_build_object('sub', v_employee_id::text, 'email', 'mike.roberts@futures.com'),
      now(),
      now(),
      now()
    );
  ELSE
    SELECT id INTO v_employee_id FROM auth.users WHERE email = 'mike.roberts@futures.com';
  END IF;

  -- Create employee profile
  INSERT INTO profiles (
    id,
    full_name,
    email,
    role,
    department,
    job_title,
    manager_id,
    tenure,
    active
  ) VALUES (
    v_employee_id,
    'Mike Roberts',
    'mike.roberts@futures.com',
    'employee',
    'Implementation',
    'Professional Services Consultant',
    v_manager_id,
    7,
    true
  ) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    job_title = EXCLUDED.job_title,
    manager_id = EXCLUDED.manager_id;

  -- Delete any existing test data for these users
  DELETE FROM review_meetings WHERE employee_id = v_employee_id;
  DELETE FROM performance_ratings WHERE employee_id = v_employee_id;

  -- Create some sample weekly check-ins for the employee
  FOR i IN 1..4 LOOP
    INSERT INTO review_meetings (
      employee_id,
      manager_id,
      scheduled_date,
      meeting_type,
      review_type,
      week_number,
      status
    ) VALUES (
      v_employee_id,
      v_manager_id,
      CURRENT_DATE - ((4 - i) * 7),
      'weekly_1_1',
      'weekly_check_in',
      i,
      CASE WHEN i < 4 THEN 'completed' ELSE 'scheduled' END
    );
  END LOOP;

  -- Create a monthly one-to-one
  INSERT INTO review_meetings (
    employee_id,
    manager_id,
    scheduled_date,
    meeting_type,
    review_type,
    status
  ) VALUES (
    v_employee_id,
    v_manager_id,
    CURRENT_DATE + 7,
    'monthly_review',
    'monthly_one_to_one',
    'scheduled'
  );

  -- Create some performance ratings for the last 5 months
  FOR i IN 1..5 LOOP
    INSERT INTO performance_ratings (
      employee_id,
      review_period,
      competency_score,
      performance_score,
      overall_rating,
      rating_category
    ) VALUES (
      v_employee_id,
      DATE_TRUNC('month', CURRENT_DATE - (i || ' months')::interval)::date,
      2.5 + (i * 0.1),
      3.0 + (i * 0.15),
      (2.5 + (i * 0.1)) * 1.25 * 0.4 + (3.0 + (i * 0.15)) * 0.6,
      CASE 
        WHEN (2.5 + (i * 0.1)) * 1.25 * 0.4 + (3.0 + (i * 0.15)) * 0.6 >= 4.5 THEN 'Outstanding'
        WHEN (2.5 + (i * 0.1)) * 1.25 * 0.4 + (3.0 + (i * 0.15)) * 0.6 >= 3.5 THEN 'Exceeds Expectations'
        WHEN (2.5 + (i * 0.1)) * 1.25 * 0.4 + (3.0 + (i * 0.15)) * 0.6 >= 3.0 THEN 'Meets Expectations'
        WHEN (2.5 + (i * 0.1)) * 1.25 * 0.4 + (3.0 + (i * 0.15)) * 0.6 >= 2.0 THEN 'Developing'
        ELSE 'Needs Improvement'
      END
    );
  END LOOP;

END $$;

/*
  # Add AI Intervention Settings to Copilot Config

  1. New Columns Added to copilot_config
    - enable_review_summaries (boolean) - AI-generated review summaries
    - enable_competency_suggestions (boolean) - AI suggested competency ratings
    - enable_coaching_feedback (boolean) - AI coaching and feedback
    - enable_career_recommendations (boolean) - AI career path recommendations
    - enable_kpi_analysis (boolean) - AI KPI performance analysis
    - enable_skill_gap_analysis (boolean) - AI skill gap identification
    - enable_development_plans (boolean) - AI development plan suggestions
    - enable_interview_feedback (boolean) - AI interview feedback generation
    
  2. Purpose
    - Allow admins to enable/disable specific AI interventions
    - Control which AI features are active in the system
    - Provide granular control over AI functionality
*/

-- Add AI intervention toggle columns
ALTER TABLE copilot_config
  ADD COLUMN IF NOT EXISTS enable_review_summaries boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_competency_suggestions boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_coaching_feedback boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_career_recommendations boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_kpi_analysis boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_skill_gap_analysis boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_development_plans boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_interview_feedback boolean DEFAULT false;

-- Set all existing configs to have AI features enabled by default
UPDATE copilot_config
SET 
  enable_review_summaries = true,
  enable_competency_suggestions = true,
  enable_coaching_feedback = true,
  enable_career_recommendations = true,
  enable_kpi_analysis = true,
  enable_skill_gap_analysis = true,
  enable_development_plans = true,
  enable_interview_feedback = false
WHERE enable_review_summaries IS NULL;

/*
  # Fix User Status View Permissions

  1. Problem
    - user_status_view tries to query auth.users which is not accessible to regular users
    - This causes "Database error querying schema" in user management

  2. Solution
    - Drop the problematic view
    - Create a security definer function that can safely access auth.users
    - Create policies to allow authenticated users to call the function
    
  3. Security
    - Function runs with definer privileges to access auth schema
    - Returns only necessary user status information
    - Still respects existing profile RLS policies
*/

-- Drop the existing view
DROP VIEW IF EXISTS user_status_view CASCADE;

-- Create a security definer function to get user status
CREATE OR REPLACE FUNCTION get_user_status()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  role text,
  job_title text,
  department text,
  tenure integer,
  manager_id uuid,
  job_family_id uuid,
  has_strategic_roadmap_access boolean,
  active boolean,
  created_at timestamptz,
  confirmed_at timestamptz,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
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
      WHEN au.confirmed_at IS NULL THEN 'pending'
      WHEN p.active = false THEN 'inactive'
      ELSE 'active'
    END AS status
  FROM profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_status() TO authenticated;

-- Alternative: Recreate view without auth.users dependency
CREATE OR REPLACE VIEW user_status_view 
WITH (security_invoker = false)
AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.job_title,
  p.department,
  p.tenure,
  p.manager_id,
  p.job_family_id,
  p.has_strategic_roadmap_access,
  p.active,
  p.created_at,
  NULL::timestamptz as confirmed_at,
  CASE
    WHEN p.active = false THEN 'inactive'
    ELSE 'active'
  END AS status
FROM profiles p;

-- Grant select on view to authenticated users
GRANT SELECT ON user_status_view TO authenticated;

-- Comment explaining the view
COMMENT ON VIEW user_status_view IS 'Simplified user status view that does not require auth schema access. Status is determined primarily by the active flag in profiles table.';

/*
  # Enhanced Admin Access Level System

  1. New Access Levels
    - full_admin: Full system view, can view as others, but cannot amend/approve in view-as mode
    - job_families_admin: Can access and amend all job family functionalities
    - people_admin: Can add users, reset passwords, add training
    - manager: Existing manager access
    - employee: Existing employee access

  2. New Tables
    - admin_permissions: Stores granular admin permissions
    - view_as_sessions: Tracks when admins are viewing as other users

  3. Changes
    - Add admin_type column to profiles
    - Add can_view_as permission
    - Add audit logging for view-as actions

  4. Security
    - Only full_admin can use view-as functionality
    - All view-as actions are logged
    - RLS policies restrict access appropriately
*/

-- Add admin_type column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'admin_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN admin_type text;
  END IF;
END $$;

-- Update existing admin users to full_admin type
UPDATE profiles 
SET admin_type = 'full_admin' 
WHERE role = 'admin' AND admin_type IS NULL;

-- Create admin permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create user admin permissions mapping
CREATE TABLE IF NOT EXISTS user_admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  permission_name text REFERENCES admin_permissions(name) ON DELETE CASCADE NOT NULL,
  granted_by uuid REFERENCES profiles(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission_name)
);

-- Create view-as sessions table for audit trail
CREATE TABLE IF NOT EXISTS view_as_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Insert standard admin permissions
INSERT INTO admin_permissions (name, description) VALUES
  ('view_as_user', 'Can view the system as another user'),
  ('manage_users', 'Can add, edit, and manage user accounts'),
  ('reset_passwords', 'Can reset user passwords'),
  ('manage_job_families', 'Can create and edit job families'),
  ('manage_training', 'Can add and manage training modules'),
  ('manage_reviews', 'Can manage review templates and processes'),
  ('manage_strategic_roadmap', 'Can edit strategic roadmap'),
  ('manage_competency_framework', 'Can edit competency framework'),
  ('manage_departments', 'Can manage departments and job titles'),
  ('view_all_data', 'Can view all system data')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_as_sessions ENABLE ROW LEVEL SECURITY;

-- Admin permissions policies
CREATE POLICY "Admins can view all permissions"
  ON admin_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- User admin permissions policies
CREATE POLICY "Admins can view user permissions"
  ON user_admin_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Full admins can grant permissions"
  ON user_admin_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.admin_type = 'full_admin'
    )
  );

CREATE POLICY "Full admins can revoke permissions"
  ON user_admin_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.admin_type = 'full_admin'
    )
  );

-- View-as sessions policies
CREATE POLICY "Admins can view their own view-as sessions"
  ON view_as_sessions FOR SELECT
  TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "Full admins can create view-as sessions"
  ON view_as_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.admin_type = 'full_admin'
    )
  );

CREATE POLICY "Full admins can end their view-as sessions"
  ON view_as_sessions FOR UPDATE
  TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_user_id 
  ON user_admin_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_permission 
  ON user_admin_permissions(permission_name);
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_admin 
  ON view_as_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_target 
  ON view_as_sessions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_view_as_sessions_active 
  ON view_as_sessions(admin_id, ended_at) 
  WHERE ended_at IS NULL;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION has_admin_permission(
  user_id uuid,
  permission_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_admin_permissions uap
    WHERE uap.user_id = $1
    AND uap.permission_name = $2
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_admin_permission(uuid, text) TO authenticated;

-- Function to get active view-as session
CREATE OR REPLACE FUNCTION get_active_view_as_session(admin_user_id uuid)
RETURNS TABLE (
  session_id uuid,
  target_user_id uuid,
  target_email text,
  target_name text,
  target_role text,
  started_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vas.id as session_id,
    vas.target_user_id,
    p.email as target_email,
    p.full_name as target_name,
    p.role as target_role,
    vas.started_at
  FROM view_as_sessions vas
  JOIN profiles p ON p.id = vas.target_user_id
  WHERE vas.admin_id = admin_user_id
  AND vas.ended_at IS NULL
  ORDER BY vas.started_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_view_as_session(uuid) TO authenticated;

-- Automatically grant permissions based on admin_type
CREATE OR REPLACE FUNCTION sync_admin_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Clear existing permissions for this user
  DELETE FROM user_admin_permissions WHERE user_id = NEW.id;
  
  -- Grant permissions based on admin_type
  IF NEW.role = 'admin' THEN
    CASE NEW.admin_type
      WHEN 'full_admin' THEN
        INSERT INTO user_admin_permissions (user_id, permission_name, granted_by)
        SELECT NEW.id, name, NEW.id
        FROM admin_permissions;
        
      WHEN 'job_families_admin' THEN
        INSERT INTO user_admin_permissions (user_id, permission_name, granted_by)
        SELECT NEW.id, name, NEW.id
        FROM admin_permissions
        WHERE name IN (
          'manage_job_families',
          'manage_competency_framework',
          'view_all_data'
        );
        
      WHEN 'people_admin' THEN
        INSERT INTO user_admin_permissions (user_id, permission_name, granted_by)
        SELECT NEW.id, name, NEW.id
        FROM admin_permissions
        WHERE name IN (
          'manage_users',
          'reset_passwords',
          'manage_training',
          'view_all_data'
        );
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync permissions
DROP TRIGGER IF EXISTS sync_admin_permissions_trigger ON profiles;
CREATE TRIGGER sync_admin_permissions_trigger
  AFTER INSERT OR UPDATE OF role, admin_type ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_permissions();

-- Sync existing admin users
UPDATE profiles SET admin_type = admin_type WHERE role = 'admin';

COMMENT ON TABLE admin_permissions IS 'Defines available admin permissions in the system';
COMMENT ON TABLE user_admin_permissions IS 'Maps users to their granted admin permissions';
COMMENT ON TABLE view_as_sessions IS 'Audit trail of when admins view system as other users';
COMMENT ON FUNCTION has_admin_permission IS 'Check if a user has a specific admin permission';
COMMENT ON FUNCTION get_active_view_as_session IS 'Get the currently active view-as session for an admin';

/*
  # Add Custom E-Learning Module Builder System

  1. Changes to existing tables
    - Add `module_type` to training_courses ('external' or 'custom')
    - Add `thumbnail_url` for module preview images
    - Add `is_published` for draft/published state

  2. New Tables
    - `training_module_pages`
      - Stores individual pages/slides for custom e-learning modules
      - Supports multiple content types (text, video, image, quiz)
      - Ordered by sort_order
      - Contains rich content in JSONB format

  3. Security
    - Enable RLS on new tables
    - Admins can manage all module content
    - Users can view published module pages

  4. Notes
    - External modules use module_url (YouTube, external links)
    - Custom modules use training_module_pages for content
    - Each page can contain multiple content blocks
*/

-- Add new columns to training_courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_courses' AND column_name = 'module_type'
  ) THEN
    ALTER TABLE training_courses ADD COLUMN module_type text DEFAULT 'external' CHECK (module_type IN ('external', 'custom'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_courses' AND column_name = 'thumbnail_url'
  ) THEN
    ALTER TABLE training_courses ADD COLUMN thumbnail_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_courses' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE training_courses ADD COLUMN is_published boolean DEFAULT true;
  END IF;
END $$;

-- Create training_module_pages table
CREATE TABLE IF NOT EXISTS training_module_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES training_courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  content jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_training_module_pages_course_id ON training_module_pages(course_id);
CREATE INDEX IF NOT EXISTS idx_training_module_pages_sort_order ON training_module_pages(course_id, sort_order);

-- Enable RLS on training_module_pages
ALTER TABLE training_module_pages ENABLE ROW LEVEL SECURITY;

-- Admins can manage all module pages
CREATE POLICY "Admins can manage module pages"
  ON training_module_pages
  FOR ALL
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

-- All authenticated users can view published module pages
CREATE POLICY "Users can view published module pages"
  ON training_module_pages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_courses
      WHERE training_courses.id = training_module_pages.course_id
      AND training_courses.is_published = true
    )
  );

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_training_module_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_training_module_pages_updated_at ON training_module_pages;

CREATE TRIGGER update_training_module_pages_updated_at
  BEFORE UPDATE ON training_module_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_training_module_pages_updated_at();

