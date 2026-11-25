create or replace function public.set_my_tenant_context(p_azienda_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_session_id uuid := nullif(auth.jwt()->>'session_id','')::uuid;
begin
  if v_uid is null or v_session_id is null then
    raise exception 'SESSION_REQUIRED';
  end if;
  if not coalesce(private.eventour_mfa_access_ok(),false) then
    raise exception 'MFA_REQUIRED';
  end if;
  if not private.has_active_membership(p_azienda_id) then
    raise exception 'TENANT_MEMBERSHIP_REQUIRED';
  end if;
  if coalesce(public.is_superadmin(),false) then
    insert into private.user_tenant_context(user_id,session_id,azienda_id,created_at,expires_at)
    values(v_uid,v_session_id,p_azienda_id,now(),now()+interval '24 hours')
    on conflict(user_id,session_id) do update
      set azienda_id=excluded.azienda_id,created_at=now(),expires_at=now()+interval '24 hours';
  end if;
  return true;
end;
$function$;