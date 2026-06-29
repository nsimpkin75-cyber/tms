
-- Revoke EXECUTE from anon role on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.get_active_view_as_session(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_access_levels(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_access_level(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_last_active() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_organisation_settings_updated_at() FROM anon;
