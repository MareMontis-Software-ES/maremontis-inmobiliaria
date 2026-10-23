-- =====================================================================
-- MareMontis · Administració immobiliària
-- Esquema inicial complet, extret de PROGRAMA_ADMINISTRACIO.pdf i
-- PROGRAMA_ADMINISTRACIO_2.pdf.
--
-- S'executa sobre una base buida (o després de supabase/reset_dev.sql).
-- Tots els noms de taula i de camp són en anglès per mantenir coherència
-- amb el codi; les etiquetes visibles a la pantalla són en català.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 0. Utilitats comunes
-- ---------------------------------------------------------------------

-- Omple updated_at i updated_by automàticament en cada modificació.
create or replace function public.tg_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 1. Usuaris i permisos
-- ---------------------------------------------------------------------
-- Un perfil per cada usuari d'auth.users. El rol controla què pot fer:
--   admin    → tot, inclosa la configuració
--   oficina  → crear i modificar dades
--   consulta → només lectura
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text not null default '',
  email          text,
  role           text not null default 'consulta' check (role in ('admin','oficina','consulta')),
  is_responsible boolean not null default false,   -- apareix al desplegable «Responsable»
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Crea el perfil automàticament quan es dona d'alta un usuari a Supabase Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.app_can_read()
returns boolean language sql stable as $$ select public.app_role() is not null $$;

create or replace function public.app_can_write()
returns boolean language sql stable as $$ select public.app_role() in ('admin','oficina') $$;

create or replace function public.app_is_admin()
returns boolean language sql stable as $$ select public.app_role() = 'admin' $$;

-- ---------------------------------------------------------------------
-- 2. Taules de configuració
-- ---------------------------------------------------------------------
create table public.zones (
  code        integer primary key,
  name        text not null
);

-- Tipus de contracte (PDF 2, «Revisions periòdiques»): les opcions
-- booleanes habiliten o deshabiliten funcions a cada finca.
create table public.contract_types (
  id                   uuid primary key default gen_random_uuid(),
  description          text not null,
  price                numeric(10,2) not null default 0,
  num_revisions        integer not null default 0,
  includes_revisions   boolean not null default false,
  includes_rent_210    boolean not null default false,
  includes_visits      boolean not null default false,
  includes_key_custody boolean not null default false,
  includes_receipts    boolean not null default false,
  active               boolean not null default true,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid
);

-- Industrials (lampista, electricista, jardiner…)
create table public.industrials (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  trade       text,               -- ofici / tipus
  contact     text,
  phone       text,
  email       text,
  observations text,
  active      boolean not null default true,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid
);

-- Textos del correu de revisió per idioma (PDF pàg. 18).
create table public.email_templates (
  id        uuid primary key default gen_random_uuid(),
  kind      text not null,                 -- 'revisio_ok', 'revisio_incidencies'...
  language  text not null,                 -- 'ca','es','en','fr','de','nl'...
  subject   text not null,
  body      text not null,
  unique (kind, language)
);

