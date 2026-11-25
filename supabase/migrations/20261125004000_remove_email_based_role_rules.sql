-- Role authorization is based on protected roles and tenant memberships, never email allowlists.
create or replace function public.proteggi_ruoli_amministrativi()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_auth_email text;
  v_global_superadmin boolean := coalesce(public.is_superadmin(), false);
begin
  select lower(u.email) into v_auth_email
  from auth.users u
  where u.id = new.user_id;

  if v_auth_email is null then
    raise exception 'Utente autenticato non trovato';
  end if;

  new.email := v_auth_email;

  if lower(coalesce(new.ruolo,'')) not in ('user','admin','superadmin') then
    raise exception 'Ruolo non valido';
  end if;

  if tg_op = 'INSERT' then
    if lower(coalesce(new.ruolo,'')) in ('admin','superadmin') and not v_global_superadmin then
      raise exception 'Solo un Superadmin globale può assegnare ruoli globali';
    end if;
  elsif new.ruolo is distinct from old.ruolo and not v_global_superadmin then
    raise exception 'Modifica del ruolo globale non autorizzata';
  end if;

  return new;
end;
$function$;

create or replace function private.eventour_mfa_required()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    lower(coalesce((
      select p.ruolo
      from public.profili p
      where p.user_id = (select auth.uid())
      limit 1
    ), 'user')) in ('admin', 'superadmin')
    or exists (
      select 1
      from public.azienda_utenti au
      where au.user_id = (select auth.uid())
        and au.attivo is true
        and lower(au.ruolo) in ('owner', 'admin', 'superadmin')
    )
    or exists (
      select 1
      from public.aziende a
      where a.owner_user_id = (select auth.uid())
    );
$function$;
