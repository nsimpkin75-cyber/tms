/*
  # Fix RLS Auth Performance Issues - Part 1 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Significantly improves query performance at scale
    - Fixes policies on: skills, profile_skills, reviews (4 policies), review_items (2 policies)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- skills table
DROP POLICY IF EXISTS "L&D and admins can manage skills" ON skills;
CREATE POLICY "L&D and admins can manage skills"
  ON skills
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND (role = 'admin' OR role = 'leadership')
    )
  );

-- profile_skills table
DROP POLICY IF EXISTS "Users can manage own profile skills" ON profile_skills;
CREATE POLICY "Users can manage own profile skills"
  ON profile_skills
  FOR ALL
  TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

-- reviews table (4 policies)
DROP POLICY IF EXISTS "Managers can create reviews" ON reviews;
CREATE POLICY "Managers can create reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    manager_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('manager', 'leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can update own reviews" ON reviews;
CREATE POLICY "Managers can update own reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team reviews" ON reviews;
CREATE POLICY "Managers can view team reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own reviews" ON reviews;
CREATE POLICY "Users can view own reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (employee_id = (SELECT auth.uid()));

-- review_items table (2 policies)
DROP POLICY IF EXISTS "Managers can manage review items" ON review_items;
CREATE POLICY "Managers can manage review items"
  ON review_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_items.review_id
      AND r.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view review items for accessible reviews" ON review_items;
CREATE POLICY "Users can view review items for accessible reviews"
  ON review_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_items.review_id
      AND (r.employee_id = (SELECT auth.uid()) OR r.manager_id = (SELECT auth.uid()))
    )
  );