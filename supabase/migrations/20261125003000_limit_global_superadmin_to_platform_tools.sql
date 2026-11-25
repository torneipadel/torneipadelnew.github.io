-- Global Superadmin is a platform-technical role, not a tenant data-management role.
revoke all on function public.eventour_superadmin_create_company(text,text,text,text) from public, anon, authenticated;
revoke all on function public.eventour_superadmin_update_member(uuid,uuid,text,boolean) from public, anon, authenticated;
revoke all on function public.superadmin_list_tournament_backup_metadata() from public, anon, authenticated;
revoke all on function public.superadmin_list_data_backup_metadata() from public, anon, authenticated;
revoke all on function public.superadmin_restore_torneo(bigint) from public, anon, authenticated;
revoke all on function public.superadmin_restore_data_backup(bigint) from public, anon, authenticated;
