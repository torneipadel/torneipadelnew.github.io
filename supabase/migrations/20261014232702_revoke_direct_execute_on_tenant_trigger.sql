-- Trigger-only SECURITY DEFINER function: prevent direct API execution while preserving its installed triggers.
REVOKE EXECUTE ON FUNCTION public.assign_tenant_data() FROM PUBLIC, anon, authenticated;
