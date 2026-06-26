/*
  # Add admin delete policy for one_to_one_monthly_reviews

  Adds a DELETE RLS policy on one_to_one_monthly_reviews restricted to full admins only.
  This allows admins to remove individual completed reviews created in error without
  affecting other data in the system.
*/

CREATE POLICY "Full admins can delete monthly reviews"
  ON one_to_one_monthly_reviews FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
        AND profiles.admin_type = 'full_admin'
    )
  );
