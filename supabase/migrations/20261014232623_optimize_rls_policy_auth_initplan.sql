-- Evaluate auth helpers once per statement in RLS policies without changing access semantics.
ALTER POLICY "lettura profili utenti autenticati" ON public.profili
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Aggiornamento profilo personale" ON public.profili
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY sponsor_public_read ON public.sponsor
  USING (((SELECT auth.role()) = 'anon'::text) OR private.can_manage_azienda(azienda_id));

ALTER POLICY news_public_read ON public.news
  USING ((((SELECT auth.role()) = 'anon'::text) AND pubblicata = true) OR private.can_manage_azienda(azienda_id));

ALTER POLICY mercatino_public_read ON public.mercatino
  USING ((((SELECT auth.role()) = 'anon'::text) AND pubblicato = true AND lower(stato) = 'disponibile'::text) OR private.can_manage_azienda(azienda_id));

ALTER POLICY azienda_owner_insert ON public.aziende
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

ALTER POLICY provisioning_owner_select ON public.provisioning_requests
  USING (owner_user_id = (SELECT auth.uid()));

ALTER POLICY provisioning_owner_insert ON public.provisioning_requests
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

ALTER POLICY provisioning_owner_update ON public.provisioning_requests
  USING (owner_user_id = (SELECT auth.uid()))
  WITH CHECK (owner_user_id = (SELECT auth.uid()));
