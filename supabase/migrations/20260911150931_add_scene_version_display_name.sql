alter table public.scene_versions
  add column display_name text null check (display_name is null or char_length(display_name) <= 60);
