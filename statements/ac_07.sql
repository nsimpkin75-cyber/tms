DROP POLICY IF EXISTS "System can insert half year summaries" ON half_year_review_summaries;
CREATE POLICY "Managers can insert half year summaries"
  ON half_year_review_summaries FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings rm
      WHERE rm.id = meeting_id
      AND rm.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "System can insert ratings" ON performance_ratings;
CREATE POLICY "Managers can insert ratings"
  ON performance_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings rm
      WHERE rm.id = review_meeting_id
      AND rm.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "System can update ratings" ON performance_ratings;
CREATE POLICY "Managers can update ratings"
  ON performance_ratings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_meetings rm
      WHERE rm.id = review_meeting_id
      AND rm.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_meetings rm
      WHERE rm.id = review_meeting_id
      AND rm.manager_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "System can create notifications" ON review_notifications;
CREATE POLICY "Authenticated users can create notifications"
  ON review_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (select auth.uid())
      AND (
        p.role IN ('manager', 'leadership', 'admin')
        OR p.id = sender_id
      )
    )
  );