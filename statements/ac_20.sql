DROP POLICY IF EXISTS "Users can view their cycles" ON review_cycles;

CREATE POLICY "Users can view their cycles"
  ON review_cycles FOR SELECT
  TO authenticated
  USING (
    manager_id = auth.uid()
    OR 
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('leadership', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM review_cycle_members
      WHERE cycle_id = review_cycles.id AND employee_id = auth.uid()
    )
  );