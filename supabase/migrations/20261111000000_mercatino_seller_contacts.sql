-- Mercatino: consenti ai membri attivi di gestire esclusivamente i propri annunci
-- e restituisci i recapiti solo per gli annunci pubblicati e disponibili.

create or replace function private.can_use_mercatino(p_azienda_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_azienda_id is not null and exists (
    select 1
    from public.azienda_utenti au
    join public.aziende a on a.id = au.azienda_id
    where au.azienda_id = p_azienda_id
      and au.user_id = (select auth.uid())
      and au.attivo is true
      and (
        a.stato in ('attiva','configurazione')
        or (a.tipo_account = 'societa_demo' and a.demo_scadenza is not null and now() < a.demo_scadenza)
      )
  );
$$;

revoke all on function private.can_use_mercatino(uuid) from public, anon;
grant execute on function private.can_use_mercatino(uuid) to authenticated;

drop policy if exists mercatino_tenant_select on public.mercatino;
create policy mercatino_tenant_select on public.mercatino
for select to authenticated
using (
  private.can_manage_azienda(azienda_id)
  or (created_by = (select auth.uid()) and private.can_use_mercatino(azienda_id))
);

drop policy if exists mercatino_tenant_insert on public.mercatino;
create policy mercatino_tenant_insert on public.mercatino
for insert to authenticated
with check (
  private.can_manage_azienda(azienda_id)
  or (created_by = (select auth.uid()) and private.can_use_mercatino(azienda_id))
);

drop policy if exists mercatino_tenant_update on public.mercatino;
create policy mercatino_tenant_update on public.mercatino
for update to authenticated
using (
  private.can_manage_azienda(azienda_id)
  or (created_by = (select auth.uid()) and private.can_use_mercatino(azienda_id))
)
with check (
  private.can_manage_azienda(azienda_id)
  or (created_by = (select auth.uid()) and private.can_use_mercatino(azienda_id))
);

drop policy if exists mercatino_tenant_delete on public.mercatino;
create policy mercatino_tenant_delete on public.mercatino
for delete to authenticated
using (
  private.can_manage_azienda(azienda_id)
  or (created_by = (select auth.uid()) and private.can_use_mercatino(azienda_id))
);

create or replace function public.get_public_company_mercatino_v2(p_slug text)
returns table(
  id bigint, titolo text, categoria text, categoria_label text, anteprima text,
  descrizione text, prezzo text, condizioni text, immagine text, locandina text,
  contatto text, telefono text, nome_cognome text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  select m.id, m.titolo, m.categoria, m.categoria_label, m.anteprima,
         m.descrizione, m.prezzo, m.condizioni, m.immagine, m.locandina,
         m.contatto, m.telefono, m.nome_cognome, m.created_at
  from public.mercatino m
  join public.aziende a on a.id = m.azienda_id
  where a.stato = 'attiva'
    and lower(a.slug) = lower(trim(p_slug))
    and m.pubblicato is true
    and lower(coalesce(m.stato,'')) = 'disponibile'
  order by m.created_at desc;
$function$;

create or replace function public.get_public_company_mercatino(p_slug text)
returns table(
  id bigint, titolo text, categoria text, categoria_label text, anteprima text,
  descrizione text, prezzo text, condizioni text, immagine text, contatto text,
  telefono text, nome_cognome text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  select m.id, m.titolo, m.categoria, m.categoria_label, m.anteprima,
         m.descrizione, m.prezzo, m.condizioni, m.immagine,
         m.contatto, m.telefono, m.nome_cognome, m.created_at
  from public.mercatino m
  join public.aziende a on a.id = m.azienda_id
  where a.stato = 'attiva'
    and lower(a.slug) = lower(trim(p_slug))
    and m.pubblicato is true
    and lower(coalesce(m.stato,'')) = 'disponibile'
  order by m.created_at desc;
$function$;
