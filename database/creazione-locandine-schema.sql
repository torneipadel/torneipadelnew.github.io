-- Schema required by "Creazione Locandine & Articoli".
-- Additive only: preserves the original article/product images.
alter table public.news add column if not exists locandina text;
alter table public.mercatino add column if not exists locandina text;

create or replace function public.get_public_company_news_v2(p_slug text)
returns table(id bigint, titolo text, testo text, immagine text, locandina text, pubblicata boolean, created_at timestamptz, tipo text, link text, in_evidenza boolean, ordine integer, torneo_id bigint)
language sql stable security definer set search_path to ''
as $function$
  select n.id,n.titolo,n.testo,n.immagine,n.locandina,n.pubblicata,n.created_at,n.tipo,n.link,n.in_evidenza,n.ordine,n.torneo_id
  from public.news n
  join public.aziende a on a.id=n.azienda_id
  where a.stato='attiva'
    and lower(a.slug)=lower(trim(p_slug))
    and n.pubblicata is true
  order by n.in_evidenza desc nulls last,n.ordine asc nulls last,n.created_at desc
  limit 30;
$function$;
revoke all on function public.get_public_company_news_v2(text) from public;
grant execute on function public.get_public_company_news_v2(text) to anon, authenticated;

create or replace function public.get_public_company_mercatino_v2(p_slug text)
returns table(id bigint, titolo text, categoria text, categoria_label text, anteprima text, descrizione text, prezzo text, condizioni text, immagine text, locandina text, contatto text, telefono text, nome_cognome text, created_at timestamptz)
language sql stable security definer set search_path to ''
as $function$
  select m.id,m.titolo,m.categoria,m.categoria_label,m.anteprima,m.descrizione,m.prezzo,m.condizioni,m.immagine,m.locandina,m.contatto,m.telefono,m.nome_cognome,m.created_at
  from public.mercatino m
  join public.aziende a on a.id=m.azienda_id
  where a.stato='attiva'
    and lower(a.slug)=lower(trim(p_slug))
    and m.pubblicato is true
    and lower(coalesce(m.stato,''))='disponibile'
  order by m.created_at desc;
$function$;
revoke all on function public.get_public_company_mercatino_v2(text) from public;
grant execute on function public.get_public_company_mercatino_v2(text) to anon, authenticated;

notify pgrst, 'reload schema';