-- ---------------------------------------------------------------------
-- 3. Clients
-- ---------------------------------------------------------------------
create table public.clients (
  id                 uuid primary key default gen_random_uuid(),
  -- Codi intern sense el 430 (PDF: «No posar el 430 davant, ja ho posa l'ordinador»)
  client_code        integer not null unique check (client_code > 0),
  -- Subcompte comptable: 430 + 7 dígits → 4300000016
  account_code       text generated always as ('430' || lpad(client_code::text, 7, '0')) stored,
  title              text,              -- Sr., Sra., Sr. i Sra., Empresa
  sex                text check (sex in ('H','D') or sex is null),
  initials           text,
  first_name         text not null default '',
  last_name          text not null default '',
  short_name         text,
  client_type        text not null default 'particular' check (client_type in ('particular','empresa')),
  dni                text,
  nie                text,
  passport           text,
  passport_expiry    date,
  language           text,
  nationality        text,
  birth_date         date,
  birth_city         text,
  birth_country_code text,
  anagram            text,
  resident           boolean not null default false,
  authorization_ok   boolean not null default false,   -- «AUTORITZACIÓ»
  responsible_id     uuid references public.profiles(id), -- «Responsable Torrent»
  documents_path     text,                                -- «Documental»
  observations       text,                                -- observacions (≠ alertes)
  status             text not null default 'active' check (status in ('active','inactive')),
  deactivated_at     date,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid
);
create index clients_last_name_idx on public.clients (lower(last_name));

create table public.client_addresses (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  address_type text not null default 'principal',
  street_type  text,
  street_name  text,
  street_number text,
  extra        text,           -- bloc, urbanització, pis…
  postal_code  text,
  municipality text,
  province     text,
  country      text,
  country_code text,
  is_primary   boolean not null default true
);
create unique index client_addresses_one_primary on public.client_addresses (client_id) where is_primary;

create table public.client_phones (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients(id) on delete cascade,
  phone_type     text not null default 'mobil' check (phone_type in ('mobil','fix','feina','fax','altre')),
  country_prefix text not null default '+34',
  phone_number   text not null,
  notes          text,
  is_primary     boolean not null default false,
  sort_order     integer not null default 0
);

create table public.client_emails (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  email_type text not null default 'particular' check (email_type in ('particular','feina','altre')),
  email      text not null,
  is_primary boolean not null default false,
  sort_order integer not null default 0
);

-- Cònjuge i copropietaris (PDF pàg. 5: integrar a l'alta de clients i
-- poder afegir-ne més d'un).
create table public.client_related_persons (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients(id) on delete cascade,
  relation           text not null check (relation in ('conjuge','copropietari')),
  title              text,
  first_name         text not null default '',
  last_name          text not null default '',
  birth_date         date,
  birth_city         text,
  birth_country_code text,
  passport           text,
  passport_expiry    date,
  nie                text,
  dni                text,
  labels             boolean not null default false,   -- «ETIQUETES»
  anagram            text,
  ownership_percentage numeric(5,2) check (ownership_percentage between 0 and 100),
  street             text,
  postal_code        text,
  municipality       text,
  province           text,
  country            text,
  phones             jsonb not null default '[]'::jsonb,  -- [{type,prefix,number}]
  emails             jsonb not null default '[]'::jsonb,  -- [{type,email}]
  sort_order         integer not null default 0
);

-- Matrícules (PDF pàg. 6: afegir marca i model)
create table public.client_vehicles (
  id        uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  vehicle   text,
  brand     text,
  model     text,
  plate     text not null,
  itv_date  date,
  sort_order integer not null default 0
);

-- ---------------------------------------------------------------------
-- 4. Immobles / finques
-- ---------------------------------------------------------------------
create table public.properties (
  id               uuid primary key default gen_random_uuid(),
  -- Núm. d'administració = número d'armari de claus. Únic entre finques
  -- actives; en donar de baixa queda lliure per reutilitzar-lo.
  admin_number     integer not null check (admin_number > 0),
  street_type      text,               -- C., Pg., Av.…
  address          text not null default '',
  zone             integer references public.zones(code),
  municipality     text,
  postal_code      text,
  province         text,
  country          text default 'Espanya',
  ine_code         text,
  phone            text,
  phone_company    text,
  rental_use       text check (rental_use in ('turistic','urba') or rental_use is null),
  key_office       text,               -- quina oficina té la clau
  community_name   text,               -- comunitat de propietaris
  community_contact text,
  -- Nom vàlid per l'AEAT (renda)
  aeat_street_type text, aeat_name text, aeat_number_type text, aeat_number text,
  aeat_block text, aeat_stair text, aeat_floor text, aeat_door text,
  -- Contracte
  contract_type_id uuid references public.contract_types(id),
  contract_start   date,
  contract_end     date,
  revisions_start  date,               -- data inici per calcular revisions
  num_revisions    integer,            -- si és null, s'agafa del tipus de contracte
  -- Subministraments i serveis
  water_company text, water_ref text, water_meter text,
  power_company text, power_ref text, power_meter text, power_cups text,
  gas_company text,   gas_ref text,   gas_meter text,   gas_install_type text,
  butane_policy text, butane_install_type text, butane_revision date,
  internet_company text, internet_user text, internet_password text, internet_client_area text,
  alarm_company text, alarm_password_1 text, alarm_password_2 text,
  insurance_policy text, insurance_start date, insurance_end date,
  habitability_expiry date,
  energy_cert_date date, energy_cert_code_1 text, energy_cert_code_2 text, energy_cert_expiry date,
  hut_code text, nrua text,
  garden_maintenance text, garden_price numeric(10,2), garden_year integer,
  pool_maintenance text,   pool_price numeric(10,2),   pool_year integer,
  documents_path   text,
  observations     text,
  status           text not null default 'active' check (status in ('active','baixa')),
  baixa_date       date,
  baixa_by         uuid references public.profiles(id),
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid
);
create unique index properties_admin_number_active on public.properties (admin_number) where status = 'active';

-- Titulars d'una finca: un client o una persona relacionada (copropietari)
create table public.property_owners (
  id                   uuid primary key default gen_random_uuid(),
  property_id          uuid not null references public.properties(id) on delete cascade,
  client_id            uuid references public.clients(id) on delete cascade,
  related_person_id    uuid references public.client_related_persons(id) on delete cascade,
  ownership_percentage numeric(5,2) not null default 100 check (ownership_percentage between 0 and 100),
  is_main              boolean not null default true,
  check (client_id is not null or related_person_id is not null)
);
create index property_owners_client_idx on public.property_owners (client_id);
create index property_owners_property_idx on public.property_owners (property_id);

-- Equipaments interior / exterior (fitxes «Control de cases», pàg. 12-13)
create table public.property_equipment (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties(id) on delete cascade,
  area          text not null check (area in ('exterior','interior')),
  item          text not null,          -- AIGUA, ALARMA, ASCENSOR, FUSTERIA, WIFI…
  enabled       boolean not null default false,
  kind          text,                   -- tipus
  brand         text,
  company       text,
  phone         text,
  contact       text,
  meter_ref     text,
  industrial_id uuid references public.industrials(id),
  notes         text,
  unique (property_id, area, item)
);

-- ---------------------------------------------------------------------
-- 5. Impostos (pàg. 4 i 15). Fórmules del PDF:
--    Base imposable = Valor cadastral * Revalorització / 100
--    Quota renda    = Base imposable * Tipus gravamen / 100
-- ---------------------------------------------------------------------
create table public.property_taxes (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid not null references public.properties(id) on delete cascade,
  tax_year         integer not null,
  holder_name      text,
  revaluation_pct  numeric(5,2) not null default 2,   -- 1.1 revaloritzat / 2 no revaloritzat
  cadastral_value  numeric(12,2) not null default 0,
  cadastral_ref    text,
  ibi_quota        numeric(12,2) not null default 0,
  tax_rate         numeric(5,2) not null default 19,
  taxable_base     numeric(12,2) generated always as (round(cadastral_value * revaluation_pct / 100, 2)) stored,
  rent_quota       numeric(12,2) generated always as (round(round(cadastral_value * revaluation_pct / 100, 2) * tax_rate / 100, 2)) stored,
  active_from      date,
  active_to        date,
  paid             boolean not null default false,     -- «Impostos pagament» = S
  paid_date        date,
  class            text,                               -- C / PC
  billing          boolean,                            -- Facturació S/N
  units            integer,
  reg_owner        text, purchase_date date, deed_price numeric(12,2),
  protocol_number  text, notary text, deed_type text,
  observations     text,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid,
  unique (property_id, tax_year)
);

-- ---------------------------------------------------------------------
-- 6. Control de claus (pàg. 7 i PDF 2)
-- ---------------------------------------------------------------------
create table public.key_movements (
  id                uuid primary key default gen_random_uuid(),
  property_id       uuid not null references public.properties(id) on delete cascade,
  delivered_at      date not null default current_date,
  delivered_by      uuid references public.profiles(id),
  delivered_to_industrial_id uuid references public.industrials(id),
  delivered_to      text,                    -- si no és un industrial registrat
  reason            text,
  observations      text,
  expected_return   date not null default (current_date + 7),   -- «1 setmana més tard, editable»
  returned_at       date,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid
);

-- ---------------------------------------------------------------------
-- 7. Alertes (PDF 2): separades de les observacions, amb checklist i
--    històric de 6 mesos un cop completades.
-- ---------------------------------------------------------------------
create table public.alerts (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references public.clients(id) on delete cascade,
  property_id  uuid references public.properties(id) on delete cascade,
  alert_type   text not null default 'manual' check (alert_type in ('manual','caducitat_document','naixement','claus','venciment')),
  title        text not null,
  content      text,
  start_date   date not null default current_date,
  due_date     date,                   -- data de gestió (editable)
  checklist    jsonb not null default '[]'::jsonb,   -- [{text, done}]
  completed_at timestamptz,
  completed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid
);
create index alerts_pending_idx on public.alerts (due_date) where completed_at is null;

-- ---------------------------------------------------------------------
-- 8. Incidències i notes de servei (sense facturació)
-- ---------------------------------------------------------------------
create table public.incidents (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid references public.clients(id) on delete set null,
  property_id        uuid references public.properties(id) on delete set null,
  industrial_id      uuid references public.industrials(id),
  revision_id        uuid,                         -- si ve d'una revisió
  incident_date      date not null default current_date,
  reported_by        uuid references public.profiles(id),
  channel            text,                         -- mitjà: e-mail, telèfon, presencial…
  description        text not null default '',
  requires_management boolean not null default true,
  status             text not null default 'oberta' check (status in ('oberta','en_curs','tancada')),
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid
);

create table public.service_notes (
  id                  uuid primary key default gen_random_uuid(),
  note_number         bigint generated always as identity,
  incident_id         uuid references public.incidents(id) on delete set null,
  property_id         uuid references public.properties(id) on delete set null,
  origin              text,
  department          text,
  trade               text,                          -- tipus d'industrial
  industrial_id       uuid references public.industrials(id),
  industrial_alt_id   uuid references public.industrials(id),  -- 2a opció
  key_location        text,
  other_locations     text,
  contact_mobile      text,
  description         text not null default '',
  notice_text         text,                          -- text opcional de la nota d'avís
  limit_from          timestamptz,
  limit_to            timestamptz,
  status              text not null default 'pendent' check (status in ('pendent','enviada','completada','anul·lada')),
  sent_at             timestamptz,
  sent_to             text,
  completed_at        timestamptz,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid
);

-- ---------------------------------------------------------------------
-- 9. Revisions de cases (pàg. 14-19)
-- ---------------------------------------------------------------------
create table public.revisions (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references public.properties(id) on delete cascade,
  revision_date   date not null default current_date,
  revision_number integer not null default 1,
  is_extra        boolean not null default false,       -- revisió complementària
  water_on boolean, water_reading text, water_meter text,
  power_on boolean, power_reading text, power_meter text,
  gas_on   boolean, gas_reading   text, gas_meter   text,
  reading_date    date,
  alarm_on boolean, alarm_notes text, alarm_notify boolean not null default false,
  heating_on boolean, heating_notes text, heating_notify boolean not null default false,
  -- Resta d'elements: [{item, inside, outside, good, bad, notes, notify}]
  items           jsonb not null default '[]'::jsonb,
  other_observations text,
  email_sent_responsible_at timestamptz,
  email_sent_owner_at       timestamptz,
  created_at timestamptz not null default now(), created_by uuid,
  updated_at timestamptz not null default now(), updated_by uuid
);
alter table public.incidents
  add constraint incidents_revision_fk foreign key (revision_id) references public.revisions(id) on delete set null;

-- Fotos: d'inventari (revision_id null) o d'una revisió concreta. Amb nom descriptiu.
create table public.property_photos (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties(id) on delete cascade,
  revision_id  uuid references public.revisions(id) on delete cascade,
  storage_path text not null,
  description  text not null default '',
  created_at timestamptz not null default now(), created_by uuid
);

-- ---------------------------------------------------------------------
-- 10. Triggers d'auditoria
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['contract_types','industrials','clients','properties','property_taxes',
                           'key_movements','alerts','incidents','service_notes','revisions']
  loop
    execute format('create trigger %I_touch before insert or update on public.%I
                    for each row execute function public.tg_touch()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 11. Funcions de negoci
-- ---------------------------------------------------------------------

-- Pròxim codi de client lliure
create or replace function public.next_client_code()
returns integer language sql stable as $$
  select coalesce(max(client_code), 0) + 1 from public.clients
$$;

-- Primer número d'administració / armari lliure (els de finques de baixa es reutilitzen)
create or replace function public.next_free_admin_number()
returns integer language sql stable as $$
  select coalesce(min(n), 1)
  from generate_series(1, coalesce((select max(admin_number) from public.properties where status='active'), 0) + 1) n
  where not exists (select 1 from public.properties p where p.admin_number = n and p.status = 'active')
$$;

-- Desa un client complet (dades + adreça + telèfons + e-mails + cònjuge/
-- copropietaris + vehicles) en UNA sola transacció. Si alguna part falla,
-- no es desa res. Retorna l'id del client.
create or replace function public.save_client(payload jsonb)
returns uuid language plpgsql security invoker as $$
declare
  c        jsonb := payload->'client';
  v_id     uuid  := nullif(c->>'id','')::uuid;
  v_code   integer := nullif(c->>'client_code','')::integer;
  x        jsonb;
  v_rel    uuid;
  i        integer;
begin
  if not public.app_can_write() then
    raise exception 'No tens permís per modificar clients';
  end if;

  if v_id is null then
    insert into public.clients (client_code, first_name, last_name)
    values (coalesce(v_code, public.next_client_code()), '', '')
    returning id into v_id;
  elsif v_code is not null then
    update public.clients set client_code = v_code where id = v_id;
  end if;

  update public.clients set
    title              = nullif(c->>'title',''),
    sex                = nullif(c->>'sex',''),
    initials           = nullif(c->>'initials',''),
    first_name         = coalesce(c->>'first_name',''),
    last_name          = coalesce(c->>'last_name',''),
    short_name         = nullif(c->>'short_name',''),
    client_type        = coalesce(nullif(c->>'client_type',''),'particular'),
    dni                = nullif(c->>'dni',''),
    nie                = nullif(c->>'nie',''),
    passport           = nullif(c->>'passport',''),
    passport_expiry    = nullif(c->>'passport_expiry','')::date,
    language           = nullif(c->>'language',''),
    nationality        = nullif(c->>'nationality',''),
    birth_date         = nullif(c->>'birth_date','')::date,
    birth_city         = nullif(c->>'birth_city',''),
    birth_country_code = nullif(c->>'birth_country_code',''),
    anagram            = nullif(c->>'anagram',''),
    resident           = coalesce((c->>'resident')::boolean, false),
    authorization_ok   = coalesce((c->>'authorization_ok')::boolean, false),
    responsible_id     = nullif(c->>'responsible_id','')::uuid,
    documents_path     = nullif(c->>'documents_path',''),
    observations       = nullif(c->>'observations','')
  where id = v_id;

  -- Adreça principal
  delete from public.client_addresses where client_id = v_id;
  if payload ? 'address' then
    x := payload->'address';
    insert into public.client_addresses (client_id, street_type, street_name, street_number, extra,
      postal_code, municipality, province, country, country_code, is_primary)
    values (v_id, nullif(x->>'street_type',''), nullif(x->>'street_name',''), nullif(x->>'street_number',''),
      nullif(x->>'extra',''), nullif(x->>'postal_code',''), nullif(x->>'municipality',''),
      nullif(x->>'province',''), nullif(x->>'country',''), nullif(x->>'country_code',''), true);
  end if;

  -- Telèfons
  delete from public.client_phones where client_id = v_id;
  i := 0;
  for x in select * from jsonb_array_elements(coalesce(payload->'phones','[]'::jsonb)) loop
    if coalesce(trim(x->>'phone_number'),'') <> '' then
      insert into public.client_phones (client_id, phone_type, country_prefix, phone_number, notes, is_primary, sort_order)
      values (v_id, coalesce(nullif(x->>'phone_type',''),'mobil'), coalesce(nullif(x->>'country_prefix',''),'+34'),
              trim(x->>'phone_number'), nullif(x->>'notes',''), i = 0, i);
      i := i + 1;
    end if;
  end loop;

  -- E-mails
  delete from public.client_emails where client_id = v_id;
  i := 0;
  for x in select * from jsonb_array_elements(coalesce(payload->'emails','[]'::jsonb)) loop
    if coalesce(trim(x->>'email'),'') <> '' then
      insert into public.client_emails (client_id, email_type, email, is_primary, sort_order)
      values (v_id, coalesce(nullif(x->>'email_type',''),'particular'), trim(x->>'email'), i = 0, i);
      i := i + 1;
    end if;
  end loop;

  -- Cònjuge / copropietaris: s'actualitzen per id per no trencar els
  -- vincles amb property_owners.
  delete from public.client_related_persons
   where client_id = v_id
     and id not in (select nullif(e->>'id','')::uuid
                      from jsonb_array_elements(coalesce(payload->'related','[]'::jsonb)) e
                     where nullif(e->>'id','') is not null);
  i := 0;
  for x in select * from jsonb_array_elements(coalesce(payload->'related','[]'::jsonb)) loop
    if nullif(x->>'id','') is null then
      insert into public.client_related_persons (client_id, relation)
      values (v_id, coalesce(nullif(x->>'relation',''),'copropietari'))
      returning id into v_rel;
      x := x || jsonb_build_object('id', v_rel);
    end if;
    update public.client_related_persons set
      relation = coalesce(nullif(x->>'relation',''),'copropietari'),
      title = nullif(x->>'title',''),
      first_name = coalesce(x->>'first_name',''),
      last_name = coalesce(x->>'last_name',''),
      birth_date = nullif(x->>'birth_date','')::date,
      birth_city = nullif(x->>'birth_city',''),
      birth_country_code = nullif(x->>'birth_country_code',''),
      passport = nullif(x->>'passport',''),
      passport_expiry = nullif(x->>'passport_expiry','')::date,
      nie = nullif(x->>'nie',''),
      dni = nullif(x->>'dni',''),
      labels = coalesce((x->>'labels')::boolean,false),
      anagram = nullif(x->>'anagram',''),
      ownership_percentage = nullif(x->>'ownership_percentage','')::numeric,
      street = nullif(x->>'street',''),
      postal_code = nullif(x->>'postal_code',''),
      municipality = nullif(x->>'municipality',''),
      province = nullif(x->>'province',''),
      country = nullif(x->>'country',''),
      phones = coalesce(x->'phones','[]'::jsonb),
      emails = coalesce(x->'emails','[]'::jsonb),
      sort_order = i
    where id = (x->>'id')::uuid and client_id = v_id;
    i := i + 1;
  end loop;

  -- Vehicles
  delete from public.client_vehicles where client_id = v_id;
  i := 0;
  for x in select * from jsonb_array_elements(coalesce(payload->'vehicles','[]'::jsonb)) loop
    if coalesce(trim(x->>'plate'),'') <> '' then
      insert into public.client_vehicles (client_id, vehicle, brand, model, plate, itv_date, sort_order)
      values (v_id, nullif(x->>'vehicle',''), nullif(x->>'brand',''), nullif(x->>'model',''),
              upper(trim(x->>'plate')), nullif(x->>'itv_date','')::date, i);
      i := i + 1;
    end if;
  end loop;

  return v_id;
end $$;

-- Alertes automàtiques de caducitat de documents (passaport del client i
-- de cònjuge/copropietaris). Es pot cridar des de l'Inici; no duplica.
create or replace function public.generate_document_alerts(days_ahead integer default 60)
returns integer language plpgsql as $$
declare n integer := 0; r record;
begin
  -- Evita duplicats si dos usuaris obren l'Inici alhora
  perform pg_advisory_xact_lock(hashtext('generate_document_alerts'));
  for r in
    select c.id client_id, 'Caducitat passaport: ' || c.first_name || ' ' || c.last_name title, c.passport_expiry due
      from public.clients c
     where c.status = 'active' and c.passport_expiry is not null
       and c.passport_expiry <= current_date + days_ahead
    union all
    select p.client_id, 'Caducitat passaport: ' || p.first_name || ' ' || p.last_name, p.passport_expiry
      from public.client_related_persons p join public.clients c on c.id = p.client_id
     where c.status = 'active' and p.passport_expiry is not null
       and p.passport_expiry <= current_date + days_ahead
  loop
    if not exists (select 1 from public.alerts a
                    where a.client_id = r.client_id and a.alert_type = 'caducitat_document'
                      and a.title = r.title and a.due_date = r.due) then
      insert into public.alerts (client_id, alert_type, title, content, due_date)
      values (r.client_id, 'caducitat_document', r.title, 'Document caduca el ' || to_char(r.due,'DD/MM/YYYY'), r.due);
      n := n + 1;
    end if;
  end loop;

  -- Aniversaris del client dins del període
  for r in
    select c.id client_id, 'Aniversari: ' || c.first_name || ' ' || c.last_name title,
           (make_date(extract(year from current_date)::int, extract(month from c.birth_date)::int, 1)
             + (extract(day from c.birth_date)::int - 1)
             + case when (make_date(extract(year from current_date)::int, extract(month from c.birth_date)::int, 1)
                          + (extract(day from c.birth_date)::int - 1)) < current_date
                    then interval '1 year' else interval '0' end)::date due
      from public.clients c
     where c.status = 'active' and c.birth_date is not null
  loop
    if r.due <= current_date + days_ahead and not exists (
        select 1 from public.alerts a where a.client_id = r.client_id and a.alert_type = 'naixement' and a.due_date = r.due) then
      insert into public.alerts (client_id, alert_type, title, due_date) values (r.client_id, 'naixement', r.title, r.due);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- Vista d'alertes visibles: pendents + completades dels últims 6 mesos
create or replace view public.alerts_visible with (security_invoker = true) as
  select a.*, (a.completed_at is null and a.due_date < current_date) as overdue
    from public.alerts a
   where a.completed_at is null or a.completed_at > now() - interval '6 months';

-- ---------------------------------------------------------------------
-- 12. Seguretat (RLS): només usuaris amb perfil actiu poden llegir;
--     només admin/oficina poden escriure; configuració només admin.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['clients','client_addresses','client_phones','client_emails',
     'client_related_persons','client_vehicles','properties','property_owners','property_equipment',
     'property_taxes','key_movements','alerts','incidents','service_notes','revisions','property_photos',
     'industrials','zones','contract_types','email_templates']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.app_can_read())', t||'_read', t);
    if t in ('zones','contract_types','email_templates') then
      execute format('create policy %I on public.%I for all to authenticated using (public.app_is_admin()) with check (public.app_is_admin())', t||'_write', t);
    else
      execute format('create policy %I on public.%I for all to authenticated using (public.app_can_write()) with check (public.app_can_write())', t||'_write', t);
    end if;
  end loop;
end $$;

alter table public.profiles enable row level security;
create policy profiles_read  on public.profiles for select to authenticated using (public.app_can_read() or id = auth.uid());
create policy profiles_admin on public.profiles for all    to authenticated using (public.app_is_admin()) with check (public.app_is_admin());

-- ---------------------------------------------------------------------
-- 13. Dades inicials reals (no inventades): text de correu del PDF pàg. 18
-- ---------------------------------------------------------------------
insert into public.email_templates (kind, language, subject, body) values
('revisio_ok', 'en', 'Revision house {{finca}}',
 E'Revision {{data}}\n\nDear client,\nWe can inform you that we have checked your property – all is fine.\nBest regards,\nAdministration and service department');
