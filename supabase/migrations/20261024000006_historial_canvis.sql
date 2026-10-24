-- Historial de canvis (qui va canviar què i quan) per a les fitxes de client,
-- finca i impostos. Un trigger guarda a audit_log cada alta, modificació i
-- esborrat; en les modificacions només els camps que canvien. Les claus
-- d'internet i d'alarma no es guarden mai (surt «••••»).
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  changed_at  timestamptz not null default now(),
  tx          bigint not null default txid_current(),   -- agrupa els canvis d'un mateix «Gravar»
  user_id     uuid,
  user_name   text,
  table_name  text not null,
  action      text not null check (action in ('insert','update','delete')),
  record_id   uuid,
  client_id   uuid,
  property_id uuid,
  old_data    jsonb,
  new_data    jsonb
);
create index if not exists audit_log_client_idx   on public.audit_log (client_id, changed_at desc);
create index if not exists audit_log_property_idx on public.audit_log (property_id, changed_at desc);

-- Només lectura des de l'app; s'hi escriu exclusivament des del trigger
alter table public.audit_log enable row level security;
drop policy if exists audit_log_read on public.audit_log;
create policy audit_log_read on public.audit_log for select to authenticated using (public.app_can_read());

create or replace function public.tg_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  skip    text[] := array['updated_at','updated_by','created_at','created_by'];
  secrets text[] := array['internet_password','alarm_password_1','alarm_password_2'];
  full_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  o jsonb; n jsonb; oc jsonb := '{}'; nc jsonb := '{}'; k text;
begin
  if tg_op <> 'INSERT' then o := to_jsonb(old) - skip; end if;
  if tg_op <> 'DELETE' then n := to_jsonb(new) - skip; end if;
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(n) loop
      if (o -> k) is distinct from (n -> k) then
        oc := oc || jsonb_build_object(k, o -> k);
        nc := nc || jsonb_build_object(k, n -> k);
      end if;
    end loop;
    if oc = '{}'::jsonb then return null; end if;   -- res a guardar (p. ex. només updated_at)
    o := oc; n := nc;
  end if;
  foreach k in array secrets loop
    if o ? k and jsonb_typeof(o -> k) <> 'null' then o := jsonb_set(o, array[k], '"••••"'); end if;
    if n ? k and jsonb_typeof(n -> k) <> 'null' then n := jsonb_set(n, array[k], '"••••"'); end if;
  end loop;

  insert into audit_log (user_id, user_name, table_name, action, record_id, client_id, property_id, old_data, new_data)
  values (auth.uid(), (select full_name from profiles where id = auth.uid()), tg_table_name, lower(tg_op),
          (full_row ->> 'id')::uuid,
          case when tg_table_name = 'clients' then (full_row ->> 'id')::uuid else (full_row ->> 'client_id')::uuid end,
          case when tg_table_name = 'properties' then (full_row ->> 'id')::uuid else (full_row ->> 'property_id')::uuid end,
          o, n);
  return null;
end $$;
revoke execute on function public.tg_audit() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['clients','client_addresses','client_phones','client_emails','client_related_persons',
                           'client_vehicles','properties','property_owners','property_taxes']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I
                    for each row execute function public.tg_audit()', t || '_audit', t);
  end loop;
end $$;
