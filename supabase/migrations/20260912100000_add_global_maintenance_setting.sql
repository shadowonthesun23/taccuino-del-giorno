create table public.site_settings (
  id text primary key check (id = 'global'),
  maintenance_enabled boolean not null default false
);

insert into public.site_settings (id, maintenance_enabled)
values ('global', false);

alter table public.site_settings enable row level security;

revoke all on public.site_settings from anon, authenticated;
