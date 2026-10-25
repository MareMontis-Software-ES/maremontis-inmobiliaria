-- =====================================================================
-- Noms de taula: tots amb el prefix admi_ i descriptius (petició de la Montse).
-- 1) Reanomena les 22 taules i les 2 vistes antigues (les dades, permisos
--    i regles de seguretat RLS segueixen la taula automàticament).
-- 2) Historial: els noms de taula guardats passen al nom nou.
-- 3) Reescriu les funcions que esmenten les taules pel nom.
-- 4) Vistes «pont» amb els noms antics perquè la versió publicada del
--    programa continuï funcionant fins que es publiqui la nova. S'esborren
--    després amb 20261025000003_esborrar_vistes_pont.sql.
-- 5) Esborra l'esquema old_demo (20 taules d'una demo antiga que el programa no fa servir).
-- Es pot tornar a executar sense problema.
-- =====================================================================
begin;

create temporary table _noms (old text primary key, new text not null, kind char) on commit drop;
insert into _noms values
  ('alerts',                 'admi_alerts',                 'r'),
  ('audit_log',              'admi_change_history',         'r'),
  ('client_addresses',       'admi_client_addresses',       'r'),
  ('client_emails',          'admi_client_emails',          'r'),
  ('client_phones',          'admi_client_phones',          'r'),
  ('client_related_persons', 'admi_client_related_persons', 'r'),
  ('client_vehicles',        'admi_client_vehicles',        'r'),
  ('clients',                'admi_clients',                'r'),
  ('contract_types',         'admi_contract_types',         'r'),
  ('email_templates',        'admi_email_templates',        'r'),
  ('incidents',              'admi_incidents',              'r'),
  ('industrials',            'admi_tradespeople',           'r'),
  ('key_movements',          'admi_key_movements',          'r'),
  ('profiles',               'admi_users',                  'r'),
  ('properties',             'admi_properties',             'r'),
  ('property_equipment',     'admi_property_equipment',     'r'),
  ('property_owners',        'admi_property_owners',        'r'),
  ('property_photos',        'admi_property_photos',        'r'),
  ('property_taxes',         'admi_property_taxes',         'r'),
  ('revisions',              'admi_property_revisions',     'r'),
  ('service_notes',          'admi_service_notes',          'r'),
  ('zones',                  'admi_zones',                  'r'),
  ('alerts_visible',         'admi_alerts_overview',        'v'),
  ('cases_overview',         'admi_revisions_overview',     'v');

do $$
declare
  m record;
  f record;
  def text;
begin
  -- 1) Reanomenar (només si encara té el nom antic i és la taula/vista original, no una vista pont)
  for m in select * from _noms loop
    if exists (select 1 from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname = m.old and c.relkind = m.kind)
       and to_regclass('public.' || m.new) is null then
      execute format('alter %s public.%I rename to %I', case m.kind when 'v' then 'view' else 'table' end, m.old, m.new);
    end if;
  end loop;

  -- 2) Historial de canvis
  update public.admi_change_history h set table_name = x.new from _noms x where h.table_name = x.old;

  -- 3) Funcions: «from/join/into/update X» i «tg_table_name = 'X'» passen al nom nou
  for f in select p.oid from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' loop
    def := pg_get_functiondef(f.oid);
    for m in select * from _noms loop
      def := regexp_replace(def, '(\m(?:from|join|into|update|table)\s+)(public\.)?' || m.old || '\M', '\1\2' || m.new, 'gi');
      def := regexp_replace(def, '(tg_table_name\s*=\s*'')' || m.old || '''', '\1' || m.new || '''', 'g');
    end loop;
    if def <> pg_get_functiondef(f.oid) then
      execute def;
    end if;
  end loop;

  -- 4) Vistes pont amb els noms antics (respecten els permisos de qui consulta)
  for m in select * from _noms loop
    if to_regclass('public.' || m.old) is null then
      execute format('create view public.%I with (security_invoker = true) as select * from public.%I', m.old, m.new);
    end if;
  end loop;
end $$;

-- 5) Demo antiga que no es fa servir
drop schema if exists old_demo cascade;

commit;

notify pgrst, 'reload schema';
