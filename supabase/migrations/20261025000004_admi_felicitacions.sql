-- Felicitacions automàtiques per correu: aniversari del client i Nadal / Any Nou.
--   1. Configuració a admi_settings (clau 'greetings')
--   2. Textos per idioma a admi_email_templates (tipus felicitacio_aniversari / felicitacio_nadal)
--   3. admi_greeting_log: registre de cada enviament (no s'envia mai dues vegades el mateix any)
--   4. admi_greetings_due: a qui toca felicitar avui
--   5. Servidor de correu (SMTP) de l'empresa, configurable a Configuració → Correu sortint.
--      La contrasenya es guarda xifrada (Vault) i cap usuari la pot tornar a llegir.
--   6. Planificador (pg_cron + pg_net): cada hora comprova si és l'hora d'enviar i crida
--      la funció del servidor «admi-felicitacions», que és la que envia els correus.

-- ---------------------------------------------------------------------
-- 1. Configuració per defecte (tot desactivat fins que l'oficina ho activi).
--    images: imatge de cada felicitació per idioma, {"felicitacio_nadal": {"*": camí, "ca": camí…}} («*» = la resta d'idiomes)
-- ---------------------------------------------------------------------
insert into public.admi_settings (key, value)
values ('greetings', '{"birthday_enabled": false, "christmas_enabled": false, "christmas_day": "12-20", "hour": 9, "images": {}}')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 2. Textos inicials (pendents de revisar)
-- ---------------------------------------------------------------------
insert into public.admi_email_templates (kind, language, subject, body, reviewed) values
('felicitacio_aniversari', 'ca', 'Per molts anys, {{nom}}!', E'Benvolgut/da {{client}},\n\nAvui és un dia especial i no volíem deixar-lo passar sense desitjar-vos un molt feliç aniversari.\n\nUna salutació molt cordial de tot l''equip,\nMareMontis', false),
('felicitacio_aniversari', 'es', '¡Feliz cumpleaños, {{nom}}!', E'Estimado/a {{client}}:\n\nHoy es un día especial y no queríamos dejarlo pasar sin desearle un muy feliz cumpleaños.\n\nUn saludo muy cordial de todo el equipo,\nMareMontis', false),
('felicitacio_aniversari', 'en', 'Happy birthday, {{nom}}!', E'Dear {{client}},\n\nToday is a special day and we did not want to let it pass without wishing you a very happy birthday.\n\nWarm regards from the whole team,\nMareMontis', false),
('felicitacio_aniversari', 'fr', 'Joyeux anniversaire, {{nom}} !', E'Chère cliente, cher client {{client}},\n\nAujourd''hui est un jour spécial et nous tenions à vous souhaiter un très joyeux anniversaire.\n\nBien cordialement, toute l''équipe\nMareMontis', false),
('felicitacio_aniversari', 'de', 'Alles Gute zum Geburtstag, {{nom}}!', E'Liebe/r {{client}},\n\nheute ist ein besonderer Tag, und wir möchten Ihnen von Herzen alles Gute zum Geburtstag wünschen.\n\nHerzliche Grüße vom ganzen Team\nMareMontis', false),
('felicitacio_aniversari', 'nl', 'Gefeliciteerd, {{nom}}!', E'Beste {{client}},\n\nVandaag is een bijzondere dag en we willen u van harte feliciteren met uw verjaardag.\n\nHartelijke groeten van het hele team,\nMareMontis', false),
('felicitacio_nadal', 'ca', 'Bon Nadal i feliç {{any}}!', E'Benvolgut/da {{client}},\n\nUs desitgem un bon Nadal i un feliç any {{any}}. Moltes gràcies per la vostra confiança.\n\nUna salutació molt cordial de tot l''equip,\nMareMontis', false),
('felicitacio_nadal', 'es', '¡Feliz Navidad y próspero {{any}}!', E'Estimado/a {{client}}:\n\nLe deseamos una feliz Navidad y un próspero año {{any}}. Muchas gracias por su confianza.\n\nUn saludo muy cordial de todo el equipo,\nMareMontis', false),
('felicitacio_nadal', 'en', 'Merry Christmas and a happy {{any}}!', E'Dear {{client}},\n\nWe wish you a merry Christmas and a happy new year {{any}}. Thank you very much for your trust.\n\nWarm regards from the whole team,\nMareMontis', false),
('felicitacio_nadal', 'fr', 'Joyeux Noël et bonne année {{any}} !', E'Chère cliente, cher client {{client}},\n\nNous vous souhaitons un joyeux Noël et une très bonne année {{any}}. Merci beaucoup pour votre confiance.\n\nBien cordialement, toute l''équipe\nMareMontis', false),
('felicitacio_nadal', 'de', 'Frohe Weihnachten und ein gutes Jahr {{any}}!', E'Liebe/r {{client}},\n\nwir wünschen Ihnen frohe Weihnachten und ein glückliches neues Jahr {{any}}. Vielen Dank für Ihr Vertrauen.\n\nHerzliche Grüße vom ganzen Team\nMareMontis', false),
('felicitacio_nadal', 'nl', 'Fijne feestdagen en een gelukkig {{any}}!', E'Beste {{client}},\n\nWij wensen u fijne kerstdagen en een gelukkig nieuwjaar {{any}}. Hartelijk dank voor uw vertrouwen.\n\nHartelijke groeten van het hele team,\nMareMontis', false)
on conflict (kind, language) do nothing;

-- ---------------------------------------------------------------------
-- 3. Registre d'enviaments
-- ---------------------------------------------------------------------
create table if not exists public.admi_greeting_log (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references public.admi_clients(id) on delete set null,
  kind       text not null check (kind in ('felicitacio_aniversari', 'felicitacio_nadal')),
  year       integer not null,
  email      text not null default '',
  language   text,
  status     text not null check (status in ('sent', 'error', 'test')),
  error      text,
  sent_at    timestamptz not null default now()
);
-- Com a molt un enviament correcte per client, tipus i any
create unique index if not exists admi_greeting_log_once on public.admi_greeting_log (client_id, kind, year) where status = 'sent';
create index if not exists admi_greeting_log_sent_at on public.admi_greeting_log (sent_at desc);
alter table public.admi_greeting_log enable row level security;
drop policy if exists admi_greeting_log_read on public.admi_greeting_log;
create policy admi_greeting_log_read on public.admi_greeting_log for select to authenticated using (public.app_can_read());
-- Només escriu la funció del servidor (service_role), que no passa per RLS

-- ---------------------------------------------------------------------
-- 4. A qui toca felicitar avui (només clients actius amb e-mail)
-- ---------------------------------------------------------------------
create or replace function public.admi_greetings_due(p_today date)
returns table (client_id uuid, kind text, year integer, client_name text, first_name text, email text, language text)
language sql stable security definer set search_path = public as $$
  with cfg as (select coalesce(value, '{}'::jsonb) v from public.admi_settings where key = 'greetings'),
  c as (
    select c.id, c.birth_date, coalesce(nullif(c.language, ''), 'en') language,
           trim(coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, '')) client_name,
           coalesce(nullif(trim(c.first_name), ''), trim(c.last_name)) first_name,
           (select e.email from public.admi_client_emails e where e.client_id = c.id and trim(e.email) <> ''
             order by e.is_primary desc, e.sort_order limit 1) email
    from public.admi_clients c
    where c.status = 'active'
  ),
  due as (
    -- Aniversari: avui (els nascuts el 29 de febrer, el 28 si l'any no és de traspàs)
    select c.*, 'felicitacio_aniversari'::text kind, extract(year from p_today)::int yr
    from c, cfg
    where coalesce((cfg.v->>'birthday_enabled')::boolean, false) and c.birth_date is not null
      and (to_char(c.birth_date, 'MM-DD') = to_char(p_today, 'MM-DD')
           or (to_char(c.birth_date, 'MM-DD') = '02-29' and to_char(p_today, 'MM-DD') = '02-28'
               and to_char((p_today + 1), 'MM-DD') = '03-01'))
    union all
    -- Nadal: el dia triat (o els dies següents fins a final d'any, si aquell dia no s'ha pogut enviar)
    select c.*, 'felicitacio_nadal', extract(year from p_today)::int
    from c, cfg
    where coalesce((cfg.v->>'christmas_enabled')::boolean, false)
      and to_char(p_today, 'MM-DD') >= coalesce(cfg.v->>'christmas_day', '12-20')
  )
  select d.id, d.kind, d.yr, d.client_name, d.first_name, d.email, d.language
  from due d
  where d.email is not null
    and not exists (select 1 from public.admi_greeting_log l
                    where l.client_id = d.id and l.kind = d.kind and l.year = d.yr and l.status = 'sent');
$$;
revoke execute on function public.admi_greetings_due(date) from public, anon, authenticated;
grant execute on function public.admi_greetings_due(date) to service_role;

-- ---------------------------------------------------------------------
-- 5. Servidor de correu sortint (cada empresa posa el seu)
-- ---------------------------------------------------------------------
insert into public.admi_settings (key, value)
values ('smtp', '{"host": "", "port": 465, "user": "", "from_email": "", "from_name": ""}')
on conflict (key) do nothing;

create or replace function public.admi_set_smtp_password(p_password text)
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.app_is_admin() then raise exception 'Només un administrador pot canviar la contrasenya del correu'; end if;
  select id into v_id from vault.secrets where name = 'admi_smtp_password';
  if v_id is null then perform vault.create_secret(coalesce(p_password, ''), 'admi_smtp_password');
  else perform vault.update_secret(v_id, coalesce(p_password, '')); end if;
end $$;
revoke execute on function public.admi_set_smtp_password(text) from public, anon;
grant execute on function public.admi_set_smtp_password(text) to authenticated;

-- Només diu si n'hi ha una de desada (mai la retorna)
create or replace function public.admi_smtp_password_saved()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'admi_smtp_password' and coalesce(decrypted_secret, '') <> '');
$$;
revoke execute on function public.admi_smtp_password_saved() from public, anon;
grant execute on function public.admi_smtp_password_saved() to authenticated;

-- Només la funció del servidor la pot llegir
create or replace function public.admi_smtp_password()
returns text language sql stable security definer set search_path = public as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'admi_smtp_password';
$$;
revoke execute on function public.admi_smtp_password() from public, anon, authenticated;
grant execute on function public.admi_smtp_password() to service_role;

-- ---------------------------------------------------------------------
-- 6. Planificador
-- ---------------------------------------------------------------------
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Clau interna perquè només el planificador pugui demanar l'enviament diari
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'admi_greetings_cron') then
    perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'admi_greetings_cron');
  end if;
