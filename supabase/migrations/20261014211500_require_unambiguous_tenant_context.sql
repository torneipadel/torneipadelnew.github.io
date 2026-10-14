-- Never infer a tenant when a user has multiple active memberships.
-- An explicit tenant context must be supplied in that case; otherwise the
-- trigger leaves azienda_id unset and tenant RLS rejects the write.
create or replace function private.tenant_azienda_for_user()
returns uuid
language sql
stable
security definer
set search_path to ''
as $function$
  select min(au.azienda_id::text)::uuid
  from public.azienda_utenti au
  join public.aziende a on a.id = au.azienda_id
  where au.user_id = (select auth.uid())
    and au.attivo = true
    and (
      a.stato in ('attiva','configurazione')
      or (a.tipo_account = 'societa_demo' and a.demo_scadenza is not null and now() < a.demo_scadenza)
    )
  having count(distinct au.azienda_id) = 1;
$function$;
