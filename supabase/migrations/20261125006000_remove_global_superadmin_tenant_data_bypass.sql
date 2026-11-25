-- Global Superadmin is not a tenant operator. Tenant mutations require an explicit tenant membership.
revoke all on function public.eventour_superadmin_update_company(uuid,text,text,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.eventour_superadmin_set_company_plan(uuid,text,text,timestamptz,text) from public, anon, authenticated;
revoke all on function public.eventour_superadmin_save_plan(text,text,numeric,integer,integer,integer,integer,integer,boolean,text,text,text,text) from public, anon, authenticated;

create or replace function public.prevent_archive_without_superadmin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_azienda_id uuid := coalesce(new.azienda_id, old.azienda_id);
  v_archive_change boolean := false;
begin
  if tg_op = 'UPDATE' then
    v_archive_change :=
      (lower(coalesce(new.stato,'')) = 'archiviato' and lower(coalesce(old.stato,'')) <> 'archiviato')
      or
      (lower(coalesce(old.stato,'')) = 'archiviato' and lower(coalesce(new.stato,'')) <> 'archiviato');
  elsif tg_op = 'INSERT' then
    v_archive_change := lower(coalesce(new.stato,'')) = 'archiviato';
  end if;

  if v_archive_change and not coalesce(private.can_manage_azienda(v_azienda_id), false) then
    raise exception 'Solo gli amministratori della società possono archiviare o riaprire un torneo.'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

create or replace function public.protect_archived_tournament()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  v_azienda_id uuid := coalesce(new.azienda_id, old.azienda_id);
begin
  if coalesce(private.can_manage_azienda(v_azienda_id), false) then
    return new;
  end if;

  if lower(coalesce(old.stato,'')) = 'archiviato' then
    new.stato := 'archiviato';
    new.pubblicato := false;
    new.iscrizioni_chiuse := true;
  end if;

  return new;
end;
$function$;

create or replace function public.protect_iscrizione_approval_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_azienda_id uuid;
begin
  if tg_op = 'UPDATE' then
    v_azienda_id := coalesce(new.azienda_id, old.azienda_id);
  else
    v_azienda_id := new.azienda_id;
  end if;

  if coalesce(private.can_manage_azienda(v_azienda_id), false) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.approvato := false;
    if lower(trim(coalesce(new.stato, ''))) in ('approvato', 'approved') then
      new.stato := 'richiesta';
    end if;
  else
    if new.approvato is distinct from old.approvato
       or new.stato is distinct from old.stato then
      raise exception 'Solo gli amministratori della società possono modificare lo stato di approvazione.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.create_company_for_current_user(
  p_ragione_sociale text,
  p_nome_app text,
  p_titolare text default null,
  p_sede text default null,
  p_cf_piva text default null,
  p_telefono text default null,
  p_pec text default null,
  p_email_aziendale text default null,
  p_tipo_account text default 'societa'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_tipo text := case when p_tipo_account in ('societa','societa_demo') then p_tipo_account else 'societa' end;
  v_slug_base text;
  v_slug text;
  v_azienda_id uuid;
  v_ruolo text;
  v_meta jsonb;
begin
  perform private.assert_eventour_mfa();
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select email, raw_user_meta_data into v_email, v_meta from auth.users where id=v_uid;
  if v_email is null then raise exception 'USER_NOT_FOUND'; end if;
  if nullif(trim(coalesce(p_ragione_sociale,'')),'') is null or nullif(trim(coalesce(p_nome_app,'')),'') is null then
    raise exception 'COMPANY_NAME_REQUIRED';
  end if;

  if exists(select 1 from public.aziende where owner_user_id=v_uid) then
    select id, slug into v_azienda_id, v_slug from public.aziende where owner_user_id=v_uid limit 1;
    select au.ruolo into v_ruolo from public.azienda_utenti au where au.azienda_id=v_azienda_id and au.user_id=v_uid limit 1;
    insert into public.profili(user_id,nome,cognome,telefono,email)
    values(v_uid,nullif(trim(coalesce(v_meta->>'nome','')),''),nullif(trim(coalesce(v_meta->>'cognome','')),''),nullif(trim(coalesce(p_telefono, v_meta->>'telefono')),''),v_email)
    on conflict(user_id) do update set nome=coalesce(excluded.nome,public.profili.nome),cognome=coalesce(excluded.cognome,public.profili.cognome),telefono=coalesce(excluded.telefono,public.profili.telefono),email=coalesce(excluded.email,public.profili.email),updated_at=now();
    return jsonb_build_object('ok',true,'azienda_id',v_azienda_id,'slug',v_slug,'ruolo',coalesce(v_ruolo,'owner'),'already_exists',true);
  end if;

  if coalesce(public.is_superadmin(),false) then
    raise exception 'GLOBAL_SUPERADMIN_TENANT_CREATION_DISABLED';
  end if;

  if exists(select 1 from public.azienda_utenti au where au.user_id=v_uid) then
    raise exception 'ACCOUNT_ALREADY_ASSOCIATED';
  end if;

  if not exists (
    select 1 from private.eventour_account_consents c
    where c.user_id=v_uid and c.consent_type='privacy' and c.document_version='eventour-privacy-2026-11-25'
  ) or not exists (
    select 1 from private.eventour_account_consents c
    where c.user_id=v_uid and c.consent_type='terms' and c.document_version='eventour-terms-2026-11-25'
  ) then
    raise exception 'CONSENT_REQUIRED';
  end if;

  v_slug_base := lower(regexp_replace(trim(p_nome_app),'[^a-zA-Z0-9]+','-','g'));
  v_slug_base := trim(both '-' from v_slug_base);
  if v_slug_base='' then v_slug_base:='app'; end if;
  v_slug := left(v_slug_base,80)||'-'||substr(replace(v_uid::text,'-',''),1,8);

  insert into public.aziende(owner_user_id,ragione_sociale,nome_app,slug,sede,cf_piva,email,telefono,pec,titolare,colori,stato,tipo_account,demo_inizio,demo_scadenza)
  values(v_uid,trim(p_ragione_sociale),trim(p_nome_app),v_slug,nullif(trim(p_sede),''),nullif(trim(p_cf_piva),''),coalesce(nullif(trim(p_email_aziendale),''),v_email),nullif(trim(p_telefono),''),nullif(trim(p_pec),''),nullif(trim(p_titolare),''),jsonb_build_object('primary','#073b72','accent','#ffe76b'),'configurazione',v_tipo,case when v_tipo='societa_demo' then now() else null end,case when v_tipo='societa_demo' then now()+interval '14 days' else null end)
  returning id into v_azienda_id;

  insert into public.azienda_utenti(azienda_id,user_id,ruolo) values(v_azienda_id,v_uid,'owner') on conflict do nothing;
  insert into public.profili(user_id,nome,cognome,telefono,email)
  values(v_uid,nullif(trim(coalesce(v_meta->>'nome','')),''),nullif(trim(coalesce(v_meta->>'cognome','')),''),nullif(trim(coalesce(p_telefono,v_meta->>'telefono')),''),v_email)
  on conflict(user_id) do update set nome=coalesce(excluded.nome,public.profili.nome),cognome=coalesce(excluded.cognome,public.profili.cognome),telefono=coalesce(excluded.telefono,public.profili.telefono),email=coalesce(excluded.email,public.profili.email),updated_at=now();

  insert into public.provisioning_requests(owner_user_id,azienda_id,stato,repo_name,repo_url,app_url,supabase_project_ref,supabase_url,dettagli)
  values(v_uid,v_azienda_id,'completata','torneipadel/torneipadelnew.github.io','https://github.com/torneipadel/torneipadelnew.github.io','https://torneipadel.github.io/torneipadelnew.github.io/','dkeqicstprvvfebiaooc','https://dkeqicstprvvfebiaooc.supabase.co',jsonb_build_object('origine','self_onboarding','email',v_email,'tenant_slug',v_slug,'ambiente','shared-saas','provisioning','automatico','richiesta_at',now()));

  return jsonb_build_object('ok',true,'azienda_id',v_azienda_id,'slug',v_slug,'ruolo','owner','already_exists',false);
end;
$function$;
