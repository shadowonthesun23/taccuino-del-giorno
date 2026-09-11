create policy "Scene drafts deny client access"
on public.scene_drafts for all
to anon, authenticated
using (false)
with check (false);

create policy "Scene assets deny client access"
on public.scene_assets for all
to anon, authenticated
using (false)
with check (false);

create index scene_drafts_updated_by_idx on public.scene_drafts(updated_by);
create index scene_published_published_by_idx on public.scene_published(published_by);
create index scene_assets_created_by_idx on public.scene_assets(created_by);
