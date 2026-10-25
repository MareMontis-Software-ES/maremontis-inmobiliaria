-- Tipus de contracte: altres opcions incloses que l'usuària escriu a mà
-- (a més de les fixes: revisions, renda 210, visites, claus i rebuts).
alter table public.admi_contract_types
  add column if not exists other_services text[] not null default '{}';

comment on column public.admi_contract_types.other_services is
  'Altres serveis inclosos al contracte, amb text lliure';
