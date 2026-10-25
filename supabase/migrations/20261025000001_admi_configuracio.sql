-- Canvis del document «cambios programa INMO» (25/10/2026).
-- Totes les taules noves porten el prefix admi_. No s'esborra cap dada.
--   1. Cònjuge i copropietaris propis de cada finca (client_related_persons.property_id)
--   2. Subcompte comptable escrit a mà (clients.account_code deixa de ser calculat)
--   3. admi_settings: any de treball i programació de les còpies
--   4. admi_languages: idiomes que es poden triar
--   5. admi_role_permissions: què pot fer cada rol a cada apartat del menú
--   6. admi_backups + pg_cron: còpies de seguretat automàtiques i manuals en SQL
--   7. admi_change_year: canvi d'any (crea els impostos del nou any)

-- ---------------------------------------------------------------------
-- 1. Cònjuge / copropietaris per finca
-- ---------------------------------------------------------------------
alter table public.client_related_persons
  add column if not exists property_id uuid references public.properties(id) on delete set null;
create index if not exists client_related_persons_property on public.client_related_persons (property_id);

-- Dades existents: la finca on ja són titulars; si no, l'única finca del client.
update public.client_related_persons r
   set property_id = o.property_id
  from (select distinct on (related_person_id) related_person_id, property_id
          from public.property_owners where related_person_id is not null
         order by related_person_id, is_main desc) o
 where o.related_person_id = r.id and r.property_id is null;

update public.client_related_persons r
   set property_id = one.property_id
  from (select client_id, min(property_id::text)::uuid property_id
          from public.property_owners where client_id is not null
         group by client_id having count(distinct property_id) = 1) one
 where one.client_id = r.client_id and r.property_id is null;

-- ---------------------------------------------------------------------
-- 2. Subcompte a mà (es conserven els valors actuals)
-- ---------------------------------------------------------------------
alter table public.clients alter column account_code drop expression;
create unique index if not exists clients_account_code_unique on public.clients (account_code) where account_code is not null;

create or replace function public.save_client(payload jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
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
    if v_code is null then
      raise exception 'Cal escriure el codi del client';
    end if;
    insert into public.clients (client_code, first_name, last_name)
    values (v_code, '', '')
    returning id into v_id;
  elsif v_code is not null then
    update public.clients set client_code = v_code where id = v_id;
  end if;

  update public.clients set
    title              = nullif(c->>'title',''),
    sex                = nullif(c->>'sex',''),
    account_code       = nullif(c->>'account_code',''),
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
      insert into public.client_related_persons (client_id, relation, property_id)
      values (v_id, coalesce(nullif(x->>'relation',''),'copropietari'), nullif(x->>'property_id','')::uuid)
      returning id into v_rel;
      x := x || jsonb_build_object('id', v_rel);
    end if;
    update public.client_related_persons set
      relation = coalesce(nullif(x->>'relation',''),'copropietari'),
      property_id = nullif(x->>'property_id','')::uuid,
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

revoke execute on function public.save_client(jsonb) from public, anon;

-- ---------------------------------------------------------------------
-- 3-5. Taules de configuració
-- ---------------------------------------------------------------------
create table if not exists public.admi_settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

create table if not exists public.admi_languages (
  code       text primary key check (code ~ '^[a-z]{2,5}$'),
  name       text not null,
  active     boolean not null default true,
  sort_order integer not null default 0
);
insert into public.admi_languages (code, name, sort_order) values
  ('ca','Català',1), ('es','Castellà',2), ('en','Anglès',3), ('fr','Francès',4), ('de','Alemany',5),
  ('nl','Neerlandès',6), ('it','Italià',7), ('pt','Portuguès',8), ('sv','Suec',9), ('no','Noruec',10),
  ('da','Danès',11), ('ru','Rus',12)
on conflict (code) do nothing;

create table if not exists public.admi_role_permissions (
  role       text not null check (role in ('admin','oficina','consulta')),
  section    text not null,
  can_view   boolean not null default true,
  can_create boolean not null default false,
  can_edit   boolean not null default false,
  can_delete boolean not null default false,
  primary key (role, section)
);

do $$
declare t text;
begin
  foreach t in array array['admi_settings','admi_languages','admi_role_permissions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_read', t);
    execute format('drop policy if exists %I on public.%I', t||'_write', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.app_can_read())', t||'_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.app_is_admin()) with check (public.app_is_admin())', t||'_write', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 7. Canvi d'any
