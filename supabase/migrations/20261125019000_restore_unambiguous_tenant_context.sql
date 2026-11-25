CREATE OR REPLACE FUNCTION public.get_my_azienda_access(p_azienda_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(azienda_id uuid, nome_app text, slug text, tipo_account text, stato text, demo_inizio timestamp with time zone, demo_scadenza timestamp with time zone, accesso_consentito boolean, giorni_residui integer, ruolo text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select a.id,a.nome_app,a.slug,a.tipo_account,a.stato,a.demo_inizio,a.demo_scadenza,
    case when a.tipo_account='societa_demo' and a.demo_scadenza is not null then now()<a.demo_scadenza
         when a.stato in ('attiva','configurazione') then true else false end,
    case when a.tipo_account='societa_demo' and a.demo_scadenza is not null
         then greatest(0,ceil(extract(epoch from (a.demo_scadenza-now()))/86400.0))::integer else null end,
    au.ruolo
  from public.aziende a
  join public.azienda_utenti au on au.azienda_id=a.id
  where au.user_id=auth.uid()
    and au.attivo is true
    and (
      au.session_revoked_at is null
      or coalesce(nullif((select auth.jwt()->>'iat'), '')::bigint,0)
         > floor(extract(epoch from au.session_revoked_at))::bigint
    )
    and (p_azienda_id is not null or not coalesce(public.is_superadmin(),false))
    and (
      p_azienda_id is not null
      or (
        select count(*)
        from public.azienda_utenti au2
        where au2.user_id=auth.uid()
          and au2.attivo is true
          and (
            au2.session_revoked_at is null
            or coalesce(nullif((select auth.jwt()->>'iat'), '')::bigint,0)
               > floor(extract(epoch from au2.session_revoked_at))::bigint
          )
      )=1
    )
    and (p_azienda_id is null or a.id=p_azienda_id)
  order by case when p_azienda_id is not null and a.id=p_azienda_id then 0 else 1 end,a.created_at desc
  limit 1;
$function$
;