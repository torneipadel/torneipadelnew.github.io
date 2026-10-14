-- These helpers are intended for authenticated tenant authorization and
-- policy evaluation, not direct anonymous or PUBLIC RPC invocation.
revoke execute on function private.can_manage_azienda(uuid) from public, anon;
revoke execute on function private.user_azienda_ids() from public, anon;
grant execute on function private.can_manage_azienda(uuid) to authenticated;
grant execute on function private.user_azienda_ids() to authenticated;
