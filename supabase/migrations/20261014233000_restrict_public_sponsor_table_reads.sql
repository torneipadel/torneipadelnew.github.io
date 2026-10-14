-- Public sponsor display must use get_public_company_sponsors(p_slug), which scopes rows
-- to the requested active company. Do not expose the raw table to anonymous/public clients.
REVOKE SELECT ON TABLE public.sponsor FROM anon;
REVOKE SELECT ON TABLE public.sponsor FROM public;
GRANT SELECT ON TABLE public.sponsor TO authenticated;
