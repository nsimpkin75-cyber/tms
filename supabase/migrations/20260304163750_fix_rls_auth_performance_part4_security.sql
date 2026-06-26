/*
  # Fix RLS Auth Performance Issues - Part 4 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: review_form_templates, review_template_sections, organisation_settings (2), review_template_questions

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- review_form_templates table
DROP POLICY IF EXISTS "Admins can manage templates" ON review_form_templates;
CREATE POLICY "Admins can manage templates"
  ON review_form_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- review_template_sections table
DROP POLICY IF EXISTS "Admins can manage sections" ON review_template_sections;
CREATE POLICY "Admins can manage sections"
  ON review_template_sections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- organisation_settings table (2 policies)
DROP POLICY IF EXISTS "Admins can insert organisation settings" ON organisation_settings;
CREATE POLICY "Admins can insert organisation settings"
  ON organisation_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update organisation settings" ON organisation_settings;
CREATE POLICY "Admins can update organisation settings"
  ON organisation_settings
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

-- review_template_questions table
DROP POLICY IF EXISTS "Admins can manage questions" ON review_template_questions;
CREATE POLICY "Admins can manage questions"
  ON review_template_questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );