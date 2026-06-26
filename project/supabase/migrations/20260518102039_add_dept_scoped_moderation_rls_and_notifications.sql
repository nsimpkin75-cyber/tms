/*
  # Department-scoped moderation access and notification support

  1. Changes to moderation_cases RLS
     - Drop the broad dept_lead SELECT policy that allows all dept_leads to see all cases
     - Replace with a dept-scoped policy: dept_lead can only see cases where the employee
       belongs to the same department as the dept_lead

  2. Changes to moderation_case_decisions RLS
     - Ensure dept_lead insert is scoped to cases they can see

  3. review_notifications
     - Add notification_type values used by moderation (no constraint change needed
       as the column is plain text with no CHECK constraint)

  4. Notes
     - `leadership` and `admin` roles retain unrestricted access
     - The dept_lead department matching is done via a sub-select on profiles
*/

-- =============================================
-- Moderation cases: tighten dept_lead SELECT
-- =============================================

DROP POLICY IF EXISTS "View own and approver moderation cases" ON moderation_cases;

-- Managers and employees see their own cases; leadership/admin see all;
-- dept_lead sees only cases where the employee is in their own department
CREATE POLICY "View own and approver moderation cases"
  ON moderation_cases FOR SELECT
  TO authenticated
  USING (
    manager_id = (SELECT auth.uid())
    OR employee_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role IN ('admin'::user_role, 'leadership'::user_role, 'senior'::user_role)
    )
    OR (
      EXISTS (
        SELECT 1 FROM profiles viewer
        WHERE viewer.id = (SELECT auth.uid())
          AND viewer.role = 'dept_lead'::user_role
          AND EXISTS (
            SELECT 1 FROM profiles emp
            WHERE emp.id = moderation_cases.employee_id
              AND emp.department = viewer.department
          )
      )
    )
  );

-- =============================================
-- Moderation case decisions: tighten dept_lead INSERT
-- Allow inserters who can see the parent case
-- =============================================

DROP POLICY IF EXISTS "Approvers insert decisions" ON moderation_case_decisions;

CREATE POLICY "Approvers insert decisions"
  ON moderation_case_decisions FOR INSERT
  TO authenticated
  WITH CHECK (
    decided_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM moderation_cases mc
      WHERE mc.id = moderation_case_decisions.case_id
        AND (
          mc.manager_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = (SELECT auth.uid())
              AND profiles.role IN ('admin'::user_role, 'leadership'::user_role, 'senior'::user_role)
          )
          OR (
            EXISTS (
              SELECT 1 FROM profiles viewer
              WHERE viewer.id = (SELECT auth.uid())
                AND viewer.role = 'dept_lead'::user_role
                AND EXISTS (
                  SELECT 1 FROM profiles emp
                  WHERE emp.id = mc.employee_id
                    AND emp.department = viewer.department
                )
            )
          )
        )
    )
  );
