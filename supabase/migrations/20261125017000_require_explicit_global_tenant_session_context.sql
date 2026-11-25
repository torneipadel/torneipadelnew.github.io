-- Global platform Superadmin must explicitly enter a tenant context before any tenant RLS access.
create table if not exists private.user_tenant_context (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  azienda_id uuid not null references public.aziende(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  primary key (user_id,session_id)
);
create index if not exists idx_user_tenant_context_azienda on private.user_tenant_context(azienda_id);
alter table private.user_tenant_context enable row level security;
revoke all on table private.user_tenant_context from public,anon,authenticated;

create or replace function private.has_active_membership(p_azienda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.azienda_utenti au
    join public.aziende a on a.id=au.azienda_id
    where au.azienda_id=p_azienda_id
      and au.user_id=(select auth.uid())
      and au.attivo is true
      and (
        au.session_revoked_at is null
        or coalesce(nullif((select auth.jwt()->>'iat'), '')::bigint,0)
           > floor(extract(epoch from au.session_revoked_at))::bigint
      )
      and (
        a.stato in ('attiva','configurazione')
        or (a.tipo_account='societa_demo' and a.demo_scadenza is not null and now()<a.demo_scadenza)
      )
  );
$function$;

create or replace function private.has_global_tenant_context(p_azienda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    not coalesce(public.is_superadmin(),false)
    or exists (
      select 1
      from private.user_tenant_context c
      where c.user_id=(select auth.uid())
        and c.session_id=nullif((select auth.jwt()->>'session_id'),'')::uuid
        and c.azienda_id=p_azienda_id
        and c.expires_at>now()
    );
$function$;

create or replace function private.user_has_azienda(p_azienda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(private.has_active_membership(p_azienda_id),false)
     and coalesce(private.has_global_tenant_context(p_azienda_id),false);
$function$;

create or replace function private.can_manage_azienda(p_azienda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(private.user_has_azienda(p_azienda_id),false)
     and exists (
       select 1 from public.azienda_utenti au
       where au.azienda_id=p_azienda_id
         and au.user_id=(select auth.uid())
         and au.attivo is true
         and lower(coalesce(au.ruolo,'')) in ('owner','admin','superadmin')
     );
$function$;

create or replace function private.can_use_mercatino(p_azienda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(private.user_has_azienda(p_azienda_id),false);
$function$;

create or replace function private.tenant_azienda_for_user()
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select min(au.azienda_id::text)::uuid
  from public.azienda_utenti au
  where au.user_id=(select auth.uid())
    and au.attivo is true
    and private.user_has_azienda(au.azienda_id)
  having count(distinct au.azienda_id)=1;
$function$;

create or replace function private.user_azienda_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select au.azienda_id
  from public.azienda_utenti au
  where au.user_id=(select auth.uid())
    and au.attivo is true
    and private.user_has_azienda(au.azienda_id);
$function$;

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
revoke all on function public.set_my_tenant_context(uuid) from public,anon;
grant execute on function public.set_my_tenant_context(uuid) to authenticated;

create or replace function public.clear_my_tenant_context()
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_session_id uuid := nullif(auth.jwt()->>'session_id','')::uuid;
begin
  if v_uid is null or v_session_id is null then return true; end if;
  delete from private.user_tenant_context
  where user_id=v_uid and session_id=v_session_id;
  return true;
end;
$function$;
revoke all on function public.clear_my_tenant_context() from public,anon;
grant execute on function public.clear_my_tenant_context() to authenticated;

revoke all on function private.has_active_membership(uuid) from public,anon,authenticated;
revoke all on function private.has_global_tenant_context(uuid) from public,anon,authenticated;
