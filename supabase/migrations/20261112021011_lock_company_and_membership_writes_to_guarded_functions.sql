-- Restrict direct company and membership writes to validated server-side functions.
do $company_rpc$
declare v_def text; v_new text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='update_my_azienda_config'
    and pg_get_function_identity_arguments(p.oid)='p_azienda_id uuid, p_payload jsonb' limit 1;
  if v_def is null then raise exception 'update_my_azienda_config non trovata'; end if;
  if position('dpo = coalesce(p_payload->>''dpo'', dpo)' in v_def)=0 then
    v_new:=replace(v_def,'pec = coalesce(p_payload->>''pec'', pec),','pec = coalesce(p_payload->>''pec'', pec),'||E'\n    dpo = coalesce(p_payload->>''dpo'', dpo),');
    if v_new=v_def then raise exception 'Impossibile estendere update_my_azienda_config per dpo'; end if;
    execute v_new;
  end if;
end
$company_rpc$;

drop policy if exists azienda_owner_member_insert on public.azienda_utenti;
drop policy if exists azienda_owner_insert on public.aziende;
drop policy if exists azienda_owner_update on public.aziende;

revoke insert,update on table public.azienda_utenti from authenticated;
revoke insert,update on table public.aziende from authenticated;

do $revoke_columns$
declare v_cols text;
begin
  select string_agg(format('%I',column_name),',') into v_cols
  from information_schema.column_privileges
  where table_schema='public' and table_name='azienda_utenti' and grantee='authenticated' and privilege_type='INSERT';
  if v_cols is not null then execute 'revoke insert ('||v_cols||') on table public.azienda_utenti from authenticated'; end if;
  select string_agg(format('%I',column_name),',') into v_cols
  from information_schema.column_privileges
  where table_schema='public' and table_name='azienda_utenti' and grantee='authenticated' and privilege_type='UPDATE';
  if v_cols is not null then execute 'revoke update ('||v_cols||') on table public.azienda_utenti from authenticated'; end if;
  select string_agg(format('%I',column_name),',') into v_cols
  from information_schema.column_privileges
  where table_schema='public' and table_name='aziende' and grantee='authenticated' and privilege_type='INSERT';
  if v_cols is not null then execute 'revoke insert ('||v_cols||') on table public.aziende from authenticated'; end if;
  select string_agg(format('%I',column_name),',') into v_cols
  from information_schema.column_privileges
  where table_schema='public' and table_name='aziende' and grantee='authenticated' and privilege_type='UPDATE';
  if v_cols is not null then execute 'revoke update ('||v_cols||') on table public.aziende from authenticated'; end if;
end
$revoke_columns$;

comment on table public.azienda_utenti is 'Membership writes are performed only by validated server-side functions; direct authenticated INSERT/UPDATE is disabled.';
comment on table public.aziende is 'Company creation and configuration writes are performed only by MFA-guarded server-side functions.';
