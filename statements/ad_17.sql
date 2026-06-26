DROP POLICY IF EXISTS "Managers and employees can view their checkins" ON one_to_one_weekly_checkins;
CREATE POLICY "Managers and employees can view their checkins"
  ON one_to_one_weekly_checkins FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings m
      WHERE m.id = one_to_one_weekly_checkins.meeting_id
      AND m.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can manage their team checkins" ON one_to_one_weekly_checkins;
CREATE POLICY "Managers can manage their team checkins"
  ON one_to_one_weekly_checkins FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings m
      WHERE m.id = one_to_one_weekly_checkins.meeting_id
      AND m.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings m
      WHERE m.id = one_to_one_weekly_checkins.meeting_id
      AND m.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers and employees can view their meetings" ON one_to_one_scheduled_meetings;
CREATE POLICY "Managers and employees can view their meetings"
  ON one_to_one_scheduled_meetings FOR SELECT
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid()) OR 
    employee_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Managers can manage their meetings" ON one_to_one_scheduled_meetings;
CREATE POLICY "Managers can manage their meetings"
  ON one_to_one_scheduled_meetings FOR ALL
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Managers can update their meetings" ON one_to_one_scheduled_meetings;
CREATE POLICY "Managers can update their meetings"
  ON one_to_one_scheduled_meetings FOR UPDATE
  TO authenticated
  USING (manager_id = (SELECT auth.uid()))
  WITH CHECK (manager_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can manage module pages" ON training_module_pages;
CREATE POLICY "Admins can manage module pages"
  ON training_module_pages FOR ALL
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

DROP POLICY IF EXISTS "Managers and employees can view their monthly reviews" ON one_to_one_monthly_reviews;
CREATE POLICY "Managers and employees can view their monthly reviews"
  ON one_to_one_monthly_reviews FOR SELECT
  TO authenticated
  USING (
    employee_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings m
      WHERE m.id = one_to_one_monthly_reviews.meeting_id
      AND m.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Managers can manage their team monthly reviews" ON one_to_one_monthly_reviews;
CREATE POLICY "Managers can manage their team monthly reviews"
  ON one_to_one_monthly_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings m
      WHERE m.id = one_to_one_monthly_reviews.meeting_id
      AND m.manager_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM one_to_one_scheduled_meetings m
      WHERE m.id = one_to_one_monthly_reviews.meeting_id
      AND m.manager_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Senior managers can view for moderation" ON one_to_one_monthly_reviews;
CREATE POLICY "Senior managers can view for moderation"
  ON one_to_one_monthly_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "Admins and leadership can create strategies" ON strategies;
CREATE POLICY "Admins and leadership can create strategies"
  ON strategies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "Admins and leadership can view all strategies" ON strategies;
CREATE POLICY "Admins and leadership can view all strategies"
  ON strategies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "Strategy creators and admins can update strategies" ON strategies;
CREATE POLICY "Strategy creators and admins can update strategies"
  ON strategies FOR UPDATE
  TO authenticated
  USING (
    creator_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  )
  WITH CHECK (
    creator_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'leadership')
    )
  );

DROP POLICY IF EXISTS "Strategy creators can view own strategies" ON strategies;
CREATE POLICY "Strategy creators can view own strategies"
  ON strategies FOR SELECT
  TO authenticated
  USING (creator_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users with access can view active strategies" ON strategies;
CREATE POLICY "Users with access can view active strategies"
  ON strategies FOR SELECT
  TO authenticated
  USING (
    status = 'active' AND
    (
      department IS NULL OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (SELECT auth.uid())
        AND (
          profiles.department = strategies.department OR
          profiles.role IN ('admin', 'leadership')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Admins and creators can manage focus areas" ON strategy_focus_areas;
CREATE POLICY "Admins and creators can manage focus areas"
  ON strategy_focus_areas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM strategies s
      WHERE s.id = strategy_focus_areas.strategy_id
      AND (
        s.creator_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role IN ('admin', 'leadership')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM strategies s
      WHERE s.id = strategy_focus_areas.strategy_id
      AND (
        s.creator_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role IN ('admin', 'leadership')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Admins and leads can manage milestones" ON strategy_milestones;
CREATE POLICY "Admins and leads can manage milestones"
  ON strategy_milestones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM strategy_focus_areas sfa
      JOIN strategies s ON s.id = sfa.strategy_id
      WHERE sfa.id = strategy_milestones.focus_area_id
      AND (
        s.creator_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role IN ('admin', 'leadership')
        ) OR
        EXISTS (
          SELECT 1 FROM strategy_leads sl
          WHERE sl.focus_area_id = sfa.id
          AND sl.user_id = (SELECT auth.uid())
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM strategy_focus_areas sfa
      JOIN strategies s ON s.id = sfa.strategy_id
      WHERE sfa.id = strategy_milestones.focus_area_id
      AND (
        s.creator_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role IN ('admin', 'leadership')
        ) OR
        EXISTS (
          SELECT 1 FROM strategy_leads sl
          WHERE sl.focus_area_id = sfa.id
          AND sl.user_id = (SELECT auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS "Admins and creators can assign leads" ON strategy_leads;
CREATE POLICY "Admins and creators can assign leads"
  ON strategy_leads FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM strategy_focus_areas sfa
      JOIN strategies s ON s.id = sfa.strategy_id
      WHERE sfa.id = strategy_leads.focus_area_id
      AND (
        s.creator_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role IN ('admin', 'leadership')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM strategy_focus_areas sfa
      JOIN strategies s ON s.id = sfa.strategy_id
      WHERE sfa.id = strategy_leads.focus_area_id
      AND (
        s.creator_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = (SELECT auth.uid())
          AND profiles.role IN ('admin', 'leadership')
        )
      )
    )
  );