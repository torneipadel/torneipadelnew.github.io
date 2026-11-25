-- Preserve the existing publication rule: an announcement is public only with explicit contact consent.
CREATE OR REPLACE FUNCTION public.get_public_company_mercatino(p_slug text)
 RETURNS TABLE(id bigint, titolo text, categoria text, categoria_label text, anteprima text, descrizione text, prezzo text, condizioni text, immagine text, contatto text, telefono text, nome_cognome text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.id,m.titolo,m.categoria,m.categoria_label,m.anteprima,m.descrizione,
         m.prezzo,m.condizioni,m.immagine,
         case when m.contatto_pubblico_consenso is true then m.contatto else null end,
         case when m.contatto_pubblico_consenso is true then m.telefono else null end,
         null::text,m.created_at
  from public.mercatino m
  join public.aziende a on a.id=m.azienda_id
  where a.stato='attiva'
    and lower(a.slug)=lower(trim(p_slug))
    and m.pubblicato is true
    and m.contatto_pubblico_consenso is true
    and (nullif(btrim(m.contatto),'') is not null or nullif(btrim(m.telefono),'') is not null)
    and lower(coalesce(m.stato,''))='disponibile'
  order by m.created_at desc;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_company_mercatino_v2(p_slug text)
 RETURNS TABLE(id bigint, titolo text, categoria text, categoria_label text, anteprima text, descrizione text, prezzo text, condizioni text, immagine text, locandina text, contatto text, telefono text, nome_cognome text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.id,m.titolo,m.categoria,m.categoria_label,m.anteprima,m.descrizione,
         m.prezzo,m.condizioni,m.immagine,m.locandina,
         case when m.contatto_pubblico_consenso is true then m.contatto else null end,
         case when m.contatto_pubblico_consenso is true then m.telefono else null end,
         null::text,m.created_at
  from public.mercatino m
  join public.aziende a on a.id=m.azienda_id
  where a.stato='attiva'
    and lower(a.slug)=lower(trim(p_slug))
    and m.pubblicato is true
    and m.contatto_pubblico_consenso is true
    and (nullif(btrim(m.contatto),'') is not null or nullif(btrim(m.telefono),'') is not null)
    and lower(coalesce(m.stato,''))='disponibile'
  order by m.created_at desc;
$function$;