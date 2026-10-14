-- Pin remaining SECURITY DEFINER routines to an empty search_path.
-- All relations and helper functions referenced by these routines are schema-qualified.
ALTER FUNCTION public.prevent_archive_without_superadmin() SET search_path = '';
ALTER FUNCTION public.publish_my_company() SET search_path = '';
ALTER FUNCTION public.publish_my_company(uuid) SET search_path = '';
ALTER FUNCTION public.update_my_azienda_config(uuid, jsonb) SET search_path = '';
