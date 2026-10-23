-- Alertes automàtiques de venciments de la finca (PDF pàg. 4):
-- assegurança, cèdula d'habitabilitat i certificat energètic. També avisa de
-- les claus no retornades a la data prevista. S'afegeixen a la funció que ja
-- crea les de passaports i aniversaris (no duplica alertes existents).
create or replace function public.generate_document_alerts(days_ahead integer default 60)
returns integer language plpgsql set search_path = public as $$
declare n integer := 0; r record;
begin
  perform pg_advisory_xact_lock(hashtext('generate_document_alerts'));

  -- Passaports del client i de cònjuge/copropietaris
  for r in
    select c.id client_id, null::uuid property_id, 'caducitat_document' kind,
           'Caducitat passaport: ' || c.first_name || ' ' || c.last_name title, c.passport_expiry due
      from clients c
     where c.status = 'active' and c.passport_expiry is not null and c.passport_expiry <= current_date + days_ahead
    union all
    select p.client_id, null, 'caducitat_document', 'Caducitat passaport: ' || p.first_name || ' ' || p.last_name, p.passport_expiry
      from client_related_persons p join clients c on c.id = p.client_id
     where c.status = 'active' and p.passport_expiry is not null and p.passport_expiry <= current_date + days_ahead
    union all
    -- Venciments de la finca (s'assignen al titular principal)
    select o.client_id, pr.id, 'venciment', v.label || ': ' || coalesce(pr.street_type || ' ', '') || pr.address, v.due
      from properties pr
      join property_owners o on o.property_id = pr.id and o.is_main and o.client_id is not null
      cross join lateral (values ('Venciment assegurança', pr.insurance_end),
                                 ('Caducitat cèdula d''habitabilitat', pr.habitability_expiry),
                                 ('Caducitat certificat energètic', pr.energy_cert_expiry)) v(label, due)
     where pr.status = 'active' and v.due is not null and v.due <= current_date + days_ahead
    union all
    -- Claus no retornades a temps
    select o.client_id, pr.id, 'claus', 'Clau no retornada: ' || coalesce(pr.street_type || ' ', '') || pr.address, k.expected_return
      from key_movements k
      join properties pr on pr.id = k.property_id
      join property_owners o on o.property_id = pr.id and o.is_main and o.client_id is not null
     where k.returned_at is null and k.expected_return < current_date
  loop
    if not exists (select 1 from alerts a
                    where a.client_id = r.client_id and a.alert_type = r.kind
                      and a.title = r.title and a.due_date = r.due) then
      insert into alerts (client_id, property_id, alert_type, title, content, due_date)
      values (r.client_id, r.property_id, r.kind, r.title, 'Data: ' || to_char(r.due,'DD/MM/YYYY'), r.due);
      n := n + 1;
    end if;
  end loop;

  -- Aniversaris del client
  for r in
    select c.id client_id, 'Aniversari: ' || c.first_name || ' ' || c.last_name title,
           (make_date(extract(year from current_date)::int, extract(month from c.birth_date)::int, 1)
             + (extract(day from c.birth_date)::int - 1)
             + case when (make_date(extract(year from current_date)::int, extract(month from c.birth_date)::int, 1)
                          + (extract(day from c.birth_date)::int - 1)) < current_date
                    then interval '1 year' else interval '0' end)::date due
      from clients c
     where c.status = 'active' and c.birth_date is not null
  loop
    if r.due <= current_date + days_ahead and not exists (
        select 1 from alerts a where a.client_id = r.client_id and a.alert_type = 'naixement' and a.due_date = r.due) then
      insert into alerts (client_id, alert_type, title, due_date) values (r.client_id, 'naixement', r.title, r.due);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

revoke execute on function public.generate_document_alerts(integer) from public, anon;
grant execute on function public.generate_document_alerts(integer) to authenticated;
