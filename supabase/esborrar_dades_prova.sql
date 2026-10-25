-- Esborra TOTES les dades d'exemple (les que porten «DADES DE PROVA»).
-- Executar quan es comencin a entrar dades reals.
delete from public.admi_alerts where client_id in (select id from public.admi_clients where observations = 'DADES DE PROVA');
delete from public.admi_alerts where content = 'DADES DE PROVA';
delete from public.admi_key_movements where observations = 'DADES DE PROVA';
delete from public.admi_incidents where description like '%(DADES DE PROVA)';
delete from public.admi_properties where observations = 'DADES DE PROVA';   -- arrossega titulars i impostos
delete from public.admi_clients where observations = 'DADES DE PROVA';      -- arrossega adreces, telèfons, e-mails, cònjuges, vehicles
delete from public.admi_tradespeople where observations = 'DADES DE PROVA';
delete from public.admi_contract_types where description like '%(exemple)';
delete from public.admi_zones where code in (1,2,3,4) and not exists (select 1 from public.admi_properties p where p.zone = admi_zones.code);
-- (l'esquema old_demo ja s'ha esborrat a la migració 20261025000002)
