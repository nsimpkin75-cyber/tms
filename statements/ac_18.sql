DROP POLICY IF EXISTS "Users can view their cycles" ON review_cycles;
DROP POLICY IF EXISTS "Managers can manage cycle members" ON review_cycle_members;

CREATE POLICY "Users can view their cycles"
  ON review_cycles FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR id IN (
      SELECT cycle_id FROM review_cycle_members
      WHERE employee_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
  );

CREATE POLICY "Managers can insert cycle members"
  ON review_cycle_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can update cycle members"
  ON review_cycle_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Managers can delete cycle members"
  ON review_cycle_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_cycles
      WHERE id = cycle_id AND manager_id = auth.uid()
    )
  );