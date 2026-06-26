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
