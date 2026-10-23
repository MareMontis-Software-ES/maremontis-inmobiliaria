-- Esborra TOTES les dades d'exemple (les que porten «DADES DE PROVA»).
-- Executar quan es comencin a entrar dades reals.
delete from public.alerts where client_id in (select id from public.clients where observations = 'DADES DE PROVA');
delete from public.alerts where content = 'DADES DE PROVA';
delete from public.key_movements where observations = 'DADES DE PROVA';
delete from public.incidents where description like '%(DADES DE PROVA)';
delete from public.properties where observations = 'DADES DE PROVA';   -- arrossega titulars i impostos
delete from public.clients where observations = 'DADES DE PROVA';      -- arrossega adreces, telèfons, e-mails, cònjuges, vehicles
delete from public.industrials where observations = 'DADES DE PROVA';
delete from public.contract_types where description like '%(exemple)';
delete from public.zones where code in (1,2,3,4) and not exists (select 1 from public.properties p where p.zone = zones.code);
-- Còpia de l'esquema antic de demo (ja no es fa servir):
-- drop schema old_demo cascade;
