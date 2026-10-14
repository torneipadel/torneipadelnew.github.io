-- Guard against removing the final active owner from a tenant.
create or replace function public.eventour_superadmin_update_member(p_azienda_id uuid,p_user_id uuid,p_role text,p_active boolean)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_before jsonb; v_after jsonb; v_email text;
begin
  if (select auth.uid()) is null or not coalesce(public.is_superadmin(),false) then
    raise exception 'Accesso riservato al Superadmin globale.' using errcode='42501';
  end if;
  if p_role not in ('owner','admin','user') then raise exception 'Ruolo società non valido.'; end if;
  select to_jsonb(au),u.email into v_before,v_email
  from public.azienda_utenti au join auth.users u on u.id=au.user_id
  where au.azienda_id=p_azienda_id and au.user_id=p_user_id for update of au;
  if v_before is null then raise exception 'Utente non trovato in questa società.'; end if;
  if v_before->>'ruolo'='owner' and coalesce((v_before->>'attivo')::boolean,false)
     and (p_active=false or p_role<>'owner')
     and (select count(*) from public.azienda_utenti where azienda_id=p_azienda_id and ruolo='owner' and attivo=true)<=1 then
    raise exception 'Non puoi disattivare o declassare l’ultimo proprietario attivo della società.';
  end if;
  update public.azienda_utenti set ruolo=p_role,attivo=p_active
  where azienda_id=p_azienda_id and user_id=p_user_id returning to_jsonb(azienda_utenti) into v_after;
  insert into public.admin_audit_log(actor_user_id,actor_email,ruolo,action,entity_type,entity_id,summary,before_data,after_data)
  values(auth.uid(),(select email from auth.users where id=auth.uid()),'superadmin','member.update','azienda_utente',
    p_azienda_id::text||':'||p_user_id::text,'Aggiornato accesso per '||coalesce(v_email,p_user_id::text),v_before,v_after);
  return jsonb_build_object('ok',true,'member',v_after);
end;
$function$;

-- Include subscription notes in the overview so editing a plan never erases them accidentally.
create or replace function public.eventour_superadmin_overview()
returns jsonb language plpgsql stable security definer set search_path to ''
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
        'status', coalesce(ap.status, 'non assegnato'), 'expires', ap.expires_at,'plan_notes',ap.notes,
        'users', coalesce(ms.users, 0), 'admins', coalesce(ms.admins, 0),
        'activeTournaments', coalesce(ts.active_tournaments, 0),
        'news', coalesce(ns.news_count, 0), 'sponsors', coalesce(ss.sponsor_count, 0),
        'marketItems', coalesce(mm.market_count, 0),
        'plan_config', case when p.code is null then null else jsonb_build_object(
          'code', p.code, 'name', p.name, 'monthly_price', p.monthly_price,
          'storage_mb', p.storage_mb, 'max_photos', p.max_photos, 'max_news', p.max_news,
          'max_active_tournaments', p.max_active_tournaments, 'max_admins', p.max_admins,
          'stats_advanced', p.stats_advanced, 'automations_level', p.automations_level,
          'customization_level', p.customization_level, 'reports_level', p.reports_level, 'premium_level', p.premium_level
        ) end
      ) order by coalesce(c.ragione_sociale, c.nome_app, c.slug))
      from public.aziende c
      left join lateral (
        select ecp.plan_code, ecp.status, ecp.expires_at, ecp.notes from public.eventour_company_plans ecp
        where ecp.azienda_id = c.id order by ecp.starts_at desc nulls last, ecp.updated_at desc nulls last limit 1
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
        'max_photos', p.max_photos, 'max_news', p.max_news, 'max_active_tournaments', p.max_active_tournaments,
        'max_admins', p.max_admins, 'stats_advanced', p.stats_advanced, 'automations_level', p.automations_level,
        'customization_level', p.customization_level, 'reports_level', p.reports_level, 'premium_level', p.premium_level
      ) order by p.code) from public.eventour_plans p
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'azienda_id', au.azienda_id, 'azienda', coalesce(a.ragione_sociale,a.nome_app,a.slug),
        'user_id', au.user_id, 'email', u.email, 'role', au.ruolo, 'active', au.attivo, 'created_at', au.created_at
      ) order by coalesce(a.ragione_sociale,a.nome_app,a.slug), u.email)
      from public.azienda_utenti au join public.aziende a on a.id=au.azienda_id join auth.users u on u.id=au.user_id
    ), '[]'::jsonb),
    'audit', coalesce((
      select jsonb_agg(jsonb_build_object('id',l.id,'created_at',l.created_at,'email',l.actor_email,
        'action',l.action,'entity_type',l.entity_type,'entity_id',l.entity_id,'summary',l.summary) order by l.created_at desc)
      from (select * from public.admin_audit_log order by created_at desc limit 50) l
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$function$;
