-- The global technical Superadmin cannot manage tenant records or commercial assignments.
revoke all on function public.eventour_superadmin_update_company(uuid,text,text,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.eventour_superadmin_set_company_plan(uuid,text,text,timestamptz,text) from public, anon, authenticated;
revoke all on function public.eventour_superadmin_save_plan(text,text,numeric,integer,integer,integer,integer,integer,boolean,text,text,text,text) from public, anon, authenticated;
