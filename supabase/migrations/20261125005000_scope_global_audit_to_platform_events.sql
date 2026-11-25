-- The global Superadmin audit feed contains platform events only, never tenant activity.
create or replace function public.superadmin_list_technical_audit()
returns table(id bigint, action text, entity_type text, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform private.assert_eventour_mfa();
  if auth.uid() is null or not public.is_superadmin() then
    raise exception 'Superadmin only' using errcode = '42501';
  end if;

  return query
    select a.id, a.action, a.entity_type, a.created_at
    from public.admin_audit_log a
    where lower(coalesce(a.entity_type,'')) in ('platform','technical','deployment','code_backup','project_backup','security')
       or lower(coalesce(a.action,'')) like 'technical.%'
       or lower(coalesce(a.action,'')) like 'platform.%'
    order by a.created_at desc
    limit 100;
end;
$function$;
