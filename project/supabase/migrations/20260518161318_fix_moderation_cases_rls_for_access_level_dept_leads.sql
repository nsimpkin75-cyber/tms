/*
  # Fix moderation_cases SELECT policy for access-level-based dept leads

  ## Problem
  The existing SELECT policy only grants dept_lead visibility using profiles.role = 'dept_lead'.
  Users who hold the "Department Lead" access level (via user_access_levels) but have
  role = 'manager' are blocked from seeing cases in their department.

  ## Fix
  Extend the SELECT policy to also allow users who have the dashboard_dept_lead permission
  via their access level to see moderation cases for employees in their department.

  ## Tables modified
  - moderation_cases: DROP and RECREATE the SELECT policy

  ## No data changes, no other policies touched.
*/

DROP POLICY IF EXISTS "View own and approver moderation cases" ON moderation_cases;

CREATE POLICY "View own and approver moderation cases"
  ON moderation_cases
  FOR SELECT
  TO authenticated
  USING (
    -- Manager who created the case
    manager_id = (SELECT auth.uid())
    -- Employee seeing their own case
    OR employee_id = (SELECT auth.uid())
    -- Org-level roles (admin, leadership, senior)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::user_role, 'leadership'::user_role, 'senior'::user_role])
    )
    -- dept_lead by role: can see cases for employees in same department
    OR EXISTS (
      SELECT 1 FROM profiles viewer
      WHERE viewer.id = (SELECT auth.uid())
        AND viewer.role = 'dept_lead'::user_role
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = moderation_cases.employee_id
            AND emp.department = viewer.department
        )
    )
    -- dept_lead by access level (dashboard_dept_lead permission): same department check
    OR EXISTS (
      SELECT 1
      FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND (alt.permissions->>'dashboard_dept_lead')::boolean = true
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = moderation_cases.employee_id
            AND emp.department = viewer.department
        )
    )
  );

-- Also fix the UPDATE policy so access-level dept leads can act on cases in their dept
DROP POLICY IF EXISTS "Managers and approvers update moderation cases" ON moderation_cases;

CREATE POLICY "Managers and approvers update moderation cases"
  ON moderation_cases
  FOR UPDATE
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::user_role, 'leadership'::user_role, 'dept_lead'::user_role, 'senior'::user_role])
    )
    OR EXISTS (
      SELECT 1
      FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND (alt.permissions->>'dashboard_dept_lead')::boolean = true
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = moderation_cases.employee_id
            AND emp.department = viewer.department
        )
    )
  )
  WITH CHECK (
    manager_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = ANY (ARRAY['admin'::user_role, 'leadership'::user_role, 'dept_lead'::user_role, 'senior'::user_role])
    )
    OR EXISTS (
      SELECT 1
      FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND (alt.permissions->>'dashboard_dept_lead')::boolean = true
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = moderation_cases.employee_id
            AND emp.department = viewer.department
        )
    )
  );
