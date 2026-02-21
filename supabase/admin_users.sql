create table if not exists public.admin_users (
  username text primary key,
  password text not null,
  role text not null default 'viewer',
  governorate text,
  city text,
  phone text,
  address text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_admin_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at
before update on public.admin_users
for each row execute procedure public.touch_admin_users_updated_at();

alter table public.admin_users enable row level security;

drop policy if exists admin_users_read_all on public.admin_users;
create policy admin_users_read_all
on public.admin_users
for select
to anon, authenticated
using (true);

drop policy if exists admin_users_insert_all on public.admin_users;
create policy admin_users_insert_all
on public.admin_users
for insert
to anon, authenticated
with check (true);

drop policy if exists admin_users_update_all on public.admin_users;
create policy admin_users_update_all
on public.admin_users
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists admin_users_delete_all on public.admin_users;
create policy admin_users_delete_all
on public.admin_users
for delete
to anon, authenticated
using (true);
