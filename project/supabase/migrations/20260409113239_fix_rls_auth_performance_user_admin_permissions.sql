/*
  # Fix RLS Auth Performance on user_admin_permissions

  ## Summary
  Replaces bare `auth.uid()` with `(select auth.uid())` in the
  "Users can view own permissions" policy to prevent per-row re-evaluation.
  Also consolidates the duplicate SELECT policies (Admins can view all permissions
  is redundant given Admins can manage permissions covers ALL operations).

  ## Changes
  - Drop "Users can view own permissions" and recreate with subselect pattern
  - Drop redundant "Admins can view all permissions" policy (covered by ALL policy)
*/

DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_admin_permissions;
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.user_admin_permissions;

CREATE POLICY "Users can view own permissions"
  ON public.user_admin_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
