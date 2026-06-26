DROP POLICY IF EXISTS "Allow job history inserts" ON job_history;
CREATE POLICY "Allow job history inserts"
  ON job_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    changed_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND admin_type IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert cycle actions" ON review_cycle_actions;
CREATE POLICY "Authenticated users can insert cycle actions"
  ON review_cycle_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_actions.cycle_id
      AND rc.manager_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert cycle KPIs" ON review_cycle_kpis;
CREATE POLICY "Authenticated users can insert cycle KPIs"
  ON review_cycle_kpis
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_kpis.cycle_id
      AND rc.manager_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can insert cycle members" ON review_cycle_members;
CREATE POLICY "Authenticated users can insert cycle members"
  ON review_cycle_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = review_cycle_members.cycle_id
      AND rc.manager_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "System can create notifications" ON strategy_notifications;
CREATE POLICY "System can create notifications"
  ON strategy_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND admin_type IS NOT NULL
    )
    OR EXISTS (
      SELECT 1 FROM strategies s
      WHERE s.id = strategy_notifications.strategy_id
      AND s.creator_id = (select auth.uid())
    )
  );