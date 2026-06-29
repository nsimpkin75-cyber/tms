
-- 1. Fix SECURITY DEFINER view: recreate as SECURITY INVOKER
-- The view queries profiles which has RLS, so SECURITY INVOKER is correct —
-- callers only see rows their own RLS policies permit.
DROP VIEW IF EXISTS public.user_status_view;
CREATE VIEW public.user_status_view
  WITH (security_invoker = true)
AS
  SELECT
    id,
    email,
    full_name,
    role,
    department,
    last_active,
    CASE
      WHEN last_active > (now() - interval '5 minutes')  THEN 'online'
      WHEN last_active > (now() - interval '1 hour')     THEN 'away'
      ELSE 'offline'
    END AS status
  FROM profiles p;

-- Grant same access as before
GRANT SELECT ON public.user_status_view TO authenticated;

-- 2. Fix mutable search_path on trigger functions
CREATE OR REPLACE FUNCTION public.update_training_module_pages_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
