-- Backup policy public.tornei before E2E registration fix 2026-09-29
-- Project: dkeqicstprvvfebiaooc
-- Existing policy:
CREATE POLICY "tornei_public_read" ON public.tornei
AS PERMISSIVE FOR SELECT
TO public
USING (((auth.role() = 'anon'::text) AND (pubblicato = true)) OR private.can_manage_azienda(azienda_id));

-- Existing authenticated tenant policy:
CREATE POLICY "tornei_tenant_select" ON public.tornei
AS PERMISSIVE FOR SELECT
TO authenticated
USING (private.can_manage_azienda(azienda_id));
