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
