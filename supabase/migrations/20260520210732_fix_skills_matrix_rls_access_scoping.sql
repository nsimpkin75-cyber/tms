/*
  # Fix Skills Matrix RLS — Access Scoping

  ## Summary
  Tightens RLS on all skills matrix tables so each role can only access
  data within their permitted scope, following the organisational hierarchy:

    Employee  → own data only
    Manager   → own data + direct reports only (manager_id = auth.uid())
    Dept Lead → their assigned department(s) only
    Exec      → view-only, business-wide (leadership role, no admin_type)
    Full Admin → full access

  ## Changes

  ### sm_assessments
  - DROP the broad "Managers can view team assessments" policy that let any
    manager-role user see ALL assessments across the organisation.
  - ADD scoped replacement: managers see only their direct reports' assessments.
  - ADD dept-lead/exec view: leadership role can view assessments for employees
    in the same department OR org-wide if full_admin.

  ### sm_assessment_items
  - DROP the broad "Managers can view team assessment items" policy.
  - ADD scoped replacement mirroring sm_assessments logic.

  ### sm_mismatches
  - DROP the broad leadership SELECT policy that exposed all mismatches.
  - ADD dept-scoped view for dept_lead/leadership (same department only).
  - Admin/full_admin retain unrestricted view.

  ### sm_escalations
  - DROP the broad leadership SELECT policy.
  - ADD dept-scoped view for dept_lead/leadership.
  - Admin/full_admin retain unrestricted view.

  ## Security
  All policies remain restrictive. The "true" SELECT on lookup tables
  (sm_types, sm_categories, sm_topics, sm_matrices, sm_matrix_roles,
  sm_role_topics, sm_assessment_cycles) is intentional — these are read-only
  configuration tables with no personal data.
*/

-- ─── sm_assessments ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Managers can view team assessments" ON sm_assessments;

-- Managers see only their direct reports' assessments
CREATE POLICY "Managers can view direct reports assessments"
  ON sm_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'manager'::user_role
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = sm_assessments.employee_id
            AND emp.manager_id = auth.uid()
        )
    )
  );

-- Dept leads (leadership role without full admin) see their department's assessments
CREATE POLICY "Dept leads can view department assessments"
  ON sm_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('leadership'::user_role, 'dept_lead'::user_role)
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = sm_assessments.employee_id
            AND emp.department = p.department
        )
    )
  );

-- Full admins see all assessments (covers exec/full_admin with admin_type set)
CREATE POLICY "Full admins can view all assessments"
  ON sm_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin'::user_role OR p.admin_type IS NOT NULL)
    )
  );

-- ─── sm_assessment_items ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Managers can view team assessment items" ON sm_assessment_items;

-- Managers see items for their direct reports only
CREATE POLICY "Managers can view direct reports assessment items"
  ON sm_assessment_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'manager'::user_role
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM sm_assessments a
          JOIN profiles emp ON emp.id = a.employee_id
          WHERE a.id = sm_assessment_items.assessment_id
            AND emp.manager_id = auth.uid()
        )
    )
  );

-- Dept leads see items for employees in their department
CREATE POLICY "Dept leads can view department assessment items"
  ON sm_assessment_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('leadership'::user_role, 'dept_lead'::user_role)
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM sm_assessments a
          JOIN profiles emp ON emp.id = a.employee_id
          WHERE a.id = sm_assessment_items.assessment_id
            AND emp.department = p.department
        )
    )
  );

-- Full admins see all items
CREATE POLICY "Full admins can view all assessment items"
  ON sm_assessment_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin'::user_role OR p.admin_type IS NOT NULL)
    )
  );

-- ─── sm_mismatches ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Managers and admins can view mismatches" ON sm_mismatches;

-- Employees see only their own mismatches
CREATE POLICY "Employees can view own mismatches"
  ON sm_mismatches FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Managers see mismatches for direct reports only
CREATE POLICY "Managers can view direct reports mismatches"
  ON sm_mismatches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'manager'::user_role
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = sm_mismatches.employee_id
            AND emp.manager_id = auth.uid()
        )
    )
  );

-- Dept leads see mismatches for their department only
CREATE POLICY "Dept leads can view department mismatches"
  ON sm_mismatches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('leadership'::user_role, 'dept_lead'::user_role)
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = sm_mismatches.employee_id
            AND emp.department = p.department
        )
    )
  );

-- Full admins / exec with admin_type see all mismatches
CREATE POLICY "Full admins can view all mismatches"
  ON sm_mismatches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin'::user_role OR p.admin_type IS NOT NULL)
    )
  );

-- ─── sm_escalations ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Managers and admins can view escalations" ON sm_escalations;

-- Managers see escalations for direct reports only
CREATE POLICY "Managers can view direct reports escalations"
  ON sm_escalations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'manager'::user_role
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = sm_escalations.employee_id
            AND emp.manager_id = auth.uid()
        )
    )
  );

-- Dept leads see escalations for their department only
CREATE POLICY "Dept leads can view department escalations"
  ON sm_escalations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('leadership'::user_role, 'dept_lead'::user_role)
        AND p.admin_type IS NULL
        AND EXISTS (
          SELECT 1 FROM profiles emp
          WHERE emp.id = sm_escalations.employee_id
            AND emp.department = p.department
        )
    )
  );

-- Full admins / exec see all escalations
CREATE POLICY "Full admins can view all escalations"
  ON sm_escalations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin'::user_role OR p.admin_type IS NOT NULL)
    )
  );
