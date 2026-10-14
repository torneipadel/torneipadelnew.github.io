create or replace function public.update_visitor_profile(
  p_livello text default null,
  p_alias text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Devi essere autenticato.';
  end if;

  if not exists (
    select 1
    from public.azienda_utenti au
    join public.aziende a on a.id = au.azienda_id
    where au.user_id = v_uid
      and au.attivo = true
      and au.ruolo = 'user'
      and a.stato = 'attiva'
  ) then
    raise exception 'Profilo visitatore non autorizzato.';
  end if;

  update public.profili p
  set livello = nullif(trim(p_livello), ''),
      alias = nullif(trim(p_alias), ''),
      note = nullif(trim(p_note), ''),
      updated_at = now()
  where p.user_id = v_uid
    and lower(coalesce(p.ruolo, 'user')) = 'user';

  if not found then
    raise exception 'Profilo visitatore non trovato.';
  end if;

  return jsonb_build_object('ok', true);
end;
$function$;

revoke all on function public.update_visitor_profile(text, text, text) from public, anon;
grant execute on function public.update_visitor_profile(text, text, text) to authenticated;
