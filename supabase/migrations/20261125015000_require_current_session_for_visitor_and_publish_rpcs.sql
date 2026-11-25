-- Enforce current tenant session in legacy SECURITY DEFINER entry points.
CREATE OR REPLACE FUNCTION public.publish_my_company()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid:=auth.uid(); v_id uuid; v_missing text[]:=array[]::text[];
BEGIN
  PERFORM private.assert_eventour_mfa();
 if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
 select id into v_id from public.aziende where owner_user_id=v_uid limit 1;
 if v_id is null then raise exception 'COMPANY_NOT_FOUND'; end if;
 if not private.can_manage_azienda(v_id) then raise exception 'ACCESS_DENIED'; end if;
 select coalesce(array_agg(label order by ord),array[]::text[]) into v_missing from (
  select 1 ord,'Ragione sociale' label where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.ragione_sociale),'') is not null)
  union all select 2,'Nome app' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.nome_app),'') is not null)
  union all select 3,'Titolare' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.titolare),'') is not null)
  union all select 4,'Sede' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.sede),'') is not null)
  union all select 5,'CF/P.IVA' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.cf_piva),'') is not null)
  union all select 6,'Email aziendale' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.email),'') is not null)
  union all select 7,'Telefono' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.telefono),'') is not null)
  union all select 8,'Privacy' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.privacy_text),'') is not null and trim(a.privacy_text) not ilike '%[inserire%')
  union all select 9,'Cookie' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.cookie_text),'') is not null and trim(a.cookie_text) not ilike '%[inserire%')
  union all select 10,'Termini' where not exists(select 1 from public.aziende a where a.id=v_id and nullif(trim(a.termini_text),'') is not null and trim(a.termini_text) not ilike '%[inserire%')
 ) x;
 if cardinality(v_missing)>0 then return jsonb_build_object('ok',false,'published',false,'missing',v_missing); end if;
 update public.aziende set stato='attiva',updated_at=now() where id=v_id and owner_user_id=v_uid;
 return jsonb_build_object('ok',true,'published',true,'azienda_id',v_id);
end;
$function$

CREATE OR REPLACE FUNCTION public.update_visitor_profile(p_livello text DEFAULT NULL::text, p_alias text DEFAULT NULL::text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Devi essere autenticato.';
  end if;

  if not exists (
    select 1
    from public.azienda_utenti au
    join public.aziende a on a.id = au.azienda_id
    where au.user_id = v_uid
      and au.attivo = true
      and private.user_has_azienda(au.azienda_id)
      and au.ruolo = 'user'
      and a.stato = 'attiva'
  ) then
    raise exception 'Profilo visitatore non autorizzato.';
  end if;

  update public.profili p
  set livello = coalesce(nullif(trim(p_livello), ''), p.livello),
      alias = coalesce(nullif(trim(p_alias), ''), p.alias),
      note = coalesce(nullif(trim(p_note), ''), p.note),
      updated_at = now()
  where p.user_id = v_uid
    and lower(coalesce(p.ruolo, 'user')) = 'user';

  if not found then
    raise exception 'Profilo visitatore non trovato.';
  end if;

  return jsonb_build_object('ok', true);
end;
$function$
