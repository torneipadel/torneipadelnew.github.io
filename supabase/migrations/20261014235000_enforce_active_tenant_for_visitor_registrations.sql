-- Ensure public tournament roster entries belong to the same tenant as the tournament.
-- Require active tenant membership for visitor access to their own registrations.
create or replace function public.get_public_iscrizioni(p_torneo_id bigint)
returns table(id bigint, torneo_id bigint, nome_giocatore text, nome text, cognome text, categoria text, stato text, approvato boolean, data_iscrizione timestamptz)
language sql stable security definer set search_path=''
as $function$
  select i.id, i.torneo_id, i.nome_giocatore, i.nome, i.cognome, i.categoria, i.stato, i.approvato, i.data_iscrizione
  from public.iscrizioni i
  join public.tornei t on t.id=i.torneo_id
  join public.aziende a on a.id=t.azienda_id
  where p_torneo_id is not null
    and i.torneo_id=p_torneo_id
    and i.azienda_id=t.azienda_id
    and t.pubblicato is true
    and a.stato='attiva'
    and (i.approvato is true or lower(coalesce(i.stato,''))='approvato')
  order by i.id;
$function$;

drop policy if exists iscrizioni_tenant_select on public.iscrizioni;
create policy iscrizioni_tenant_select on public.iscrizioni
for select to authenticated
using (
  (user_id=(select auth.uid()) and azienda_id is not null and private.user_has_azienda(azienda_id))
  or private.can_manage_azienda(azienda_id)
);

drop policy if exists iscrizioni_tenant_insert on public.iscrizioni;
create policy iscrizioni_tenant_insert on public.iscrizioni
for insert to authenticated
with check (
  private.can_manage_azienda(azienda_id)
  or (
    user_id=(select auth.uid())
    and private.user_has_azienda(azienda_id)
    and private.torneo_belongs_to_azienda(torneo_id,azienda_id)
  )
);

drop policy if exists iscrizioni_tenant_update on public.iscrizioni;
create policy iscrizioni_tenant_update on public.iscrizioni
for update to authenticated
using (
  private.can_manage_azienda(azienda_id)
  or (
    user_id=(select auth.uid())
    and private.user_has_azienda(azienda_id)
    and private.torneo_belongs_to_azienda(torneo_id,azienda_id)
  )
)
with check (
  private.can_manage_azienda(azienda_id)
  or (
    user_id=(select auth.uid())
    and private.user_has_azienda(azienda_id)
    and private.torneo_belongs_to_azienda(torneo_id,azienda_id)
  )
);
