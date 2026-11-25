-- Avoid orphan company rows for signups that never confirm their email.
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

 if new.email_confirmed_at is null then
   return new;
 end if;

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

drop trigger if exists on_auth_user_confirmed_company on auth.users;
create trigger on_auth_user_confirmed_company
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function public.crea_azienda_e_provisioning_nuovo_utente();
