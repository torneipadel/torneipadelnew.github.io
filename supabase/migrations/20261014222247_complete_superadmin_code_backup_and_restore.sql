-- Complete global Superadmin: code version registry, restore requests and complete-project backups.
create or replace function public.eventour_superadmin_overview()
returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare result jsonb;
begin
  if (select auth.uid()) is null or not coalesce(public.is_superadmin(), false) then raise exception 'Accesso riservato al Superadmin globale.' using errcode='42501'; end if;
  select jsonb_build_object(
    'companies',coalesce((select jsonb_agg(jsonb_build_object(
      'id',c.id,'ragione_sociale',c.ragione_sociale,'nome_app',c.nome_app,'slug',c.slug,'stato',c.stato,'created_at',c.created_at,'demo_scadenza',c.demo_scadenza,'plan',ap.plan_code,
      'status',case when ap.status='active' and ap.expires_at is not null and ap.expires_at<=now() then 'expired' else coalesce(ap.status,'non assegnato') end,
      'expires',ap.expires_at,'plan_notes',ap.notes,'users',coalesce(ms.users,0),'admins',coalesce(ms.admins,0),'activeTournaments',coalesce(ts.active_tournaments,0),
      'news',coalesce(ns.news_count,0),'sponsors',coalesce(ss.sponsor_count,0),'marketItems',coalesce(mm.market_count,0),
      'plan_config',case when p.code is null then null else jsonb_build_object('code',p.code,'name',p.name,'monthly_price',p.monthly_price,'storage_mb',p.storage_mb,
        'max_photos',p.max_photos,'max_news',p.max_news,'max_active_tournaments',p.max_active_tournaments,'max_admins',p.max_admins,'stats_advanced',p.stats_advanced,
        'automations_level',p.automations_level,'customization_level',p.customization_level,'reports_level',p.reports_level,'premium_level',p.premium_level) end
      ) order by coalesce(c.ragione_sociale,c.nome_app,c.slug))
      from public.aziende c
      left join lateral (select ecp.plan_code,ecp.status,ecp.expires_at,ecp.notes from public.eventour_company_plans ecp where ecp.azienda_id=c.id order by ecp.starts_at desc nulls last,ecp.updated_at desc nulls last limit 1) ap on true
      left join public.eventour_plans p on p.code=ap.plan_code
      left join lateral (select count(*) filter(where au.attivo is distinct from false)::integer users,count(*) filter(where au.attivo is distinct from false and lower(coalesce(au.ruolo,'')) in ('owner','admin','superadmin'))::integer admins from public.azienda_utenti au where au.azienda_id=c.id) ms on true
      left join lateral (select count(*) filter(where lower(coalesce(t.stato,'')) not in ('chiuso','archiviato','annullato'))::integer active_tournaments from public.tornei t where t.azienda_id=c.id) ts on true
      left join lateral (select count(*)::integer news_count from public.news n where n.azienda_id=c.id) ns on true
      left join lateral (select count(*)::integer sponsor_count from public.sponsor s where s.azienda_id=c.id) ss on true
      left join lateral (select count(*)::integer market_count from public.mercatino m where m.azienda_id=c.id) mm on true),'[]'::jsonb),
    'plans',coalesce((select jsonb_agg(jsonb_build_object('code',p.code,'name',p.name,'monthly_price',p.monthly_price,'storage_mb',p.storage_mb,'max_photos',p.max_photos,'max_news',p.max_news,'max_active_tournaments',p.max_active_tournaments,'max_admins',p.max_admins,'stats_advanced',p.stats_advanced,'automations_level',p.automations_level,'customization_level',p.customization_level,'reports_level',p.reports_level,'premium_level',p.premium_level) order by p.code) from public.eventour_plans p),'[]'::jsonb),
    'members',coalesce((select jsonb_agg(jsonb_build_object('azienda_id',au.azienda_id,'azienda',coalesce(a.ragione_sociale,a.nome_app,a.slug),'user_id',au.user_id,'email',u.email,'role',au.ruolo,'active',au.attivo,'created_at',au.created_at) order by coalesce(a.ragione_sociale,a.nome_app,a.slug),u.email) from public.azienda_utenti au join public.aziende a on a.id=au.azienda_id join auth.users u on u.id=au.user_id),'[]'::jsonb),
    'audit',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'created_at',l.created_at,'email',l.actor_email,'action',l.action,'entity_type',l.entity_type,'entity_id',l.entity_id,'summary',l.summary) order by l.created_at desc) from (select * from public.admin_audit_log order by created_at desc limit 50) l),'[]'::jsonb),
    'code_versions',coalesce((select jsonb_agg(jsonb_build_object('file_path',b.file_path,'commit_sha',b.commit_sha,'status',b.status,'note',b.note,'marked_by_email',b.marked_by_email,'created_at',b.created_at) order by b.created_at desc) from (select * from public.code_backup_registry order by created_at desc limit 500) b),'[]'::jsonb),
    'restore_requests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'file_path',r.file_path,'commit_sha',r.commit_sha,'email',r.requested_by_email,'status',r.status,'result',r.result,'created_at',r.created_at,'completed_at',r.completed_at) order by r.created_at desc) from (select * from public.code_restore_requests order by created_at desc limit 30) r),'[]'::jsonb),
    'project_backups',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'branch_name',b.branch_name,'commit_sha',b.commit_sha,'created_at',b.created_at,'email',b.created_by_email,'status',b.status) order by b.created_at desc) from (select * from public.project_complete_backup_registry order by created_at desc limit 50) b),'[]'::jsonb)
  ) into result;
  return result;
