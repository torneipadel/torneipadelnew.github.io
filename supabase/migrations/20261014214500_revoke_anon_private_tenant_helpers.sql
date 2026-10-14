-- These helpers are intended for authenticated tenant authorization and
-- policy evaluation, not direct anonymous RPC invocation.
revoke execute on function private.can_manage_azienda(uuid) from anon;
revoke execute on function private.user_azienda_ids() from anon;
