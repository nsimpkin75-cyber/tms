DROP POLICY IF EXISTS "Admin can view all quiz sessions" ON career_quiz_sessions;
CREATE POLICY "Admin can view all quiz sessions"
  ON career_quiz_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can view team quiz sessions" ON career_quiz_sessions;
CREATE POLICY "Managers can view team quiz sessions"
  ON career_quiz_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create own quiz sessions" ON career_quiz_sessions;
CREATE POLICY "Users can create own quiz sessions"
  ON career_quiz_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own quiz sessions" ON career_quiz_sessions;
CREATE POLICY "Users can update own quiz sessions"
  ON career_quiz_sessions FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own quiz sessions" ON career_quiz_sessions;
CREATE POLICY "Users can view own quiz sessions"
  ON career_quiz_sessions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team qualifications" ON career_external_qualifications;
CREATE POLICY "Managers can view team qualifications"
  ON career_external_qualifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own qualifications" ON career_external_qualifications;
CREATE POLICY "Users can manage own qualifications"
  ON career_external_qualifications FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can view team skill ratings" ON career_skill_self_ratings;
CREATE POLICY "Managers can view team skill ratings"
  ON career_skill_self_ratings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own skill ratings" ON career_skill_self_ratings;
CREATE POLICY "Users can manage own skill ratings"
  ON career_skill_self_ratings FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admin can view all profiles" ON career_profiles;
CREATE POLICY "Admin can view all profiles"
  ON career_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can view team profiles" ON career_profiles;
CREATE POLICY "Managers can view team profiles"
  ON career_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = user_id
      AND profiles.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage own profile" ON career_profiles;
CREATE POLICY "Users can manage own profile"
  ON career_profiles FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admin can view all coaching logs" ON marti_career_coaching_logs;
CREATE POLICY "Admin can view all coaching logs"
  ON marti_career_coaching_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can create own coaching logs" ON marti_career_coaching_logs;
CREATE POLICY "Users can create own coaching logs"
  ON marti_career_coaching_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own coaching logs" ON marti_career_coaching_logs;
CREATE POLICY "Users can view own coaching logs"
  ON marti_career_coaching_logs FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can manage reminder config" ON one_to_one_reminder_config;
CREATE POLICY "Admins can manage reminder config"
  ON one_to_one_reminder_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage AI coaching config" ON one_to_one_ai_coaching_config;
CREATE POLICY "Admins can manage AI coaching config"
  ON one_to_one_ai_coaching_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );