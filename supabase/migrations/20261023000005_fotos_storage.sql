-- Espai d'emmagatzematge privat per a les fotos d'inventari i de revisions.
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false)
on conflict (id) do nothing;

create policy fotos_read on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and public.app_can_read());
create policy fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.app_can_write());
create policy fotos_update on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and public.app_can_write());
create policy fotos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.app_can_write());
