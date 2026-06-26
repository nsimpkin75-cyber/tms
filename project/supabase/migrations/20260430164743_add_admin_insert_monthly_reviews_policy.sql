/*
  # Add admin insert policy for one_to_one_monthly_reviews

  Allows admins to insert monthly reviews for backfill purposes.
  Existing select/update/delete policies for managers and employees are unchanged.
*/

CREATE POLICY "Admin can insert monthly reviews"
  ON one_to_one_monthly_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );
