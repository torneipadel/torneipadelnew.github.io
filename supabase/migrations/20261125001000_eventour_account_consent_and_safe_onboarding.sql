-- Eventour account consent audit and safer tenant onboarding.
-- Consent records are private, append-only, and linked to the Auth account.

create table if not exists private.eventour_account_consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('privacy','terms')),
  document_version text not null,
  accepted_at timestamptz not null default now(),
  source text not null default 'signup',
  context jsonb not null default '{}'::jsonb,
  constraint eventour_account_consents_unique
    unique (user_id, consent_type, document_version)
);

alter table private.eventour_account_consents enable row level security;
alter table private.eventour_account_consents force row level security;
revoke all on table private.eventour_account_consents from public, anon, authenticated;

create or replace function public.capture_eventour_account_consents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_source text := left(coalesce(nullif(trim(v_meta->>'consent_source'), ''), 'signup'), 80);
begin
  if lower(coalesce(v_meta->>'privacy_accettata','false')) in ('true','1','on')
     and v_meta->>'privacy_version' = 'eventour-privacy-2026-11-25' then
    insert into private.eventour_account_consents
      (user_id, consent_type, document_version, source, context)
    values
      (new.id, 'privacy', 'eventour-privacy-2026-11-25', v_source,
       jsonb_build_object('account_type', left(coalesce(v_meta->>'account_type',''),40)))
    on conflict (user_id, consent_type, document_version) do nothing;
  end if;

  if lower(coalesce(v_meta->>'termini_accettati','false')) in ('true','1','on')
     and v_meta->>'terms_version' = 'eventour-terms-2026-11-25' then
    insert into private.eventour_account_consents
      (user_id, consent_type, document_version, source, context)
    values
      (new.id, 'terms', 'eventour-terms-2026-11-25', v_source,
       jsonb_build_object('account_type', left(coalesce(v_meta->>'account_type',''),40)))
    on conflict (user_id, consent_type, document_version) do nothing;
  end if;

  return new;
end;
$function$;

revoke all on function public.capture_eventour_account_consents() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_00_eventour_consents on auth.users;
create trigger on_auth_user_created_00_eventour_consents
  after insert on auth.users
  for each row execute function public.capture_eventour_account_consents();

create or replace function public.record_eventour_account_consents(
  p_privacy boolean,
  p_terms boolean,
  p_source text default 'signup'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_source text := case
    when p_source in ('registrazione-societa','registrazione-demo','registrazione-visitatore','login-visitatore') then p_source
    else 'signup'
  end;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if p_privacy is not true or p_terms is not true then
    raise exception 'CONSENT_REQUIRED' using errcode = '42501';
  end if;

  insert into private.eventour_account_consents
    (user_id, consent_type, document_version, source, context)
  values
    (v_uid, 'privacy', 'eventour-privacy-2026-11-25', v_source, jsonb_build_object('channel','web')),
    (v_uid, 'terms', 'eventour-terms-2026-11-25', v_source, jsonb_build_object('channel','web'))
  on conflict (user_id, consent_type, document_version) do nothing;

  return jsonb_build_object('ok',true,'privacy_version','eventour-privacy-2026-11-25','terms_version','eventour-terms-2026-11-25');
end;
$function$;

revoke all on function public.record_eventour_account_consents(boolean,boolean,text) from public, anon;
grant execute on function public.record_eventour_account_consents(boolean,boolean,text) to authenticated;

create or replace function public.crea_azienda_e_provisioning_nuovo_utente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
 v_meta jsonb:=coalesce(new.raw_user_meta_data,'{}'::jsonb);
 v_tipo text:=coalesce(v_meta->>'account_type','');
 v_nome_app text:=nullif(trim(v_meta->>'nome_app'),'');
 v_ragione text:=nullif(trim(v_meta->>'ragione_sociale'),'');
 v_slug_base text;
 v_slug text;
 v_azienda_id uuid;
 v_demo_inizio timestamptz;
 v_demo_scadenza timestamptz;
 v_app_url text:='https://torneipadel.github.io/torneipadelnew.github.io/';
begin
 if v_tipo not in ('societa','societa_demo') or v_nome_app is null or v_ragione is null then
   return new;
 end if;

 -- New companies are created only after the registration flow attests to both current documents.
 if lower(coalesce(v_meta->>'privacy_accettata','false')) not in ('true','1','on')
    or lower(coalesce(v_meta->>'termini_accettati','false')) not in ('true','1','on')
    or v_meta->>'privacy_version' is distinct from 'eventour-privacy-2026-11-25'
    or v_meta->>'terms_version' is distinct from 'eventour-terms-2026-11-25' then
   return new;
 end if;

 if exists(select 1 from public.aziende where owner_user_id=new.id) then
   return new;
 end if;

 v_slug_base:=lower(regexp_replace(v_nome_app,'[^a-zA-Z0-9]+','-','g'));
 v_slug_base:=trim(both '-' from v_slug_base);
 if v_slug_base='' then v_slug_base:='app'; end if;
 v_slug:=left(v_slug_base,80)||'-'||substr(replace(new.id::text,'-',''),1,8);

 if v_tipo='societa_demo' then
   v_demo_inizio:=now();
   v_demo_scadenza:=now()+interval '14 days';
 end if;

 insert into public.aziende(
   owner_user_id,ragione_sociale,nome_app,slug,sede,cf_piva,email,telefono,pec,titolare,
   colori,stato,tipo_account,demo_inizio,demo_scadenza
 )
 values(
   new.id,v_ragione,v_nome_app,v_slug,
   nullif(trim(v_meta->>'sede'),''),
   nullif(trim(v_meta->>'cf_piva'),''),
   coalesce(nullif(trim(v_meta->>'email_aziendale'),''),new.email),
   nullif(trim(v_meta->>'telefono'),''),
   nullif(trim(v_meta->>'pec'),''),
   nullif(trim(v_meta->>'titolare'),''),
   jsonb_build_object('primary','#073b72','accent','#ffe76b'),
   'configurazione',v_tipo,v_demo_inizio,v_demo_scadenza
 )
 returning id into v_azienda_id;

 insert into public.azienda_utenti(azienda_id,user_id,ruolo)
 values(v_azienda_id,new.id,'owner')
 on conflict do nothing;

 insert into public.provisioning_requests(
   owner_user_id,azienda_id,stato,repo_name,repo_url,app_url,supabase_project_ref,supabase_url,dettagli
 )
 values(
   new.id,v_azienda_id,'completata',
   'torneipadel/torneipadelnew.github.io',
   'https://github.com/torneipadel/torneipadelnew.github.io',
   v_app_url,
   'dkeqicstprvvfebiaooc',
   'https://dkeqicstprvvfebiaooc.supabase.co',
   jsonb_build_object(
     'origine',v_tipo,
     'email',new.email,
     'demo_giorni',case when v_tipo='societa_demo' then 14 else null end,
     'tenant_slug',v_slug,
     'ambiente','shared-saas',
     'provisioning','automatico',
     'richiesta_at',now()
   )
 );

 return new;
end
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
  values(v_uid,trim(p_ragione_sociale),trim(p_nome_app),v_slug,nullif(trim(p_sede),''),nullif(trim(p_cf_piva),''),coalesce(nullif(trim(p_email_aziendale,''),''),v_email),nullif(trim(p_telefono),''),nullif(trim(p_pec),''),nullif(trim(p_titolare),''),jsonb_build_object('primary','#073b72','accent','#ffe76b'),'configurazione',v_tipo,case when v_tipo='societa_demo' then now() else null end,case when v_tipo='societa_demo' then now()+interval '14 days' else null end)
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

create or replace function public.complete_visitor_membership(
  p_azienda_slug text,
  p_nome text default null,
  p_cognome text default null,
  p_telefono text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_azienda_id uuid;
  v_email text;
  v_role text;
  v_membership_active boolean;
  v_membership_found boolean;
  v_created_at timestamptz;
begin
  if v_uid is null then
    raise exception 'devi essere autenticato.';
  end if;

  select created_at into v_created_at from auth.users where id=v_uid;
  if v_created_at >= timestamptz '2026-11-25 00:00:00+00'
     and (
       not exists(select 1 from private.eventour_account_consents c where c.user_id=v_uid and c.consent_type='privacy' and c.document_version='eventour-privacy-2026-11-25')
       or not exists(select 1 from private.eventour_account_consents c where c.user_id=v_uid and c.consent_type='terms' and c.document_version='eventour-terms-2026-11-25')
     ) then
    raise exception 'CONSENT_REQUIRED';
  end if;

  select a.id into v_azienda_id
  from public.aziende a
  where a.stato = 'attiva'
    and lower(a.slug) = lower(trim(p_azienda_slug))
  limit 1;

  if v_azienda_id is null then
    raise exception 'società non trovata o non attiva.';
  end if;

  select au.ruolo, au.attivo
    into v_role, v_membership_active
  from public.azienda_utenti au
  where au.azienda_id = v_azienda_id
    and au.user_id = v_uid;

  v_membership_found := found;

  if v_membership_found and coalesce(v_membership_active, false) = false then
    raise exception 'appartenenza non attiva: contatta il proprietario della società.';
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = v_uid;

  insert into public.profili(user_id, nome, cognome, telefono, email, ruolo, updated_at)
  values (
    v_uid,
    nullif(trim(p_nome), ''),
    nullif(trim(p_cognome), ''),
    nullif(trim(p_telefono), ''),
    v_email,
    'user',
    now()
  )
  on conflict (user_id) do update set
    nome = coalesce(nullif(trim(p_nome), ''), public.profili.nome),
    cognome = coalesce(nullif(trim(p_cognome), ''), public.profili.cognome),
    telefono = coalesce(nullif(trim(p_telefono), ''), public.profili.telefono),
    email = coalesce(v_email, public.profili.email),
    updated_at = now();

  if not v_membership_found then
    insert into public.azienda_utenti(azienda_id, user_id, ruolo, attivo)
    values (v_azienda_id, v_uid, 'user', true);
    v_role := 'user';
  end if;

  return jsonb_build_object('ok', true, 'azienda_id', v_azienda_id, 'ruolo', v_role);
end;
$function$;

revoke all on function public.record_eventour_account_consents(boolean,boolean,text) from public, anon;
