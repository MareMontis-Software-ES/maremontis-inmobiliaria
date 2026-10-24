-- Buscador general de la barra superior: clients (nom, codi, DNI/NIE/passaport,
-- telèfon, e-mail), finques (adreça, núm. d'administració), matrícules i
-- cònjuges/copropietaris. SECURITY INVOKER: respecta les regles RLS de l'usuari.
create extension if not exists unaccent with schema extensions;

create or replace function public.norm_txt(v text)
returns text language sql immutable parallel safe set search_path = public, extensions as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(v, '')))
$$;

create or replace function public.global_search(q text, max_rows integer default 8)
returns table (kind text, id uuid, client_id uuid, property_id uuid, title text, subtitle text, inactive boolean)
language sql stable security invoker set search_path = public, extensions as $$
  with p as (
    select '%' || public.norm_txt(trim(q)) || '%' as pat,
           regexp_replace(q, '\D', '', 'g') as digits,
           upper(regexp_replace(q, '[\s\-\.]', '', 'g')) as doc,
           trim(q) as raw
  )
  (select 'client', c.id, c.id, null::uuid,
          trim(c.first_name || ' ' || c.last_name),
          concat_ws(' · ', 'codi ' || c.client_code, coalesce(c.dni, c.nie, c.passport),
                    (select ph.country_prefix || ' ' || ph.phone_number from client_phones ph where ph.client_id = c.id order by ph.sort_order limit 1)),
          c.status <> 'active'
     from clients c, p
    where public.norm_txt(c.first_name || ' ' || c.last_name) like p.pat
       or public.norm_txt(c.last_name || ' ' || c.first_name) like p.pat
       or public.norm_txt(c.short_name) like p.pat
       or c.client_code::text = p.raw or c.account_code = p.raw
       or (length(p.doc) >= 4 and (upper(replace(c.dni, ' ', '')) like '%' || p.doc || '%'
                                or upper(replace(c.nie, ' ', '')) like '%' || p.doc || '%'
                                or upper(replace(c.passport, ' ', '')) like '%' || p.doc || '%'))
       or (length(p.digits) >= 4 and p.raw !~ '[[:alpha:]]' and exists (select 1 from client_phones ph where ph.client_id = c.id
             and regexp_replace(ph.country_prefix || ph.phone_number, '\D', '', 'g') like '%' || p.digits || '%'))
       or (length(p.raw) >= 3 and exists (select 1 from client_emails e where e.client_id = c.id and lower(e.email) like lower('%' || p.raw || '%')))
    order by c.status, c.last_name limit max_rows)
  union all
  (select 'finca', pr.id, o.client_id, pr.id,
          concat_ws(' ', pr.street_type, pr.address),
          concat_ws(' · ', 'adm. ' || pr.admin_number, pr.municipality, (select trim(cl.first_name || ' ' || cl.last_name) from clients cl where cl.id = o.client_id),
                    case when pr.status = 'baixa' then 'BAIXA' end),
          pr.status <> 'active'
     from properties pr
     left join lateral (select po.client_id from property_owners po where po.property_id = pr.id and po.client_id is not null
                         order by po.is_main desc limit 1) o on true, p
    where public.norm_txt(concat_ws(' ', pr.street_type, pr.address)) like p.pat
       or public.norm_txt(pr.address) like p.pat
       or public.norm_txt(pr.aeat_name) like p.pat
       or pr.admin_number::text = p.raw
    order by pr.status, pr.admin_number limit max_rows)
  union all
  (select 'matricula', v.id, v.client_id, null::uuid,
          v.plate, concat_ws(' · ', nullif(concat_ws(' ', v.brand, v.model), ''), (select trim(cl.first_name || ' ' || cl.last_name) from clients cl where cl.id = v.client_id)),
          false
     from client_vehicles v, p
    where length(p.doc) >= 2 and upper(regexp_replace(v.plate, '[\s\-\.]', '', 'g')) like '%' || p.doc || '%'
    limit max_rows)
  union all
  (select case when r.relation = 'conjuge' then 'conjuge' else 'copropietari' end, r.id, r.client_id, null::uuid,
          trim(r.first_name || ' ' || r.last_name),
          concat_ws(' · ', case when r.relation = 'conjuge' then 'cònjuge de ' else 'copropietari amb ' end
                           || (select trim(cl.first_name || ' ' || cl.last_name) from clients cl where cl.id = r.client_id),
                    coalesce(r.dni, r.nie, r.passport)),
          false
     from client_related_persons r, p
    where public.norm_txt(r.first_name || ' ' || r.last_name) like p.pat
       or public.norm_txt(r.last_name || ' ' || r.first_name) like p.pat
       or (length(p.doc) >= 4 and (upper(replace(r.dni, ' ', '')) like '%' || p.doc || '%'
                                or upper(replace(r.nie, ' ', '')) like '%' || p.doc || '%'
                                or upper(replace(r.passport, ' ', '')) like '%' || p.doc || '%'))
    limit max_rows)
$$;

revoke execute on function public.global_search(text, integer) from public, anon;
grant execute on function public.global_search(text, integer) to authenticated;
