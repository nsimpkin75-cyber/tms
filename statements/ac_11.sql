DROP POLICY IF EXISTS "System can insert job history" ON job_history;
CREATE POLICY "System can insert job history"
  ON job_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can manage permissions" ON user_admin_permissions;
CREATE POLICY "System can manage permissions"
  ON user_admin_permissions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);