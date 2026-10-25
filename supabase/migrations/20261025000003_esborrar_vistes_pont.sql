-- Esborra les vistes «pont» amb els noms antics de les taules (creades a
-- 20261025000002_admi_prefix_taules.sql). Executar quan ja estigui publicada
-- la versió del programa que fa servir els noms admi_.
-- «drop view» només esborra vistes: si algun nom fos una taula, donaria error i no esborraria res.
drop view if exists
  public.alerts_visible, public.cases_overview,
  public.alerts, public.audit_log, public.client_addresses, public.client_emails, public.client_phones,
  public.client_related_persons, public.client_vehicles, public.clients, public.contract_types,
  public.email_templates, public.incidents, public.industrials, public.key_movements, public.profiles,
  public.properties, public.property_equipment, public.property_owners, public.property_photos,
  public.property_taxes, public.revisions, public.service_notes, public.zones;

notify pgrst, 'reload schema';
