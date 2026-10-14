-- Restrict self-service profile writes to non-privileged fields.
-- This migration records the production hardening applied during the
-- multi-tenant security audit. It is safe to re-run.
begin;

revoke insert, update on table public.profili from authenticated;

grant insert (user_id, nome, cognome, telefono, livello, note, email, alias)
  on table public.profili to authenticated;

grant update (nome, cognome, telefono, livello, note, email, alias)
  on table public.profili to authenticated;

drop policy if exists "Aggiornamento profilo personale" on public.profili;
create policy "Aggiornamento profilo personale"
  on public.profili
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;
