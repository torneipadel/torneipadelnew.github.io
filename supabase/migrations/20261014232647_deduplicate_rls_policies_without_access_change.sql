-- Remove redundant/deny-only policies and scope public-read policies to the anon role.
-- Effective row access remains unchanged: authenticated tenant access stays in the tenant policies.
DROP POLICY IF EXISTS "Superadmin read code registry" ON public.code_backup_registry;
DROP POLICY IF EXISTS "eventour company plans superadmin all" ON public.eventour_company_plans;
DROP POLICY IF EXISTS "Superadmin gestione profili" ON public.profili;
DROP POLICY IF EXISTS "Superadmin inserimento profili" ON public.profili;
DROP POLICY IF EXISTS "Superadmin lettura profili" ON public.profili;

ALTER POLICY mercatino_public_read ON public.mercatino
  TO anon
  USING (pubblicato = true AND lower(stato) = 'disponibile');

ALTER POLICY news_public_read ON public.news
  TO anon
  USING (pubblicata = true);

ALTER POLICY sponsor_public_read ON public.sponsor
  TO anon
  USING (true);
