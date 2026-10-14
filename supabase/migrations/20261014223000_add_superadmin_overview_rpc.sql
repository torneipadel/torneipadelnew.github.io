-- Read-only platform overview for the global Superadmin.
-- Returns company metadata and aggregate counters only; no tenant business rows.
create or replace function public.eventour_superadmin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  result jsonb;
begin
  if (select auth.uid()) is null or not coalesce(public.is_superadmin(), false) then
    raise exception 'Accesso riservato al Superadmin globale.'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'companies',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'ragione_sociale', c.ragione_sociale,
          'nome_app', c.nome_app,
          'slug', c.slug,
          'stato', c.stato,
          'created_at', c.created_at,
          'demo_scadenza', c.demo_scadenza,
          'plan', ap.plan_code,
          'status', coalesce(ap.status, 'non assegnato'),
          'expires', ap.expires_at,
          'users', coalesce(ms.users, 0),
          'admins', coalesce(ms.admins, 0),
          'activeTournaments', coalesce(ts.active_tournaments, 0),
          'content', coalesce(ns.news_count, 0),
          'photos', coalesce(ss.sponsor_count, 0) + coalesce(mm.market_count, 0) + coalesce(ns.news_count, 0),
          'plan_config', case when p.code is null then null else jsonb_build_object(
            'code', p.code,
            'name', p.name,
            'monthly_price', p.monthly_price,
            'storage_mb', p.storage_mb,
            'max_photos', p.max_photos,
            'max_news', p.max_news,
            'max_active_tournaments', p.max_active_tournaments,
            'max_admins', p.max_admins,
            'stats_advanced', p.stats_advanced,
            'automations_level', p.automations_level,
            'customization_level', p.customization_level,
            'reports_level', p.reports_level,
            'premium_level', p.premium_level
          ) end
        )
        order by coalesce(c.ragione_sociale, c.nome_app, c.slug)
      )
      from public.aziende c
      left join lateral (
        select ecp.plan_code, ecp.status, ecp.expires_at
        from public.eventour_company_plans ecp
        where ecp.azienda_id = c.id
          and lower(coalesce(ecp.status, '')) in ('active', 'attiva')
          and (ecp.starts_at is null or ecp.starts_at <= now())
          and (ecp.expires_at is null or ecp.expires_at > now())
        order by ecp.starts_at desc nulls last, ecp.updated_at desc nulls last
        limit 1
      ) ap on true
      left join public.eventour_plans p on p.code = ap.plan_code
      left join lateral (
        select
          count(*) filter (where au.attivo is distinct from false)::integer as users,
          count(*) filter (
            where au.attivo is distinct from false
              and lower(coalesce(au.ruolo, '')) in ('owner', 'admin', 'superadmin')
          )::integer as admins
        from public.azienda_utenti au
        where au.azienda_id = c.id
      ) ms on true
      left join lateral (
        select count(*) filter (
          where lower(coalesce(t.stato, '')) not in ('chiuso', 'archiviato', 'annullato')
        )::integer as active_tournaments
        from public.tornei t
        where t.azienda_id = c.id
      ) ts on true
      left join lateral (
        select count(*)::integer as news_count
        from public.news n
        where n.azienda_id = c.id
      ) ns on true
      left join lateral (
        select count(*)::integer as sponsor_count
        from public.sponsor s
        where s.azienda_id = c.id
      ) ss on true
      left join lateral (
        select count(*)::integer as market_count
        from public.mercatino m
        where m.azienda_id = c.id
      ) mm on true
    ), '[]'::jsonb),
    'plans',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', p.code,
        'name', p.name,
        'monthly_price', p.monthly_price,
        'storage_mb', p.storage_mb,
        'max_photos', p.max_photos,
        'max_news', p.max_news,
        'max_active_tournaments', p.max_active_tournaments,
        'max_admins', p.max_admins,
        'stats_advanced', p.stats_advanced,
        'automations_level', p.automations_level,
        'customization_level', p.customization_level,
        'reports_level', p.reports_level,
        'premium_level', p.premium_level
      ) order by p.code)
      from public.eventour_plans p
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$function$;

revoke all on function public.eventour_superadmin_overview() from public, anon;
grant execute on function public.eventour_superadmin_overview() to authenticated;
