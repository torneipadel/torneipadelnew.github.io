-- Public tournament boards expose only first initial + surname, never full first names.
create or replace function public.get_public_iscrizioni(p_torneo_id bigint)
returns table(
  id bigint,
  torneo_id bigint,
  nome_giocatore text,
  nome text,
  cognome text,
  categoria text,
  stato text,
  approvato boolean,
  data_iscrizione timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    i.id,
    i.torneo_id,
    case
      when nullif(trim(i.nome),'') is not null and nullif(trim(i.cognome),'') is not null
        then upper(left(trim(i.nome),1)) || '.' || trim(i.cognome)
      when nullif(trim(i.cognome),'') is not null
        then trim(i.cognome)
      else null
    end as nome_giocatore,
    case when nullif(trim(i.nome),'') is not null then upper(left(trim(i.nome),1)) else null end as nome,
    nullif(trim(i.cognome),'') as cognome,
    i.categoria,
    i.stato,
    i.approvato,
    i.data_iscrizione
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
