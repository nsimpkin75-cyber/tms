/*
  # Fix RLS Auth Performance Issues - Part 13 (Security Fix)

  1. Performance Improvements
    - Wrap auth.uid() calls in SELECT to prevent re-evaluation per row
    - Fixes policies on: copilot_config, job_history (3), progression_criteria, ai_quiz_preferences (3)

  2. Security
    - Maintains exact same security constraints
    - Only changes performance characteristics, not access control
*/

-- copilot_config table
DROP POLICY IF EXISTS "Admins can manage copilot config" ON copilot_config;
CREATE POLICY "Admins can manage copilot config"
  ON copilot_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- job_history table (3 policies)
DROP POLICY IF EXISTS "Admins can manage job history" ON job_history;
CREATE POLICY "Admins can manage job history"
  ON job_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can view team job history" ON job_history;
CREATE POLICY "Managers can view team job history"
  ON job_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = job_history.profile_id
      AND p.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own job history" ON job_history;
CREATE POLICY "Users can view own job history"
  ON job_history
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- progression_criteria table
DROP POLICY IF EXISTS "Admins can manage progression criteria" ON progression_criteria;
CREATE POLICY "Admins can manage progression criteria"
  ON progression_criteria
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

-- ai_quiz_preferences table (3 policies)
DROP POLICY IF EXISTS "Admins can view all quiz preferences" ON ai_quiz_preferences;
CREATE POLICY "Admins can view all quiz preferences"
  ON ai_quiz_preferences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (SELECT auth.uid()) 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can manage own quiz preferences" ON ai_quiz_preferences;
CREATE POLICY "Users can manage own quiz preferences"
  ON ai_quiz_preferences
  FOR ALL
  TO authenticated
  USING (profile_id = (SELECT auth.uid()))
  WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own quiz preferences" ON ai_quiz_preferences;
CREATE POLICY "Users can view own quiz preferences"
  ON ai_quiz_preferences
  FOR SELECT
  TO authenticated
  USING (profile_id = (SELECT auth.uid()));