-- ---------------------------------------------------------------------
create or replace function public.admi_change_year(p_year integer, p_copy boolean default true)
returns integer language plpgsql security invoker set search_path = public as $$
declare n integer := 0;
begin
  if not public.app_is_admin() then raise exception 'Només un administrador pot canviar l''any'; end if;
  if p_year < 2000 or p_year > 2100 then raise exception 'Any incorrecte: %', p_year; end if;

  insert into public.admi_settings (key, value) values ('working_year', to_jsonb(p_year))
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();

  if p_copy then
    insert into public.property_taxes (property_id, tax_year, holder_name, revaluation_pct, cadastral_value, cadastral_ref,
      tax_rate, class, billing, units, reg_owner, purchase_date, deed_price, protocol_number, notary, deed_type)
    select distinct on (t.property_id) t.property_id, p_year, t.holder_name, t.revaluation_pct, t.cadastral_value, t.cadastral_ref,
      t.tax_rate, t.class, t.billing, t.units, t.reg_owner, t.purchase_date, t.deed_price, t.protocol_number, t.notary, t.deed_type
      from public.property_taxes t
      join public.properties p on p.id = t.property_id and p.status = 'active'
     where t.tax_year < p_year
       and not exists (select 1 from public.property_taxes x where x.property_id = t.property_id and x.tax_year = p_year)
     order by t.property_id, t.tax_year desc;
    get diagnostics n = row_count;
  end if;
  return n;
end $$;
revoke execute on function public.admi_change_year(integer, boolean) from public, anon;

