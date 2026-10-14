-- Required by the code-version upsert used by the global Superadmin and the legacy backup panel.
create unique index if not exists code_backup_registry_file_commit_uidx on public.code_backup_registry(file_path,commit_sha);
