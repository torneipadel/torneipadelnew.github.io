-- Require AAL2 inside SECURITY DEFINER administrative RPCs.
create or replace function private.assert_eventour_mfa()
returns void
language plpgsql security definer set search_path = ''
as $function$
begin
  if private.eventour_mfa_required()
     and coalesce((select auth.jwt()->>'aal'),'aal1') <> 'aal2' then
    raise exception 'Verifica MFA richiesta per questa operazione amministrativa.' using errcode='42501';
  end if;
end;
$function$;

revoke all on function private.assert_eventour_mfa() from public, anon;
grant execute on function private.assert_eventour_mfa() to authenticated;

do $mfa_guard$
declare
  f record;
  patched text;
  expected_names text[] := array[
    'admin_monitor_snapshot','eventour_superadmin_create_company',
    'eventour_superadmin_mark_code_version','eventour_superadmin_overview',
    'eventour_superadmin_save_plan','eventour_superadmin_set_company_plan',
    'eventour_superadmin_update_company','eventour_superadmin_update_member',
    'publish_my_company','superadmin_list_data_backup_metadata',
    'superadmin_list_technical_audit','superadmin_list_tournament_backup_metadata',
    'superadmin_request_code_restore','superadmin_restore_data_backup',
    'superadmin_restore_torneo','update_my_azienda_config'
  ];
  found_count integer := 0;
begin
  for f in
    select p.oid,p.proname,pg_get_functiondef(p.oid) as definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and p.proname=any(expected_names)
      and p.prolang=(select oid from pg_language where lanname='plpgsql')
  loop
    found_count:=found_count+1;
    if position('private.assert_eventour_mfa()' in f.definition)=0 then
      patched:=regexp_replace(f.definition,'\mBEGIN\M',E'BEGIN\n  PERFORM private.assert_eventour_mfa();','i');
      if patched=f.definition then raise exception 'Impossibile inserire il controllo MFA nella funzione %',f.proname; end if;
      execute patched;
    end if;
  end loop;
  if found_count<16 then raise exception 'Controllo MFA SQL incompleto: trovate soltanto % funzioni.',found_count; end if;
end
$mfa_guard$;
