-- Protect the company onboarding RPC when it is invoked by an already privileged account.
-- A first-time non-privileged account can still create its initial company; subsequent admin actions require AAL2.
do $mfa_guard$
declare f record; patched text;
begin
  for f in
    select p.oid,pg_get_functiondef(p.oid) as definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='create_company_for_current_user'
      and p.prosecdef and p.prolang=(select oid from pg_language where lanname='plpgsql')
  loop
    if position('private.assert_eventour_mfa()' in f.definition)=0 then
      patched:=regexp_replace(f.definition,'\mBEGIN\M',E'BEGIN\n  PERFORM private.assert_eventour_mfa();','i');
      if patched=f.definition then raise exception 'Impossibile inserire MFA in create_company_for_current_user'; end if;
      execute patched;
    end if;
  end loop;
end
$mfa_guard$;
