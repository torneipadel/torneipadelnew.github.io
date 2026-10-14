-- Public tournament RPC must not expose tournaments belonging to inactive companies.
-- Keep the existing tenant filter, publication filter, and recursive JSON sanitizer.
CREATE OR REPLACE FUNCTION public.get_public_tornei(p_torneo_id bigint DEFAULT NULL::bigint, p_azienda_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id bigint, nome text, data date, descrizione text, posti integer, stato text, created_at timestamp with time zone, configurazione jsonb, pubblicato boolean, formula text, iscrizioni_chiuse boolean, data_torneo date, ora_inizio time without time zone, updated_at timestamp with time zone, azienda_id uuid)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT t.id,t.nome,t.data,t.descrizione,t.posti,t.stato,t.created_at,
    private.sanitize_public_tournament_json(t.id,t.configurazione),
    t.pubblicato,t.formula,t.iscrizioni_chiuse,t.data_torneo,t.ora_inizio,t.updated_at,t.azienda_id
  FROM public.tornei t
  JOIN public.aziende a ON a.id = t.azienda_id AND a.stato = 'attiva'
  WHERE t.pubblicato IS TRUE
    AND p_azienda_id IS NOT NULL
    AND t.azienda_id = p_azienda_id
    AND (p_torneo_id IS NULL OR t.id = p_torneo_id)
  ORDER BY t.data ASC NULLS LAST, t.id;
$function$;
