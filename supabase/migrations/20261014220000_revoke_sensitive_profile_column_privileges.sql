-- Explicitly remove any historical column-level grants that a table-level
-- REVOKE would not remove. Reassert only the intended self-service columns.
revoke insert (id, ruolo, created_at, updated_at)
  on table public.profili from authenticated;
revoke update (id, user_id, ruolo, created_at, updated_at)
  on table public.profili from authenticated;

grant insert (user_id, nome, cognome, telefono, livello, note, email, alias)
  on table public.profili to authenticated;
grant update (nome, cognome, telefono, livello, note, email, alias)
  on table public.profili to authenticated;
