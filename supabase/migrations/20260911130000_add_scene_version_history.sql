create table public.scene_versions (
  id uuid primary key default gen_random_uuid(),
  scene_id text not null,
  version_number integer not null check (version_number >= 1),
  label text not null,
  scene jsonb not null check (jsonb_typeof(scene) = 'object'),
  is_baseline boolean not null default false,
  is_current boolean not null default false,
  source_version_id uuid references public.scene_versions(id),
  published_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (scene_id, version_number)
);

create unique index scene_versions_one_current_idx
  on public.scene_versions(scene_id)
  where is_current;

create index scene_versions_scene_id_created_at_idx
  on public.scene_versions(scene_id, created_at desc);

alter table public.scene_versions enable row level security;
revoke all on public.scene_versions from anon, authenticated;

create or replace function public.ensure_scene_baseline(
  p_scene_id text,
  p_scene jsonb,
  p_user_id uuid
)
returns public.scene_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.scene_versions;
begin
  select * into result
  from public.scene_versions
  where scene_id = p_scene_id and version_number = 1;

  if result.id is null then
    insert into public.scene_versions (
      scene_id, version_number, label, scene, is_baseline, is_current, published_by
    ) values (
      p_scene_id, 1, 'Baseline pre-Scene Studio', p_scene, true, true, p_user_id
    ) returning * into result;

    insert into public.scene_published (scene_id, scene, published_by, published_at)
    values (p_scene_id, p_scene, p_user_id, now())
    on conflict (scene_id) do nothing;
  end if;

  return result;
end;
$$;

create or replace function public.publish_scene_version(
  p_scene_id text,
  p_scene jsonb,
  p_user_id uuid,
  p_label text default 'Pubblicazione',
  p_source_version_id uuid default null
)
returns public.scene_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.scene_versions;
  next_number integer;
begin
  perform public.ensure_scene_baseline(p_scene_id, p_scene, p_user_id);
  select coalesce(max(version_number), 0) + 1 into next_number
  from public.scene_versions
  where scene_id = p_scene_id;

  update public.scene_versions set is_current = false where scene_id = p_scene_id;
  insert into public.scene_versions (
    scene_id, version_number, label, scene, is_baseline, is_current, source_version_id, published_by
  ) values (
    p_scene_id, next_number, p_label, p_scene, false, true, p_source_version_id, p_user_id
  ) returning * into result;

  insert into public.scene_published (scene_id, scene, published_by, published_at)
  values (p_scene_id, p_scene, p_user_id, now())
  on conflict (scene_id) do update set scene = excluded.scene, published_by = excluded.published_by, published_at = excluded.published_at;
  return result;
end;
$$;

revoke all on function public.ensure_scene_baseline(text, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.publish_scene_version(text, jsonb, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.ensure_scene_baseline(text, jsonb, uuid) to service_role;
grant execute on function public.publish_scene_version(text, jsonb, uuid, text, uuid) to service_role;