end;
$function$;

create or replace function public.superadmin_request_code_restore(p_file_path text,p_commit_sha text)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_id bigint; v_user_email text; v_sha text:=lower(trim(p_commit_sha));
begin
  if (select auth.uid()) is null or not coalesce(public.is_superadmin(),false) then raise exception 'Accesso riservato al Superadmin globale.' using errcode='42501'; end if;
  if p_file_path not in ('Bove.html','admin.html','admin-superadmin-v1.js','manuale.html','admin-system-monitor-v1.js','admin-torneo-rotazione-v1.js','index.html','superadmin-login.html','eventour-control-center.html','eventour-control-center-v1.js','eventour-control-center-v1.css','eventour-control-center-entry-v1.js') then raise exception 'File non autorizzato al ripristino.'; end if;
  if v_sha !~ '^[0-9a-f]{40}$' then raise exception 'SHA commit GitHub non valido.'; end if;
  if exists(select 1 from public.code_restore_requests where status='PENDING') then raise exception 'Esiste già una richiesta di ripristino in attesa. Attendi il completamento prima di inviarne un’altra.'; end if;
  select email into v_user_email from auth.users where id=auth.uid();
  insert into public.code_restore_requests(file_path,commit_sha,requested_by,requested_by_email,status) values(p_file_path,v_sha,auth.uid(),v_user_email,'PENDING') returning id into v_id;
  insert into public.admin_audit_log(actor_user_id,actor_email,ruolo,action,entity_type,entity_id,summary,after_data)
  values(auth.uid(),v_user_email,'superadmin','code.restore.request','code_file',p_file_path,'Richiesto ripristino codice da commit '||left(v_sha,10),jsonb_build_object('file_path',p_file_path,'commit_sha',v_sha,'request_id',v_id));
  return jsonb_build_object('ok',true,'id',v_id,'status','PENDING');
end;
$function$;

create or replace function public.eventour_superadmin_mark_code_version(p_file_path text,p_commit_sha text,p_status text,p_note text default null)
returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_before jsonb; v_after jsonb; v_sha text:=lower(trim(p_commit_sha)); v_email text;
begin
  if (select auth.uid()) is null or not coalesce(public.is_superadmin(),false) then raise exception 'Accesso riservato al Superadmin globale.' using errcode='42501'; end if;
  if p_file_path not in ('Bove.html','admin.html','admin-superadmin-v1.js','manuale.html','admin-system-monitor-v1.js','admin-torneo-rotazione-v1.js','index.html','superadmin-login.html','eventour-control-center.html','eventour-control-center-v1.js','eventour-control-center-v1.css','eventour-control-center-entry-v1.js') then raise exception 'File non autorizzato.'; end if;
  if v_sha !~ '^[0-9a-f]{40}$' then raise exception 'SHA commit GitHub non valido.'; end if;
  if p_status not in ('STABILE','TEST','PROBLEMATICA') then raise exception 'Stato versione non valido.'; end if;
  select to_jsonb(b) into v_before from public.code_backup_registry b where b.file_path=p_file_path and b.commit_sha=v_sha;
  select email into v_email from auth.users where id=auth.uid();
  insert into public.code_backup_registry(file_path,commit_sha,status,note,marked_by,marked_by_email) values(p_file_path,v_sha,p_status,nullif(trim(p_note),''),auth.uid(),v_email)
  on conflict(file_path,commit_sha) do update set status=excluded.status,note=excluded.note,marked_by=excluded.marked_by,marked_by_email=excluded.marked_by_email
  returning to_jsonb(code_backup_registry) into v_after;
  insert into public.admin_audit_log(actor_user_id,actor_email,ruolo,action,entity_type,entity_id,summary,before_data,after_data)
  values(auth.uid(),v_email,'superadmin','code.version.mark','code_file',p_file_path,'Versione codice marcata: '||p_status||' ('||left(v_sha,10)||')',v_before,v_after);
  return jsonb_build_object('ok',true,'version',v_after);
end;
$function$;

revoke all on function public.superadmin_request_code_restore(text,text) from public,anon;
revoke all on function public.eventour_superadmin_mark_code_version(text,text,text,text) from public,anon;
grant execute on function public.superadmin_request_code_restore(text,text) to authenticated;
grant execute on function public.eventour_superadmin_mark_code_version(text,text,text,text) to authenticated;
