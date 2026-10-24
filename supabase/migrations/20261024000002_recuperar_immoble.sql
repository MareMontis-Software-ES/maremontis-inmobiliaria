-- Històric de baixes (PDF pàg. 8-9): «Recuperar immoble» preguntant a quin
-- propietari pertany. Tot en una transacció: torna la finca a activa, li dona
-- un núm. d'administració lliure si el seu ja l'usa una altra finca, i si es
-- tria un altre client, aquest passa a ser l'únic titular (100 %).
create or replace function public.recover_property(p_property uuid, p_client uuid default null)
returns integer language plpgsql security invoker set search_path = public as $$
declare
  v_num integer;
begin
  if not public.app_can_write() then
    raise exception 'No tens permís per recuperar immobles';
  end if;
  select admin_number into v_num from properties where id = p_property and status = 'baixa' for update;
  if not found then
    raise exception 'La finca no existeix o no està donada de baixa';
  end if;
  if exists (select 1 from properties where admin_number = v_num and status = 'active' and id <> p_property) then
    v_num := public.next_free_admin_number();
  end if;
  update properties set status = 'active', baixa_date = null, baixa_by = null, admin_number = v_num where id = p_property;

  if p_client is not null and not exists (
       select 1 from property_owners where property_id = p_property and client_id = p_client and is_main) then
    delete from property_owners where property_id = p_property;
    insert into property_owners (property_id, client_id, ownership_percentage, is_main) values (p_property, p_client, 100, true);
  end if;
  return v_num;
end $$;

revoke execute on function public.recover_property(uuid, uuid) from public, anon;
grant execute on function public.recover_property(uuid, uuid) to authenticated;
