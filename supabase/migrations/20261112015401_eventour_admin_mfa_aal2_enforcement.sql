-- Enforce AAL2 for Eventour privileged accounts without forcing MFA on visitors.
create or replace function private.eventour_mfa_required()
returns boolean
language sql stable security definer set search_path = ''
as $function$
  select
    lower(coalesce((select p.ruolo from public.profili p where p.user_id=(select auth.uid()) limit 1),'user')) in ('admin','superadmin')
    or exists(select 1 from public.azienda_utenti au where au.user_id=(select auth.uid()) and au.attivo is true and lower(au.ruolo) in ('owner','admin','superadmin'))
    or exists(select 1 from public.aziende a where a.owner_user_id=(select auth.uid()))
    or lower(coalesce((select auth.jwt()->>'email'),''))='giose.rizzi@gmail.com';
$function$;

create or replace function private.eventour_mfa_access_ok()
returns boolean
language sql stable security definer set search_path = ''
as $function$
  select not private.eventour_mfa_required()
    or coalesce((select auth.jwt()->>'aal'),'aal1')='aal2';
$function$;

revoke all on function private.eventour_mfa_required() from public, anon;
revoke all on function private.eventour_mfa_access_ok() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.eventour_mfa_required() to authenticated;
grant execute on function private.eventour_mfa_access_ok() to authenticated;

comment on function private.eventour_mfa_required() is
  'True when the current Eventour account has a privileged admin, superadmin, or company-owner role.';
comment on function private.eventour_mfa_access_ok() is
  'Restrictive RLS gate: privileged Eventour accounts require JWT aal2; ordinary visitor accounts are not forced to enroll MFA.';

do $migration$
declare
  t text;
  tables text[] := array[
    'tornei','iscrizioni','news','sponsor','mercatino','privacy_settings',
    'system_config','admin_audit_log','tornei_admin_backup','admin_data_backup',
    'code_backup_registry','code_restore_requests','project_complete_backup_registry',
    'aziende','provisioning_requests','eventour_company_plans','eventour_plans'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists eventour_mfa_aal2_gate on public.%I',t);
    execute format('create policy eventour_mfa_aal2_gate on public.%I as restrictive for all to authenticated using (private.eventour_mfa_access_ok()) with check (private.eventour_mfa_access_ok())',t);
  end loop;
end
$migration$;
