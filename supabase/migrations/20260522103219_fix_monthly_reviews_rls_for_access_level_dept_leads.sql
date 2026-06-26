/*
  # Fix one_to_one_monthly_reviews RLS for access-level dept leads

  ## Problem
  The existing dept lead SELECT policy on one_to_one_monthly_reviews checks
  `profiles.role = 'dept_lead'`, but users like Olivia Collingbourne have
  `profiles.role = 'manager'` and are granted dept lead access via the
  user_access_levels / access_level_types permission system
  (dashboard_dept_lead: true).

  When DeptLeadModerationPanel fetches values_ratings from this table,
  RLS silently returns empty results for these access-level dept leads,
  causing the per-competency moderation view to show no competencies.

  ## Fix
  Add a new SELECT policy that mirrors the existing moderation_cases pattern:
  allow SELECT when the user has dashboard_dept_lead permission AND the review
  employee is in the same department as the viewer.

  This policy is additive — it does not remove or alter any existing policies.
*/

CREATE POLICY "Access-level dept leads can view monthly reviews in own department"
  ON one_to_one_monthly_reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_access_levels ual
      JOIN access_level_types alt ON alt.id = ual.access_level_id
      JOIN profiles viewer ON viewer.id = ual.user_id
      WHERE ual.user_id = (SELECT auth.uid())
        AND ((alt.permissions ->> 'dashboard_dept_lead')::boolean = true)
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = one_to_one_monthly_reviews.employee_id
            AND emp.department = viewer.department
        )
    )
  );
