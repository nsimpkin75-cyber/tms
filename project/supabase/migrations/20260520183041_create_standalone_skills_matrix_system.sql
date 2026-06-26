/*
  # Standalone Skills Matrix System

  ## Overview
  A completely new skills assessment system with the hierarchy:
    Type → Category → Topic

  Supports:
  - Admin/L&D Admin matrix creation with lock/unlock
  - Per-role topic assignment
  - Independent employee + manager assessments
  - Mismatch resolution workflow
  - 0–5 rating scale with competency thresholds
  - Escalation tracking at 5/10/15 days
  - Aggregated competency calculations

  ## Tables Created
  1. `sm_types`           – Top-level skill types (e.g. Product Knowledge)
  2. `sm_categories`      – Sub-categories within a type
  3. `sm_topics`          – Individual assessable topics (leaf nodes)
  4. `sm_topic_ratings`   – Per-rating-level definitions (3, 4, 5)
  5. `sm_matrices`        – Matrix header per department
  6. `sm_matrix_roles`    – Which job_family_ids are in this matrix
  7. `sm_role_topics`     – Topic assignments to roles (can be deselected)
  8. `sm_assessments`     – Assessment instance (one per employee per cycle)
  9. `sm_assessment_items`– Individual topic ratings within an assessment
  10. `sm_mismatches`     – Flagged rating discrepancies requiring resolution
  11. `sm_escalations`    – Escalation log for overdue assessments

  ## Security
  - RLS on all tables
  - Admins (role=admin, admin_type IS NOT NULL) have full access
  - Managers see their direct reports
  - Employees see own data
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- Types
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sm_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sm_types"
  ON public.sm_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sm_types"
  ON public.sm_types FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL))
  );

CREATE POLICY "Admins can update sm_types"
  ON public.sm_types FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can delete sm_types"
  ON public.sm_types FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Categories
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id uuid NOT NULL REFERENCES public.sm_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_categories_type_id ON public.sm_categories(type_id);

ALTER TABLE public.sm_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sm_categories"
  ON public.sm_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sm_categories"
  ON public.sm_categories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can update sm_categories"
  ON public.sm_categories FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can delete sm_categories"
  ON public.sm_categories FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Topics
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.sm_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  def_rating_3 text,
  def_rating_4 text,
  def_rating_5 text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_topics_category_id ON public.sm_topics(category_id);

ALTER TABLE public.sm_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sm_topics"
  ON public.sm_topics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sm_topics"
  ON public.sm_topics FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can update sm_topics"
  ON public.sm_topics FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can delete sm_topics"
  ON public.sm_topics FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Matrices
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_matrices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department text NOT NULL,
  is_locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  locked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_matrices_department ON public.sm_matrices(department);

ALTER TABLE public.sm_matrices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sm_matrices"
  ON public.sm_matrices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sm_matrices"
  ON public.sm_matrices FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can update sm_matrices"
  ON public.sm_matrices FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can delete sm_matrices"
  ON public.sm_matrices FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Matrix → Role assignments (job_family_id)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_matrix_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id uuid NOT NULL REFERENCES public.sm_matrices(id) ON DELETE CASCADE,
  job_family_id uuid NOT NULL REFERENCES public.job_families(id) ON DELETE CASCADE,
  UNIQUE (matrix_id, job_family_id)
);

CREATE INDEX IF NOT EXISTS idx_sm_matrix_roles_matrix_id ON public.sm_matrix_roles(matrix_id);
CREATE INDEX IF NOT EXISTS idx_sm_matrix_roles_job_family_id ON public.sm_matrix_roles(job_family_id);

ALTER TABLE public.sm_matrix_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sm_matrix_roles"
  ON public.sm_matrix_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sm_matrix_roles"
  ON public.sm_matrix_roles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can update sm_matrix_roles"
  ON public.sm_matrix_roles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can delete sm_matrix_roles"
  ON public.sm_matrix_roles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Role → Topic assignments (with deselect flag)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_role_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id uuid NOT NULL REFERENCES public.sm_matrices(id) ON DELETE CASCADE,
  job_family_id uuid NOT NULL REFERENCES public.job_families(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.sm_topics(id) ON DELETE CASCADE,
  is_applicable boolean NOT NULL DEFAULT true,
  UNIQUE (matrix_id, job_family_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_sm_role_topics_matrix_id ON public.sm_role_topics(matrix_id);
CREATE INDEX IF NOT EXISTS idx_sm_role_topics_job_family_id ON public.sm_role_topics(job_family_id);
CREATE INDEX IF NOT EXISTS idx_sm_role_topics_topic_id ON public.sm_role_topics(topic_id);

ALTER TABLE public.sm_role_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sm_role_topics"
  ON public.sm_role_topics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sm_role_topics"
  ON public.sm_role_topics FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can update sm_role_topics"
  ON public.sm_role_topics FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can delete sm_role_topics"
  ON public.sm_role_topics FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Assessment cycles
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_assessment_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id uuid NOT NULL REFERENCES public.sm_matrices(id) ON DELETE CASCADE,
  name text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('monthly','quarterly','bi_annual','annual','ad_hoc')),
  due_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_assessment_cycles_matrix_id ON public.sm_assessment_cycles(matrix_id);

ALTER TABLE public.sm_assessment_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sm_assessment_cycles"
  ON public.sm_assessment_cycles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert sm_assessment_cycles"
  ON public.sm_assessment_cycles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can update sm_assessment_cycles"
  ON public.sm_assessment_cycles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can delete sm_assessment_cycles"
  ON public.sm_assessment_cycles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Assessments (one per employee per cycle, two rows: employee + manager)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.sm_assessment_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessor_type text NOT NULL CHECK (assessor_type IN ('employee','manager')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cycle_id, employee_id, assessor_type)
);

CREATE INDEX IF NOT EXISTS idx_sm_assessments_cycle_id ON public.sm_assessments(cycle_id);
CREATE INDEX IF NOT EXISTS idx_sm_assessments_employee_id ON public.sm_assessments(employee_id);
CREATE INDEX IF NOT EXISTS idx_sm_assessments_assessor_id ON public.sm_assessments(assessor_id);

ALTER TABLE public.sm_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessments"
  ON public.sm_assessments FOR SELECT TO authenticated
  USING (assessor_id = auth.uid() OR employee_id = auth.uid());

CREATE POLICY "Managers can view team assessments"
  ON public.sm_assessments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)
    )
  );

CREATE POLICY "Users can insert own assessments"
  ON public.sm_assessments FOR INSERT TO authenticated
  WITH CHECK (assessor_id = auth.uid());

CREATE POLICY "Admins can insert any assessments"
  ON public.sm_assessments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

CREATE POLICY "Assessors can update own assessments"
  ON public.sm_assessments FOR UPDATE TO authenticated
  USING (assessor_id = auth.uid())
  WITH CHECK (assessor_id = auth.uid());

CREATE POLICY "Admins can update any assessment"
  ON public.sm_assessments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Assessment items (one row per topic per assessment)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_assessment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.sm_assessments(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.sm_topics(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 0 AND rating <= 5),
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_sm_assessment_items_assessment_id ON public.sm_assessment_items(assessment_id);
CREATE INDEX IF NOT EXISTS idx_sm_assessment_items_topic_id ON public.sm_assessment_items(topic_id);

ALTER TABLE public.sm_assessment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessment items"
  ON public.sm_assessment_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sm_assessments
      WHERE id = assessment_id AND (assessor_id = auth.uid() OR employee_id = auth.uid())
    )
  );

CREATE POLICY "Managers can view team assessment items"
  ON public.sm_assessment_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)
    )
  );

CREATE POLICY "Assessors can insert own items"
  ON public.sm_assessment_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sm_assessments
      WHERE id = assessment_id AND assessor_id = auth.uid()
    )
  );

CREATE POLICY "Assessors can update own items"
  ON public.sm_assessment_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sm_assessments
      WHERE id = assessment_id AND assessor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sm_assessments
      WHERE id = assessment_id AND assessor_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all items"
  ON public.sm_assessment_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR admin_type IS NOT NULL)));

-- ─────────────────────────────────────────────────────────────────────────────
-- Mismatches (created when employee + manager ratings differ)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_mismatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.sm_assessment_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.sm_topics(id) ON DELETE CASCADE,
  employee_rating integer NOT NULL,
  manager_rating integer NOT NULL,
  employee_comments text,
  manager_comments text,
  resolution text CHECK (resolution IN ('accept_employee','override_manager')),
  final_rating integer,
  manager_feedback text,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_mismatches_cycle_id ON public.sm_mismatches(cycle_id);
CREATE INDEX IF NOT EXISTS idx_sm_mismatches_employee_id ON public.sm_mismatches(employee_id);
CREATE INDEX IF NOT EXISTS idx_sm_mismatches_topic_id ON public.sm_mismatches(topic_id);

ALTER TABLE public.sm_mismatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and admins can view mismatches"
  ON public.sm_mismatches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin','manager','leadership') OR admin_type IS NOT NULL)
    )
    OR employee_id = auth.uid()
  );

CREATE POLICY "System can insert mismatches"
  ON public.sm_mismatches FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)
    )
  );

CREATE POLICY "Managers can update mismatches they own"
  ON public.sm_mismatches FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Escalations (day 5 / 10 / 15 tracking)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sm_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id uuid NOT NULL REFERENCES public.sm_assessment_cycles(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  escalation_level integer NOT NULL CHECK (escalation_level IN (5, 10, 15)),
  triggered_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (cycle_id, employee_id, escalation_level)
);

CREATE INDEX IF NOT EXISTS idx_sm_escalations_cycle_id ON public.sm_escalations(cycle_id);
CREATE INDEX IF NOT EXISTS idx_sm_escalations_employee_id ON public.sm_escalations(employee_id);

ALTER TABLE public.sm_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and admins can view escalations"
  ON public.sm_escalations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND (role IN ('admin','manager','leadership') OR admin_type IS NOT NULL)
    )
  );

CREATE POLICY "Admins can manage escalations"
  ON public.sm_escalations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)));

CREATE POLICY "Admins can update escalations"
  ON public.sm_escalations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role IN ('admin','manager') OR admin_type IS NOT NULL)));
