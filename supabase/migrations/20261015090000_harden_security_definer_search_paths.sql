-- Harden SECURITY DEFINER routines by removing writable/public schemas from name resolution.
-- Referenced application objects in these routines are schema-qualified.
ALTER FUNCTION public.admin_role() SET search_path = '';
ALTER FUNCTION public.audit_tornei_change() SET search_path = '';
ALTER FUNCTION public.crea_azienda_e_provisioning_nuovo_utente() SET search_path = '';
ALTER FUNCTION public.create_company_for_current_user(text,text,text,text,text,text,text,text,text) SET search_path = '';
ALTER FUNCTION public.ensure_profile_for_auth_user() SET search_path = '';
ALTER FUNCTION public.get_my_azienda_access(uuid) SET search_path = '';
ALTER FUNCTION public.get_public_companies(text) SET search_path = '';
ALTER FUNCTION public.is_admin_or_superadmin() SET search_path = '';
ALTER FUNCTION public.is_superadmin() SET search_path = '';
