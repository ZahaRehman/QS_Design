grant usage on schema public to authenticated;
grant usage on schema public to service_role;

grant select on table public.admin_users to authenticated;
grant select, insert, update, delete on table public.admin_users to service_role;

drop policy if exists admin_users_service_role_all on public.admin_users;
create policy admin_users_service_role_all
on public.admin_users
as permissive
for all
to service_role
using (true)
with check (true);