end $$;

create or replace function public.admi_greetings_cron_ok(p_secret text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'admi_greetings_cron' and decrypted_secret = p_secret);
$$;
revoke execute on function public.admi_greetings_cron_ok(text) from public, anon, authenticated;
grant execute on function public.admi_greetings_cron_ok(text) to service_role;

-- Cada hora, des de l'hora triada (hora d'Espanya) fins a mitjanit, si hi ha alguna felicitació activa crida la
-- funció del servidor. Cada crida envia un grup de correus; les següents continuen amb els que falten.
create or replace function public.admi_greetings_tick()
returns void language plpgsql security definer set search_path = public as $$
declare s jsonb; v_now timestamp := now() at time zone 'Europe/Madrid'; v_secret text;
begin
  select value into s from public.admi_settings where key = 'greetings';
  if s is null or not (coalesce((s->>'birthday_enabled')::boolean, false) or coalesce((s->>'christmas_enabled')::boolean, false)) then return; end if;
  if extract(hour from v_now)::int < coalesce((s->>'hour')::int, 9) then return; end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'admi_greetings_cron';
  perform net.http_post(
    -- Adreça del projecte Supabase (en una instal·lació per a una altra empresa, canviar-hi la referència del projecte)
    url := 'https://gawnzjkxralfimlcnury.supabase.co/functions/v1/admi-felicitacions',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := jsonb_build_object('mode', 'daily'),
    timeout_milliseconds := 60000);
end $$;
revoke execute on function public.admi_greetings_tick() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'admi_felicitacions';
select cron.schedule('admi_felicitacions', '5 * * * *', 'select public.admi_greetings_tick()');
