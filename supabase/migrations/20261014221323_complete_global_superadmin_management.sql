-- Global Superadmin management: company lifecycle, subscriptions, plan catalogue, company memberships and audit.
-- Every write is guarded server-side by authenticated public.is_superadmin().

create or replace function public.eventour_superadmin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare result jsonb;
begin
  if (select auth.uid()) is null or not coalesce(public.is_superadmin(), false) then
    raise exception 'Accesso riservato al Superadmin globale.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'companies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'ragione_sociale', c.ragione_sociale, 'nome_app', c.nome_app,
        'slug', c.slug, 'stato', c.stato, 'created_at', c.created_at,
        'demo_scadenza', c.demo_scadenza, 'plan', ap.plan_code,
        'status', coalesce(ap.status, 'non assegnato'), 'expires', ap.expires_at,
        'users', coalesce(ms.users, 0), 'admins', coalesce(ms.admins, 0),
        'activeTournaments', coalesce(ts.active_tournaments, 0),
        'news', coalesce(ns.news_count, 0), 'sponsors', coalesce(ss.sponsor_count, 0),
        'marketItems', coalesce(mm.market_count, 0),
        'plan_config', case when p.code is null then null else jsonb_build_object(
          'code', p.code, 'name', p.name, 'monthly_price', p.monthly_price,
          'storage_mb', p.storage_mb, 'max_photos', p.max_photos, 'max_news', p.max_news,
          'max_active_tournaments', p.max_active_tournaments, 'max_admins', p.max_admins,
          'stats_advanced', p.stats_advanced, 'automations_level', p.automations_level,
          'customization_level', p.customization_level, 'reports_level', p.reports_level,
          'premium_level', p.premium_level
        ) end
      ) order by coalesce(c.ragione_sociale, c.nome_app, c.slug))
      from public.aziende c
      left join lateral (
        select ecp.plan_code, ecp.status, ecp.expires_at
        from public.eventour_company_plans ecp
        where ecp.azienda_id = c.id
        order by ecp.starts_at desc nulls last, ecp.updated_at desc nulls last
        limit 1
      ) ap on true
      left join public.eventour_plans p on p.code = ap.plan_code
      left join lateral (
        select count(*) filter (where au.attivo is distinct from false)::integer users,
               count(*) filter (where au.attivo is distinct from false and lower(coalesce(au.ruolo,'')) in ('owner','admin','superadmin'))::integer admins
        from public.azienda_utenti au where au.azienda_id = c.id
      ) ms on true
      left join lateral (
        select count(*) filter (where lower(coalesce(t.stato,'')) not in ('chiuso','archiviato','annullato'))::integer active_tournaments
        from public.tornei t where t.azienda_id = c.id
      ) ts on true
      left join lateral (select count(*)::integer news_count from public.news n where n.azienda_id = c.id) ns on true
      left join lateral (select count(*)::integer sponsor_count from public.sponsor s where s.azienda_id = c.id) ss on true
      left join lateral (select count(*)::integer market_count from public.mercatino m where m.azienda_id = c.id) mm on true
    ), '[]'::jsonb),
    'plans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', p.code, 'name', p.name, 'monthly_price', p.monthly_price, 'storage_mb', p.storage_mb,
        'max_photos', p.max_photos, 'max_news', p.max_news,
        'max_active_tournaments', p.max_active_tournaments, 'max_admins', p.max_admins,
        'stats_advanced', p.stats_advanced, 'automations_level', p.automations_level,
        'customization_level', p.customization_level, 'reports_level', p.reports_level, 'premium_level', p.premium_level
      ) order by p.code) from public.eventour_plans p
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'azienda_id', au.azienda_id, 'azienda', coalesce(a.ragione_sociale,a.nome_app,a.slug),
        'user_id', au.user_id, 'email', u.email, 'role', au.ruolo, 'active', au.attivo, 'created_at', au.created_at
      ) order by coalesce(a.ragione_sociale,a.nome_app,a.slug), u.email)
      from public.azienda_utenti au
      join public.aziende a on a.id = au.azienda_id
      join auth.users u on u.id = au.user_id
    ), '[]'::jsonb),
    'audit', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'created_at', l.created_at, 'email', l.actor_email,
        'action', l.action, 'entity_type', l.entity_type, 'entity_id', l.entity_id, 'summary', l.summary
      ) order by l.created_at desc)
      from (select * from public.admin_audit_log order by created_at desc limit 50) l
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$function$;