-- ---------------------------------------------------------------------
-- 6. Còpies de seguretat en SQL (es poden enganxar a l'SQL Editor)
-- ---------------------------------------------------------------------
create table if not exists public.admi_backups (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  created_by   uuid references public.profiles(id) on delete set null,
  kind         text not null check (kind in ('auto','manual')),
  tables_count integer not null default 0,
  rows_count   bigint not null default 0,
  size_bytes   bigint not null default 0,
  content      text not null
);
alter table public.admi_backups enable row level security;
drop policy if exists admi_backups_read on public.admi_backups;
create policy admi_backups_read on public.admi_backups for select to authenticated using (public.app_is_admin());

create or replace function public.admi_run_backup(p_kind text default 'manual')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  t record; v_cols text; v_n bigint; v_json text;
  v_sql text; v_tables integer := 0; v_rows bigint := 0; v_id uuid;
begin
  -- Des de l'app només un administrador; el planificador (pg_cron) no té usuari
  if auth.uid() is not null and not public.app_is_admin() then
    raise exception 'Només un administrador pot fer còpies de seguretat';
  end if;

  v_sql := '-- Còpia de seguretat MareMontis · ' || to_char(now() at time zone 'Europe/Madrid', 'DD/MM/YYYY HH24:MI') || E'\n'
        || E'-- Per recuperar-la: obrir Supabase → SQL Editor, enganxar aquest text i prémer Run.\n'
        || E'-- Les taules han d''estar buides (o buidar-les abans amb TRUNCATE); les fotos no s''hi inclouen.\n'
        || E'begin;\nset session_replication_role = replica;\n\n';

  for t in select c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace
            where s.nspname = 'public' and c.relkind = 'r' and c.relname <> 'admi_backups' order by c.relname loop
    select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into v_cols
      from information_schema.columns
     where table_schema = 'public' and table_name = t.relname and is_generated = 'NEVER';
    execute format('select count(*), coalesce(json_agg(x), ''[]'')::text from public.%I x', t.relname) into v_n, v_json;
    v_tables := v_tables + 1; v_rows := v_rows + v_n;
    v_sql := v_sql || format(E'-- %s (%s files)\n', t.relname, v_n);
    if v_n > 0 then
      v_sql := v_sql || format(E'insert into public.%I (%s) overriding system value select %s from json_populate_recordset(null::public.%I, %L::json);\n\n',
                               t.relname, v_cols, v_cols, t.relname, v_json);
    end if;
  end loop;
  v_sql := v_sql || E'set session_replication_role = origin;\ncommit;\n';

  insert into public.admi_backups (created_by, kind, tables_count, rows_count, size_bytes, content)
  values (auth.uid(), case when p_kind = 'auto' then 'auto' else 'manual' end, v_tables, v_rows, octet_length(v_sql), v_sql)
  returning id into v_id;

  -- Es guarden les últimes 30 còpies automàtiques
  delete from public.admi_backups where kind = 'auto'
     and id not in (select id from public.admi_backups where kind = 'auto' order by created_at desc limit 30);
  return v_id;
end $$;
revoke execute on function public.admi_run_backup(text) from public, anon;
grant execute on function public.admi_run_backup(text) to authenticated;

-- Planificador: cada hora comprova si toca fer la còpia (hora d'Espanya, tingui en compte l'horari d'estiu)
create extension if not exists pg_cron;

create or replace function public.admi_backup_tick()
returns void language plpgsql security definer set search_path = public as $$
declare s jsonb; v_now timestamp := now() at time zone 'Europe/Madrid';
begin
  select value into s from public.admi_settings where key = 'backup_schedule';
  if s is null or not coalesce((s->>'enabled')::boolean, false) then return; end if;
  if extract(hour from v_now)::int <> coalesce(split_part(s->>'hour', ':', 1), '2')::int then return; end if;
  if s->>'frequency' = 'weekly' and extract(dow from v_now)::int <> coalesce((s->>'weekday')::int, 1) then return; end if;
  perform public.admi_run_backup('auto');
end $$;
revoke execute on function public.admi_backup_tick() from public, anon, authenticated;

create or replace function public.admi_schedule_backups(p_enabled boolean, p_frequency text, p_hour integer, p_minute integer, p_weekday integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.app_is_admin() then raise exception 'Només un administrador pot programar les còpies'; end if;
  if p_frequency not in ('daily','weekly') or p_hour not between 0 and 23 or p_minute not between 0 and 59 or p_weekday not between 0 and 6 then
    raise exception 'Programació incorrecta';
  end if;
  insert into public.admi_settings (key, value) values ('backup_schedule', jsonb_build_object(
    'enabled', p_enabled, 'frequency', p_frequency, 'hour', lpad(p_hour::text, 2, '0') || ':' || lpad(p_minute::text, 2, '0'), 'weekday', p_weekday))
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = auth.uid();
  perform cron.unschedule(jobid) from cron.job where jobname = 'admi_copia_automatica';
  if p_enabled then
    perform cron.schedule('admi_copia_automatica', p_minute || ' * * * *', 'select public.admi_backup_tick()');
  end if;
end $$;
revoke execute on function public.admi_schedule_backups(boolean, text, integer, integer, integer) from public, anon;
grant execute on function public.admi_schedule_backups(boolean, text, integer, integer, integer) to authenticated;

-- Per defecte: una còpia cada dia a les 2 de la matinada
insert into public.admi_settings (key, value)
values ('backup_schedule', '{"enabled": true, "frequency": "daily", "hour": "02:00", "weekday": 1}')
on conflict (key) do nothing;
select cron.unschedule(jobid) from cron.job where jobname = 'admi_copia_automatica';
select cron.schedule('admi_copia_automatica', '0 * * * *', 'select public.admi_backup_tick()');
