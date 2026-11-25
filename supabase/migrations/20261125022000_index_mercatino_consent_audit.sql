create index if not exists idx_mercatino_contact_consent_log_mercatino_id
  on private.mercatino_contact_consent_log(mercatino_id);
create index if not exists idx_mercatino_contact_consent_log_user_id
  on private.mercatino_contact_consent_log(user_id);