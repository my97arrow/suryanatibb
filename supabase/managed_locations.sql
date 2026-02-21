create table if not exists public.managed_locations (
  governorate text not null,
  city text not null,
  created_at timestamptz not null default now(),
  primary key (governorate, city)
);

alter table public.managed_locations enable row level security;

drop policy if exists managed_locations_read_all on public.managed_locations;
create policy managed_locations_read_all
on public.managed_locations
for select
to anon, authenticated
using (true);

drop policy if exists managed_locations_insert_all on public.managed_locations;
create policy managed_locations_insert_all
on public.managed_locations
for insert
to anon, authenticated
with check (true);

drop policy if exists managed_locations_update_all on public.managed_locations;
create policy managed_locations_update_all
on public.managed_locations
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists managed_locations_delete_all on public.managed_locations;
create policy managed_locations_delete_all
on public.managed_locations
for delete
to anon, authenticated
using (true);
