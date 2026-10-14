-- Prevent the public visitor-membership flow from reactivating a disabled
-- membership. In particular, it must never restore a previously disabled
-- owner/admin/superadmin tenant role without explicit owner-side action.
create or replace function public.complete_visitor_membership(
  p_azienda_slug text,
  p_nome text default null,
  p_cognome text default null,
  p_telefono text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_azienda_id uuid;
  v_email text;
  v_role text;
  v_membership_active boolean;
  v_membership_found boolean;
begin
  if v_uid is null then
    raise exception 'Devi essere autenticato.';
  end if;

  select a.id into v_azienda_id
  from public.aziende a
  where a.stato = 'attiva'
    and lower(a.slug) = lower(trim(p_azienda_slug))
  limit 1;

  if v_azienda_id is null then
    raise exception 'Società non trovata o non attiva.';
  end if;

  select au.ruolo, au.attivo
    into v_role, v_membership_active
  from public.azienda_utenti au
  where au.azienda_id = v_azienda_id
    and au.user_id = v_uid;

  v_membership_found := found;

  if v_membership_found and coalesce(v_membership_active, false) = false then
    raise exception 'Appartenenza non attiva: contatta il proprietario della società.';
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = v_uid;

  insert into public.profili(user_id, nome, cognome, telefono, email, ruolo, updated_at)
  values (
    v_uid,
    nullif(trim(p_nome), ''),
    nullif(trim(p_cognome), ''),
    nullif(trim(p_telefono), ''),
    v_email,
    'user',
    now()
  )
  on conflict (user_id) do update set
    nome = coalesce(nullif(trim(p_nome), ''), public.profili.nome),
    cognome = coalesce(nullif(trim(p_cognome), ''), public.profili.cognome),
    telefono = coalesce(nullif(trim(p_telefono), ''), public.profili.telefono),
    email = coalesce(v_email, public.profili.email),
    updated_at = now();

  if not v_membership_found then
    insert into public.azienda_utenti(azienda_id, user_id, ruolo, attivo)
    values (v_azienda_id, v_uid, 'user', true);
    v_role := 'user';
  end if;

  return jsonb_build_object('ok', true, 'azienda_id', v_azienda_id, 'ruolo', v_role);
end;
$function$;
