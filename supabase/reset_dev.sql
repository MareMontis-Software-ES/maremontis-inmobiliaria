-- =====================================================================
-- ATENCIÓ: ESBORRA TOTES LES TAULES I DADES DE L'APLICACIÓ.
-- Només per a la base de dades de PROVES, abans d'aplicar
-- migrations/20261023000001_esquema_inicial.sql per primer cop (les taules ja porten el prefix admi_).
-- No toca els usuaris d'autenticació (auth.users).
-- =====================================================================
drop trigger if exists on_auth_user_created on auth.users;
drop view  if exists public.admi_alerts_overview, public.admi_revisions_overview cascade;
drop table if exists
  public.admi_property_photos, public.admi_service_notes, public.admi_incidents, public.admi_property_revisions,
  public.admi_alerts, public.admi_key_movements, public.admi_property_taxes, public.admi_property_equipment,
  public.admi_property_owners, public.admi_properties, public.admi_client_vehicles, public.admi_client_related_persons,
  public.admi_client_emails, public.admi_client_phones, public.admi_client_addresses, public.admi_clients,
  public.admi_email_templates, public.admi_tradespeople, public.admi_contract_types, public.admi_zones, public.admi_users,
  public.admi_change_history, public.admi_settings, public.admi_languages, public.admi_role_permissions, public.admi_backups
  cascade;
drop function if exists public.save_client(jsonb), public.generate_document_alerts(integer),
  public.next_client_code(), public.next_free_admin_number(), public.app_role(), public.app_can_read(),
  public.app_can_write(), public.app_is_admin(), public.handle_new_user(), public.tg_touch() cascade;
