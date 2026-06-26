DROP POLICY IF EXISTS "System can insert job history" ON job_history;
DROP POLICY IF EXISTS "System can manage permissions" ON user_admin_permissions;

CREATE POLICY "Allow job history inserts"
  ON job_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow admin permissions delete"
  ON user_admin_permissions FOR DELETE
  TO authenticated
  USING (
    is_admin() OR 
    user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Full admins can grant permissions" ON user_admin_permissions;
CREATE POLICY "Allow admin permissions insert"
  ON user_admin_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin() OR 
    user_id = (select auth.uid())
  );