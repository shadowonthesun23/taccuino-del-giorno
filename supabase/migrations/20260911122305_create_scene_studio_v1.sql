create table public.scene_drafts (
  scene_id text primary key,
  scene jsonb not null check (jsonb_typeof(scene) = 'object'),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.scene_published (
  scene_id text primary key,
  scene jsonb not null check (jsonb_typeof(scene) = 'object'),
  published_by uuid not null references auth.users(id),
  published_at timestamptz not null default now()
);

create table public.scene_assets (
  id uuid primary key,
  path text not null unique,
  original_name text not null,
  mime_type text not null check (mime_type in ('image/png', 'image/webp')),
  byte_size integer not null check (byte_size between 1 and 1048576),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.scene_drafts enable row level security;
alter table public.scene_published enable row level security;
alter table public.scene_assets enable row level security;

revoke all on public.scene_drafts from anon, authenticated;
revoke all on public.scene_assets from anon, authenticated;
revoke all on public.scene_published from anon, authenticated;
grant select on public.scene_published to anon, authenticated;

create policy "Published home scene is public"
on public.scene_published for select
to anon, authenticated
using (scene_id = 'home');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scene-studio', 'scene-studio', true, 1048576, array['image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
