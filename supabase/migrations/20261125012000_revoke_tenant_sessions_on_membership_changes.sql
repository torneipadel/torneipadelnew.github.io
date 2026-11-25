-- Per-tenant session revocation: tokens issued before a membership revocation
-- remain unable to regain tenant access after reactivation.
alter table public.azienda_utenti
  add column if not exists session_revoked_at timestamptz;

create or replace function private.user_has_azienda(p_azienda_id uuid)
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

create or replace function private.can_manage_azienda(p_azienda_id uuid)
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
      and lower(coalesce(au.ruolo,'')) in ('owner','admin','superadmin')
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

create or replace function private.can_use_mercatino(p_azienda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select p_azienda_id is not null and exists (
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

create or replace function private.tenant_azienda_for_user()
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select min(au.azienda_id::text)::uuid
  from public.azienda_utenti au
  join public.aziende a on a.id=au.azienda_id
  where au.user_id=(select auth.uid())
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
  join public.aziende a on a.id=au.azienda_id
  where au.user_id=(select auth.uid())
    and au.attivo is true
    and (
      au.session_revoked_at is null
      or coalesce(nullif((select auth.jwt()->>'iat'), '')::bigint,0)
         > floor(extract(epoch from au.session_revoked_at))::bigint
    )
    and (
      a.stato='attiva'
      or a.stato='configurazione'
      or (a.tipo_account='societa_demo' and a.demo_scadenza is not null and now()<a.demo_scadenza)
    );
$function$;

create or replace function public.get_my_azienda_access(p_azienda_id uuid default null)
returns table(
  azienda_id uuid,nome_app text,slug text,tipo_account text,stato text,
  demo_inizio timestamptz,demo_scadenza timestamptz,accesso_consentito boolean,
  giorni_residui integer,ruolo text
)
language sql
security definer
set search_path = ''
as $function$
  select a.id,a.nome_app,a.slug,a.tipo_account,a.stato,a.demo_inizio,a.demo_scadenza,
    case when a.tipo_account='societa_demo' and a.demo_scadenza is not null then now()<a.demo_scadenza
         when a.stato in ('attiva','configurazione') then true else false end,
    case when a.tipo_account='societa_demo' and a.demo_scadenza is not null
         then greatest(0,ceil(extract(epoch from (a.demo_scadenza-now()))/86400.0))::integer else null end,
    au.ruolo
  from public.aziende a
  join public.azienda_utenti au on au.azienda_id=a.id
  where au.user_id=auth.uid()
    and au.attivo is true
    and (
      au.session_revoked_at is null
      or coalesce(nullif((select auth.jwt()->>'iat'), '')::bigint,0)
         > floor(extract(epoch from au.session_revoked_at))::bigint
    )
    and (p_azienda_id is null or a.id=p_azienda_id)
  order by case when p_azienda_id is not null and a.id=p_azienda_id then 0 else 1 end,a.created_at desc
  limit 1;
$function$;

create or replace function public.tenant_session_is_current(p_azienda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce(private.user_has_azienda(p_azienda_id),false);
$function$;
revoke all on function public.tenant_session_is_current(uuid) from public, anon;
grant execute on function public.tenant_session_is_current(uuid) to authenticated;

drop policy if exists azienda_members_select on public.azienda_utenti;
create policy azienda_members_select on public.azienda_utenti
for select to authenticated
using (
  (user_id=(select auth.uid()) and private.user_has_azienda(azienda_id))
  or private.can_manage_azienda(azienda_id)
);

drop policy if exists azienda_tenant_select on public.aziende;
create policy azienda_tenant_select on public.aziende
for select to authenticated
using (private.user_has_azienda(id));

drop policy if exists provisioning_owner_insert on public.provisioning_requests;
create policy provisioning_owner_insert on public.provisioning_requests
for insert to authenticated
with check (owner_user_id=(select auth.uid()) and private.can_manage_azienda(azienda_id));

drop policy if exists provisioning_owner_select on public.provisioning_requests;
create policy provisioning_owner_select on public.provisioning_requests
for select to authenticated
using (owner_user_id=(select auth.uid()) and private.can_manage_azienda(azienda_id));

drop policy if exists provisioning_owner_update on public.provisioning_requests;
create policy provisioning_owner_update on public.provisioning_requests
for update to authenticated
using (owner_user_id=(select auth.uid()) and private.can_manage_azienda(azienda_id))
with check (owner_user_id=(select auth.uid()) and private.can_manage_azienda(azienda_id));
