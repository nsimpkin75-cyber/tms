DROP POLICY IF EXISTS "Managers can insert cycle members" ON review_cycle_members;

CREATE POLICY "Authenticated users can insert cycle members"
  ON review_cycle_members FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view cycle members" ON review_cycle_members;

CREATE POLICY "Users can view cycle members"
  ON review_cycle_members FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = cycle_id 
      AND rc.manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can update cycle members" ON review_cycle_members;
DROP POLICY IF EXISTS "Managers can delete cycle members" ON review_cycle_members;

CREATE POLICY "Managers can update cycle members"
  ON review_cycle_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = cycle_id 
      AND rc.manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can delete cycle members"
  ON review_cycle_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles rc
      WHERE rc.id = cycle_id 
      AND rc.manager_id = auth.uid()
    )
  );