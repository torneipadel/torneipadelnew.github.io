-- Require an AAL2 session for privileged Eventour administrator actions.
-- Apply only after all existing administrators have enrolled and verified TOTP.
-- Read-only membership discovery (get_my_azienda_access) intentionally remains available at AAL1.

create or replace function private.can_manage_azienda(p_azienda_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select (select auth.jwt() ->> 'aal') = 'aal2'
    and exists (
      select 1
      from public.azienda_utenti au
      join public.aziende a on a.id = au.azienda_id
      where au.azienda_id = p_azienda_id
        and au.user_id = (select auth.uid())
        and au.attivo = true
        and lower(coalesce(au.ruolo,'')) in ('owner','admin','superadmin')
        and (
          a.stato in ('attiva','configurazione')
          or (a.tipo_account = 'societa_demo' and a.demo_scadenza is not null and now() < a.demo_scadenza)
        )
    );
$function$;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select (select auth.jwt() ->> 'aal') = 'aal2'
    and exists (
      select 1
      from public.profili p
      where p.user_id = (select auth.uid())
        and (
          lower(coalesce(p.ruolo,'')) = 'superadmin'
          or (
            lower(coalesce(p.ruolo,'')) = 'admin'
            and not exists (
              select 1
              from public.azienda_utenti au
              where au.user_id = (select auth.uid())
                and au.attivo = true
            )
          )
        )
    );
$function$;

create or replace function public.is_admin_or_superadmin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select (select auth.jwt() ->> 'aal') = 'aal2'
    and public.admin_role() in ('admin','superadmin');
$function$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select (select auth.jwt() ->> 'aal') = 'aal2'
    and public.admin_role() = 'superadmin';
$function$;
