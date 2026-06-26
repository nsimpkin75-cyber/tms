/*
  # Fix Auth RLS Initialization - Part 3

  1. Changes
    - Fix skill_development_actions and skill_assessment_discrepancies policies
    
  2. Security
    - Maintains same security posture with better performance
*/

-- Fix skill_development_actions policies
DROP POLICY IF EXISTS "Users can view their own skill actions" ON skill_development_actions;
DROP POLICY IF EXISTS "Managers can create skill actions" ON skill_development_actions;
DROP POLICY IF EXISTS "Managers and employees can update skill actions" ON skill_development_actions;

CREATE POLICY "Users can view their own skill actions"
  ON skill_development_actions FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'manager')) IS NOT NULL
  );

CREATE POLICY "Managers can create skill actions"
  ON skill_development_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'manager')) IS NOT NULL
  );

CREATE POLICY "Managers and employees can update skill actions"
  ON skill_development_actions FOR UPDATE
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'manager')) IS NOT NULL
  );

-- Fix skill_assessment_discrepancies policies
DROP POLICY IF EXISTS "Users can view their own skill discrepancies" ON skill_assessment_discrepancies;
DROP POLICY IF EXISTS "Managers can create skill discrepancies" ON skill_assessment_discrepancies;
DROP POLICY IF EXISTS "Managers can update skill discrepancies" ON skill_assessment_discrepancies;

CREATE POLICY "Users can view their own skill discrepancies"
  ON skill_assessment_discrepancies FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'manager')) IS NOT NULL
  );

CREATE POLICY "Managers can create skill discrepancies"
  ON skill_assessment_discrepancies FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'manager')) IS NOT NULL
  );

CREATE POLICY "Managers can update skill discrepancies"
  ON skill_assessment_discrepancies FOR UPDATE
  TO authenticated
  USING (
    (SELECT id FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('admin', 'manager')) IS NOT NULL
  );