create or replace function public.eventour_superadmin_create_company(
  p_owner_email text, p_ragione_sociale text, p_nome_app text, p_slug text
) returns jsonb
language plpgsql security definer set search_path to ''
as $function$
declare v_owner uuid; v_id uuid; v_before jsonb;
begin
  if (select auth.uid()) is null or not coalesce(public.is_superadmin(), false) then
    raise exception 'Accesso riservato al Superadmin globale.' using errcode = '42501';
  end if;
  if nullif(trim(p_owner_email),'') is null or nullif(trim(p_ragione_sociale),'') is null
     or nullif(trim(p_nome_app),'') is null or nullif(trim(p_slug),'') is null then
    raise exception 'Compila email proprietario, ragione sociale, nome app e slug.';
  end if;
  if lower(trim(p_slug)) !~ '^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$' then
    raise exception 'Slug non valido: usa lettere minuscole, numeri e trattini.';
  end if;
  select id into v_owner from auth.users where lower(email)=lower(trim(p_owner_email)) limit 1;
  if v_owner is null then raise exception 'L’utente proprietario deve prima registrarsi con questa email.'; end if;
  if exists(select 1 from public.aziende where owner_user_id=v_owner) then
    raise exception 'Questo utente è già proprietario di una società.';
  end if;
  insert into public.aziende(owner_user_id,ragione_sociale,nome_app,slug,stato,tipo_account)
  values(v_owner,trim(p_ragione_sociale),trim(p_nome_app),lower(trim(p_slug)),'configurazione','societa')
  returning id into v_id;
  insert into public.azienda_utenti(azienda_id,user_id,ruolo,attivo)
  values(v_id,v_owner,'owner',true)
  on conflict (azienda_id,user_id) do update set ruolo='owner',attivo=true;
  insert into public.admin_audit_log(actor_user_id,actor_email,ruolo,action,entity_type,entity_id,summary,after_data)
  values(auth.uid(),(select email from auth.users where id=auth.uid()),'superadmin','company.create','azienda',v_id::text,
    'Creata società '||trim(p_ragione_sociale),jsonb_build_object('id',v_id,'email_owner',lower(trim(p_owner_email)),'slug',lower(trim(p_slug))));
  return jsonb_build_object('id',v_id,'owner_user_id',v_owner);
exception when unique_violation then
  raise exception 'Slug o proprietario già utilizzato. Controlla i dati inseriti.';
end;
$function$;

create or replace function public.eventour_superadmin_update_company(
  p_azienda_id uuid, p_ragione_sociale text, p_nome_app text, p_slug text, p_stato text, p_demo_scadenza timestamptz
) returns jsonb
language plpgsql security definer set search_path to ''
as $function$
declare v_before jsonb; v_after jsonb;
begin
  if (select auth.uid()) is null or not coalesce(public.is_superadmin(), false) then
    raise exception 'Accesso riservato al Superadmin globale.' using errcode = '42501';
  end if;
  if p_stato not in ('configurazione','attiva','sospesa') then raise exception 'Stato società non valido.'; end if;
  if nullif(trim(p_ragione_sociale),'') is null or nullif(trim(p_nome_app),'') is null
     or nullif(trim(p_slug),'') is null or lower(trim(p_slug)) !~ '^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$' then
    raise exception 'Dati società non validi. Verifica ragione sociale, nome app e slug.';
  end if;
  select to_jsonb(a) into v_before from public.aziende a where a.id=p_azienda_id for update;
  if v_before is null then raise exception 'Società non trovata.'; end if;
  update public.aziende set ragione_sociale=trim(p_ragione_sociale), nome_app=trim(p_nome_app),
    slug=lower(trim(p_slug)), stato=p_stato, demo_scadenza=p_demo_scadenza, updated_at=now()
  where id=p_azienda_id returning to_jsonb(aziende) into v_after;
  insert into public.admin_audit_log(actor_user_id,actor_email,ruolo,action,entity_type,entity_id,summary,before_data,after_data)
  values(auth.uid(),(select email from auth.users where id=auth.uid()),'superadmin','company.update','azienda',p_azienda_id::text,
    'Aggiornata società '||trim(p_ragione_sociale),v_before,v_after);
  return jsonb_build_object('ok',true,'company',v_after);
