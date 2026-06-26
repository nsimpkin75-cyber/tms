/*
  # Consolidate profiles UPDATE policies

  ## Summary
  The profiles table has two permissive UPDATE policies which both fire per row.
  Merge "Users can update own profile" and "Admins can update all profiles" into a single policy.

  ## Changes
  - Drop both existing UPDATE policies
  - Create a single merged UPDATE policy using OR condition
*/

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users and admins can update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR is_user_admin()
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR is_user_admin()
  );
