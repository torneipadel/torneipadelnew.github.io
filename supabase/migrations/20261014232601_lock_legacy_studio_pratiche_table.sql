-- Keep the legacy studio_pratiche table inaccessible through the public Data API.
-- RLS remains enabled; the deny-all policy documents the intended fail-closed behavior.
REVOKE ALL ON TABLE public.studio_pratiche FROM anon, authenticated;
DROP POLICY IF EXISTS studio_pratiche_deny_api_access ON public.studio_pratiche;
CREATE POLICY studio_pratiche_deny_api_access
  ON public.studio_pratiche
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
