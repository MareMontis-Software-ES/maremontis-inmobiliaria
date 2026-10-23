-- Camps que falten per a Control de cases (fitxes exterior/interior),
-- incidències i notes de servei, i una vista per al llistat de cases.

-- Equipaments exterior/interior (PDF pàg. 12-13)
alter table public.property_equipment
  add column if not exists number      text,     -- telèfon assignat / número
  add column if not exists activated   text,     -- alarma: activat
  add column if not exists deactivated text,     -- alarma: desactivat
  add column if not exists automatic   boolean;  -- jardí: reg automàtic

-- Incidències: qui la tanca i quan
alter table public.incidents
  add column if not exists closed_at timestamptz;

-- Notes de servei: vincle directe amb client i revisió, i qui l'envia
alter table public.service_notes
  add column if not exists client_id   uuid references public.clients(id) on delete set null,
  add column if not exists revision_id uuid references public.revisions(id) on delete set null,
  add column if not exists sent_by     uuid references public.profiles(id),
  add column if not exists completed_by uuid references public.profiles(id);

-- Revisions: responsable que la fa
alter table public.revisions
  add column if not exists responsible_id uuid references public.profiles(id);

-- Vista del «Control de cases»: una fila per finca amb client, contracte i darrera revisió
create or replace view public.cases_overview with (security_invoker = true) as
select p.id, p.admin_number, p.street_type, p.address, p.zone, p.municipality, p.status,
       p.contract_type_id, ct.description as contract,
       coalesce(p.num_revisions, ct.num_revisions) as num_revisions,
       coalesce(ct.includes_revisions, true) as includes_revisions,
       p.revisions_start, p.community_name, p.community_contact,
       o.client_id, c.client_code, c.first_name, c.last_name, c.language, c.responsible_id,
       lr.revision_date as last_revision_date, lr.revision_number as last_revision_number,
       (select count(*) from public.revisions r where r.property_id = p.id) as revisions_count
  from public.properties p
  left join public.contract_types ct on ct.id = p.contract_type_id
  left join lateral (select po.client_id from public.property_owners po
                      where po.property_id = p.id and po.client_id is not null
                      order by po.is_main desc limit 1) o on true
  left join public.clients c on c.id = o.client_id
  left join lateral (select r.revision_date, r.revision_number from public.revisions r
                      where r.property_id = p.id order by r.revision_date desc, r.revision_number desc limit 1) lr on true;
