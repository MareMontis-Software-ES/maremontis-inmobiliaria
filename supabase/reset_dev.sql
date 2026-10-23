-- =====================================================================
-- ATENCIÓ: ESBORRA TOTES LES TAULES I DADES DE L'APLICACIÓ.
-- Només per a la base de dades de PROVES, abans d'aplicar
-- migrations/20261023000001_esquema_inicial.sql per primer cop.
-- No toca els usuaris d'autenticació (auth.users).
-- =====================================================================
drop trigger if exists on_auth_user_created on auth.users;
drop view  if exists public.alerts_visible cascade;
drop table if exists
  public.property_photos, public.service_notes, public.incidents, public.revisions,
  public.alerts, public.key_movements, public.property_taxes, public.property_equipment,
  public.property_owners, public.properties, public.client_vehicles, public.client_related_persons,
  public.client_emails, public.client_phones, public.client_addresses, public.clients,
  public.email_templates, public.industrials, public.contract_types, public.zones, public.profiles
  cascade;
drop function if exists public.save_client(jsonb), public.generate_document_alerts(integer),
  public.next_client_code(), public.next_free_admin_number(), public.app_role(), public.app_can_read(),
  public.app_can_write(), public.app_is_admin(), public.handle_new_user(), public.tg_touch() cascade;