exception when unique_violation then raise exception 'Slug già utilizzato da un’altra società.';
end;
$function$;

create or replace function public.eventour_superadmin_set_company_plan(
  p_azienda_id uuid, p_plan_code text, p_status text, p_expires_at timestamptz, p_notes text
) returns jsonb
language plpgsql security definer set search_path to ''
as $function$
declare v_before jsonb; v_after jsonb;
begin
  if (select auth.uid()) is null or not coalesce(public.is_superadmin(), false) then
    raise exception 'Accesso riservato al Superadmin globale.' using errcode = '42501';
  end if;
  if p_status not in ('active','suspended','expired') then raise exception 'Stato piano non valido.'; end if;
  if not exists(select 1 from public.aziende where id=p_azienda_id) then raise exception 'Società non trovata.'; end if;
  if not exists(select 1 from public.eventour_plans where code=upper(trim(p_plan_code))) then raise exception 'Piano non trovato.'; end if;
  select to_jsonb(ecp) into v_before from public.eventour_company_plans ecp where ecp.azienda_id=p_azienda_id;
  insert into public.eventour_company_plans(azienda_id,plan_code,status,expires_at,notes,updated_at,updated_by)
  values(p_azienda_id,upper(trim(p_plan_code)),p_status,p_expires_at,nullif(trim(p_notes),''),now(),auth.uid())
  on conflict (azienda_id) do update set plan_code=excluded.plan_code,status=excluded.status,
    expires_at=excluded.expires_at,notes=excluded.notes,updated_at=now(),updated_by=auth.uid()
  returning to_jsonb(eventour_company_plans) into v_after;
  insert into public.admin_audit_log(actor_user_id,actor_email,ruolo,action,entity_type,entity_id,summary,before_data,after_data)
  values(auth.uid(),(select email from auth.users where id=auth.uid()),'superadmin','company.plan','azienda',p_azienda_id::text,
    'Piano società impostato: '||upper(trim(p_plan_code))||' ('||p_status||')',v_before,v_after);
  return jsonb_build_object('ok',true,'plan',v_after);
end;
$function$;

create or replace function public.eventour_superadmin_save_plan(
  p_code text, p_name text, p_monthly_price numeric, p_storage_mb integer,
  p_max_photos integer, p_max_news integer, p_max_active_tournaments integer, p_max_admins integer,
  p_stats_advanced boolean, p_automations_level text, p_customization_level text,
  p_reports_level text, p_premium_level text
) returns jsonb
language plpgsql security definer set search_path to ''
as $function$
declare v_code text; v_before jsonb; v_after jsonb;
begin
  if (select auth.uid()) is null or not coalesce(public.is_superadmin(), false) then
    raise exception 'Accesso riservato al Superadmin globale.' using errcode = '42501';
  end if;
  v_code := upper(trim(p_code));
  if v_code !~ '^[A-Z][A-Z0-9_-]{1,29}$' or nullif(trim(p_name),'') is null then
    raise exception 'Codice o nome piano non valido.';
  end if;
  if p_monthly_price < 0 or p_storage_mb < 0 or coalesce(p_max_photos,-1)<-1
    or coalesce(p_max_news,-1)<-1 or coalesce(p_max_active_tournaments,-1)<-1 or coalesce(p_max_admins,-1)<-1 then
    raise exception 'Prezzo e limiti devono essere non negativi (oppure vuoti per nessun limite).';
  end if;
  select to_jsonb(p) into v_before from public.eventour_plans p where p.code=v_code;
  insert into public.eventour_plans(code,name,monthly_price,storage_mb,max_photos,max_news,max_active_tournaments,max_admins,
    stats_advanced,automations_level,customization_level,reports_level,premium_level)
  values(v_code,trim(p_name),p_monthly_price,p_storage_mb,p_max_photos,p_max_news,p_max_active_tournaments,p_max_admins,
    coalesce(p_stats_advanced,false),coalesce(nullif(trim(p_automations_level),''),'base'),
    coalesce(nullif(trim(p_customization_level),''),'base'),coalesce(nullif(trim(p_reports_level),''),'base'),
    coalesce(nullif(trim(p_premium_level),''),'none'))
  on conflict(code) do update set name=excluded.name,monthly_price=excluded.monthly_price,storage_mb=excluded.storage_mb,
    max_photos=excluded.max_photos,max_news=excluded.max_news,max_active_tournaments=excluded.max_active_tournaments,
    max_admins=excluded.max_admins,stats_advanced=excluded.stats_advanced,automations_level=excluded.automations_level,
    customization_level=excluded.customization_level,reports_level=excluded.reports_level,premium_level=excluded.premium_level
  returning to_jsonb(eventour_plans) into v_after;
  insert into public.admin_audit_log(actor_user_id,actor_email,ruolo,action,entity_type,entity_id,summary,before_data,after_data)
  values(auth.uid(),(select email from auth.users where id=auth.uid()),'superadmin','plan.save','eventour_plan',v_code,
    case when v_before is null then 'Creato piano ' else 'Aggiornato piano ' end||v_code,v_before,v_after);
  return jsonb_build_object('ok',true,'plan',v_after);
