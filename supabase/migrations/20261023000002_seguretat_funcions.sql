-- Ajustos de seguretat recomanats per l'assessor de Supabase.
-- 1) search_path fix a totes les funcions
alter function public.tg_touch() set search_path = public;
alter function public.app_role() set search_path = public;
alter function public.app_can_read() set search_path = public;
alter function public.app_can_write() set search_path = public;
alter function public.app_is_admin() set search_path = public;
alter function public.next_client_code() set search_path = public;
alter function public.next_free_admin_number() set search_path = public;
alter function public.save_client(jsonb) set search_path = public;
alter function public.generate_document_alerts(integer) set search_path = public;

-- 2) Funcions internes: no s'han de poder cridar des de l'API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.app_role() from public, anon;
grant  execute on function public.app_role() to authenticated;  -- la necessiten les regles RLS
revoke execute on function public.save_client(jsonb) from public, anon;
revoke execute on function public.generate_document_alerts(integer) from public, anon;
revoke execute on function public.next_client_code() from public, anon;
revoke execute on function public.next_free_admin_number() from public, anon;
