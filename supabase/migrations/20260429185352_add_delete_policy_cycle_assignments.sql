/*
  # Add DELETE policy for one_to_one_cycle_employee_assignments

  ## Problem
  Full admins cannot delete review cycles because the cascade delete on
  one_to_one_cycle_employee_assignments is blocked by RLS — there is no
  DELETE policy on that table.

  ## Changes
  - Adds DELETE policy allowing managers to delete their own cycle assignments
    and admins to delete any assignment
*/

CREATE POLICY "Managers and admins can delete cycle assignments"
  ON one_to_one_cycle_employee_assignments
  FOR DELETE
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );
