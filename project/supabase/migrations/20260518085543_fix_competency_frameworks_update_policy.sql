/*
  # Fix competency_frameworks RLS update policy
  
  The existing "Admins can manage frameworks" policy uses FOR ALL with no WITH CHECK,
  which causes UPDATE operations to fail. Replace it with explicit per-operation policies
  that include proper WITH CHECK clauses.
*/

DROP POLICY IF EXISTS "Admins can manage frameworks" ON competency_frameworks;

CREATE POLICY "Admins can select competency frameworks"
  ON competency_frameworks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert competency frameworks"
  ON competency_frameworks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update competency frameworks"
  ON competency_frameworks FOR UPDATE
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

CREATE POLICY "Admins can delete competency frameworks"
  ON competency_frameworks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated can view competency frameworks" ON competency_frameworks;
