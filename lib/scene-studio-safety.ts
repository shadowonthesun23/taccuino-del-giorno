import { resolveSceneDraftStrict } from './scene-draft-editor.ts';
import type { SceneDraft } from './scene-draft.ts';

export function resolveInitialStudioDraft(remoteDraft: unknown, hasRemoteDraft: boolean, publishedScene: unknown, baseline: SceneDraft) {
  if (hasRemoteDraft) {
    const draft = resolveSceneDraftStrict(remoteDraft);
    return draft ? { draft, source: 'remote-draft' as const, error: null } : { draft: null, source: null, error: 'La bozza salvata non è valida o non è migrabile.' };
  }
  const published = resolveSceneDraftStrict(publishedScene);
  return published ? { draft: published, source: 'published' as const, error: null } : { draft: structuredClone(baseline), source: 'baseline' as const, error: null };
}

export function getUnexpectedlyRemovedObjectIds(draft: SceneDraft, publishedScene: SceneDraft | null, explicitlyRemovedObjectIds: ReadonlySet<string>) {
  if (!publishedScene) return [];
  const draftIds = new Set(draft.objects.map((object) => object.id));
  return publishedScene.objects.map((object) => object.id).filter((id) => !draftIds.has(id) && !explicitlyRemovedObjectIds.has(id));
}

export function shouldAutosaveStudioDraft(hydrated: boolean, dirty: boolean, blocked: boolean) {
  return hydrated && dirty && !blocked;
}

export function clonePublishedSceneForDraft(publishedScene: SceneDraft) {
  return structuredClone(publishedScene);
}
