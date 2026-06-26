/*
  # Create Role Profile Recommendations Table

  ## Purpose
  Allows Dept Leads (role = 'leadership') to recommend edits to role profiles from Explore Careers.
  Admins and Execs review, approve (applying changes to the live profile), or dismiss recommendations.

  ## New Tables
  - `role_profile_recommendations`
    - id, job_family_id, submitted_by, field_name, field_label
    - current_value, suggested_value, rationale
    - status (pending/approved/dismissed), reviewed_by, reviewed_at, dismissal_comment, created_at

  ## Security
  - RLS enabled; dept leads insert/view own; admins view all and update status
*/

CREATE TABLE IF NOT EXISTS public.role_profile_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_family_id uuid NOT NULL REFERENCES public.job_families(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_label text NOT NULL,
  current_value text,
  suggested_value text NOT NULL,
  rationale text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  dismissal_comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_profile_recs_job_family_id ON public.role_profile_recommendations(job_family_id);
CREATE INDEX IF NOT EXISTS idx_role_profile_recs_submitted_by ON public.role_profile_recommendations(submitted_by);
CREATE INDEX IF NOT EXISTS idx_role_profile_recs_reviewed_by ON public.role_profile_recommendations(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_role_profile_recs_status ON public.role_profile_recommendations(status);

ALTER TABLE public.role_profile_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dept leads can submit recommendations"
  ON public.role_profile_recommendations
  FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Users can view own recommendations"
  ON public.role_profile_recommendations
  FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid());

CREATE POLICY "Admins can view all recommendations"
  ON public.role_profile_recommendations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR admin_type IS NOT NULL)
    )
  );

CREATE POLICY "Admins can update recommendation status"
  ON public.role_profile_recommendations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR admin_type IS NOT NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND (role = 'admin' OR admin_type IS NOT NULL)
    )
  );