end;
$function$;

create or replace function public.eventour_superadmin_update_member(
  p_azienda_id uuid, p_user_id uuid, p_role text, p_active boolean
) returns jsonb
language plpgsql security definer set search_path to ''
as $function$
declare v_before jsonb; v_after jsonb; v_email text;
begin
  if (select auth.uid()) is null or not coalesce(public.is_superadmin(), false) then
    raise exception 'Accesso riservato al Superadmin globale.' using errcode = '42501';
  end if;
  if p_role not in ('owner','admin','user') then raise exception 'Ruolo società non valido.'; end if;
  select to_jsonb(au),u.email into v_before,v_email from public.azienda_utenti au
    join auth.users u on u.id=au.user_id where au.azienda_id=p_azienda_id and au.user_id=p_user_id for update of au;
  if v_before is null then raise exception 'Utente non trovato in questa società.'; end if;
  if coalesce((v_before->>'attivo')::boolean,false) and p_active=false and v_before->>'ruolo'='owner'
     and (select count(*) from public.azienda_utenti where azienda_id=p_azienda_id and ruolo='owner' and attivo=true)<=1 then
    raise exception 'Non puoi disattivare l’ultimo proprietario attivo della società.';
  end if;
  update public.azienda_utenti set ruolo=p_role,attivo=p_active
    where azienda_id=p_azienda_id and user_id=p_user_id returning to_jsonb(azienda_utenti) into v_after;
  insert into public.admin_audit_log(actor_user_id,actor_email,ruolo,action,entity_type,entity_id,summary,before_data,after_data)
  values(auth.uid(),(select email from auth.users where id=auth.uid()),'superadmin','member.update','azienda_utente',
    p_azienda_id::text||':'||p_user_id::text,'Aggiornato accesso per '||coalesce(v_email,p_user_id::text),v_before,v_after);
  return jsonb_build_object('ok',true,'member',v_after);
end;
$function$;

revoke all on function public.eventour_superadmin_overview() from public, anon;
revoke all on function public.eventour_superadmin_create_company(text,text,text,text) from public, anon;
revoke all on function public.eventour_superadmin_update_company(uuid,text,text,text,text,timestamptz) from public, anon;
revoke all on function public.eventour_superadmin_set_company_plan(uuid,text,text,timestamptz,text) from public, anon;
revoke all on function public.eventour_superadmin_save_plan(text,text,numeric,integer,integer,integer,integer,integer,boolean,text,text,text,text) from public, anon;
revoke all on function public.eventour_superadmin_update_member(uuid,uuid,text,boolean) from public, anon;
grant execute on function public.eventour_superadmin_overview() to authenticated;
grant execute on function public.eventour_superadmin_create_company(text,text,text,text) to authenticated;
grant execute on function public.eventour_superadmin_update_company(uuid,text,text,text,text,timestamptz) to authenticated;
grant execute on function public.eventour_superadmin_set_company_plan(uuid,text,text,timestamptz,text) to authenticated;
grant execute on function public.eventour_superadmin_save_plan(text,text,numeric,integer,integer,integer,integer,integer,boolean,text,text,text,text) to authenticated;
grant execute on function public.eventour_superadmin_update_member(uuid,uuid,text,boolean) to authenticated;
