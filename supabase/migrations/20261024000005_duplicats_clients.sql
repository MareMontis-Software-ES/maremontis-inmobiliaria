-- Avís de duplicats en donar d'alta o modificar un client: altres clients amb el
-- mateix DNI, NIE o passaport (es compara qualsevol document amb qualsevol altre,
-- sense espais ni guions), el mateix telèfon (només xifres, sense el prefix) o el
-- mateix e-mail. SECURITY INVOKER: respecta les regles RLS.
create or replace function public.find_client_duplicates(
  p_client uuid, p_docs text[], p_phones text[], p_emails text[])
returns table (client_id uuid, client_code integer, name text, status text, field text, value text)
language sql stable security invoker set search_path = public as $$
  with d as (select distinct upper(regexp_replace(x, '[\s\-\.]', '', 'g')) v from unnest(coalesce(p_docs, '{}')) x
              where length(regexp_replace(x, '[\s\-\.]', '', 'g')) >= 5),
       ph as (select distinct regexp_replace(x, '\D', '', 'g') v from unnest(coalesce(p_phones, '{}')) x
              where length(regexp_replace(x, '\D', '', 'g')) >= 6),
       em as (select distinct lower(trim(x)) v from unnest(coalesce(p_emails, '{}')) x where trim(x) like '%@%')
  select c.id, c.client_code, trim(c.first_name || ' ' || c.last_name), c.status, m.field, m.value
    from clients c
    cross join lateral (
      select 'DNI' field, c.dni value from d where d.v = upper(regexp_replace(c.dni, '[\s\-\.]', '', 'g'))
      union all select 'NIE', c.nie from d where d.v = upper(regexp_replace(c.nie, '[\s\-\.]', '', 'g'))
      union all select 'Passaport', c.passport from d where d.v = upper(regexp_replace(c.passport, '[\s\-\.]', '', 'g'))
      union all select 'Telèfon', p.country_prefix || ' ' || p.phone_number from client_phones p join ph on ph.v = regexp_replace(p.phone_number, '\D', '', 'g') where p.client_id = c.id
      union all select 'E-mail', e.email from client_emails e join em on em.v = lower(trim(e.email)) where e.client_id = c.id
    ) m
   where c.id is distinct from p_client
   order by c.client_code, m.field
$$;

revoke execute on function public.find_client_duplicates(uuid, text[], text[], text[]) from public, anon;
grant execute on function public.find_client_duplicates(uuid, text[], text[], text[]) to authenticated;
