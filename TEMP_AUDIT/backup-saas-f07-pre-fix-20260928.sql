-- BACKUP PRE-FIX SAAS-F07 — 2026-09-28
-- Supabase project: dkeqicstprvvfebiaooc
-- Read-only snapshot of functions/permissions relevant to public visitor flow.

-- private.can_manage_azienda(uuid)
-- SECURITY DEFINER, search_path=''
-- Definition captured before permission fix:
CREATE OR REPLACE FUNCTION private.can_manage_azienda(p_azienda_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    private.is_platform_admin()
    or exists (
      select 1
      from public.azienda_utenti au
      join public.aziende a on a.id = au.azienda_id
      where au.azienda_id = p_azienda_id
        and au.user_id = (select auth.uid())
        and au.attivo = true
        and lower(coalesce(au.ruolo,'')) in ('owner','admin','superadmin')
        and (
          a.stato in ('attiva','configurazione')
          or (a.tipo_account = 'societa_demo' and a.demo_scadenza is not null and now() < a.demo_scadenza)
        )
    );
$function$;

-- public.get_torneo_iscrizioni_count(bigint)
CREATE OR REPLACE FUNCTION public.get_torneo_iscrizioni_count(p_torneo_id bigint)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select count(*)::integer
 from public.iscrizioni
 where torneo_id = p_torneo_id
   and lower(coalesce(stato,'')) <> 'rifiutato';
$function$;

-- PRE-FIX EXECUTE state:
-- private.can_manage_azienda(uuid): anon=false, authenticated=true
-- public.get_torneo_iscrizioni_count(bigint): anon=false, authenticated=true
