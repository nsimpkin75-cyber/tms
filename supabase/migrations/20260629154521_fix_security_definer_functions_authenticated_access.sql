
-- Fix SECURITY DEFINER function exposure to authenticated role.
--
-- Strategy:
-- 1. Pure trigger functions (never called directly): revoke EXECUTE from authenticated.
-- 2. Functions that only operate on auth.uid()'s own data: switch to SECURITY INVOKER.
-- 3. Functions that legitimately query other users' data: keep SECURITY DEFINER
--    but add an internal auth.uid() IS NOT NULL guard so callers must be authenticated.

-- ── 1. Trigger-only functions ─────────────────────────────────────────────────
-- handle_new_user: fired by auth.users trigger, never called via RPC
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- update_organisation_settings_updated_at: table trigger, never called via RPC
REVOKE EXECUTE ON FUNCTION public.update_organisation_settings_updated_at() FROM authenticated;

-- ── 2. Switch own-data functions to SECURITY INVOKER ─────────────────────────
-- is_admin(): only reads auth.uid()'s own profile row — normal RLS covers this
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
END;
$$;

-- update_last_active(): only updates auth.uid()'s own profile row
CREATE OR REPLACE FUNCTION public.update_last_active()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles SET last_active = NOW()
  WHERE id = (SELECT auth.uid());
END;
$$;

-- ── 3. Keep SECURITY DEFINER but add internal auth guard ─────────────────────
-- These functions legitimately need to read other users' data (bypassing RLS)
-- but must reject unauthenticated callers.

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_view_as_session(admin_user_id uuid)
  RETURNS TABLE(
    session_id uuid,
    target_user_id uuid,
    target_email text,
    target_name text,
    started_at timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RETURN; END IF;
  RETURN QUERY
    SELECT vas.id, vas.target_user_id, p.email, p.full_name, vas.started_at
    FROM public.view_as_sessions vas
    JOIN public.profiles p ON p.id = vas.target_user_id
    WHERE vas.admin_id = admin_user_id
      AND vas.ended_at IS NULL
    ORDER BY vas.started_at DESC
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_access_levels(user_id_param uuid)
  RETURNS TABLE(id uuid, name text, permissions jsonb)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RETURN; END IF;
  RETURN QUERY
    SELECT alt.id, alt.name, alt.permissions
    FROM public.user_access_levels ual
    JOIN public.access_level_types alt ON ual.access_level_id = alt.id
    WHERE ual.user_id = user_id_param
      AND alt.is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_access_level(user_id_param uuid, level_name text)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.user_access_levels ual
    JOIN public.access_level_types alt ON ual.access_level_id = alt.id
    WHERE ual.user_id = user_id_param
      AND alt.name = level_name
      AND alt.is_active = true
  );
END;
$$;
