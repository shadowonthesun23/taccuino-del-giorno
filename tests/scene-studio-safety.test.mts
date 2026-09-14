import assert from 'node:assert/strict';
import test from 'node:test';
import { cloneBaselineSceneDraft } from '../lib/scene-draft-editor.ts';
import { clonePublishedSceneForDraft, getUnexpectedlyRemovedObjectIds, resolveInitialStudioDraft, shouldAutosaveStudioDraft } from '../lib/scene-studio-safety.ts';

function dynamicDraft() {
  const draft = cloneBaselineSceneDraft();
  draft.objects.push({ ...draft.objects[2], id: 'pennamatita', name: 'Pennamatita', asset: { source: 'storage', path: 'scene/pennamatita.webp' } });
  return draft;
}

test('valid schema v5 remote draft keeps a dynamic Storage asset', () => {
  const result = resolveInitialStudioDraft(dynamicDraft(), true, null, cloneBaselineSceneDraft());
  assert.equal(result.source, 'remote-draft');
  assert.deepEqual(result.draft?.objects.map((object) => object.id), ['coffee-cup', 'ink-bottle', 'seasonal-fig', 'pennamatita']);
});

test('online reset clones the published scene, including dynamic assets, without sharing references', () => {
  const published = dynamicDraft();
  const restored = clonePublishedSceneForDraft(published);
  assert.deepEqual(restored, published);
  assert.notEqual(restored, published);
  assert.notEqual(restored.objects, published.objects);
  assert.notEqual(restored.objects[3], published.objects[3]);
  restored.objects[3].name = 'changed locally';
  assert.equal(published.objects[3].name, 'Pennamatita');
});

test('invalid remote draft is blocked without baseline recovery', () => {
  const result = resolveInitialStudioDraft({ schemaVersion: 5, sceneId: 'home', objects: [] }, true, null, cloneBaselineSceneDraft());
  assert.equal(result.draft, null);
  assert.match(result.error ?? '', /non è valida/);
});

test('missing draft prefers a valid published scene with dynamic assets', () => {
  const result = resolveInitialStudioDraft(null, false, dynamicDraft(), cloneBaselineSceneDraft());
  assert.equal(result.source, 'published');
  assert.equal(result.draft?.objects.length, 4);
});

test('hydration alone cannot autosave, while a real edit can', () => {
  assert.equal(shouldAutosaveStudioDraft(true, false, false), false);
  assert.equal(shouldAutosaveStudioDraft(true, true, false), true);
  assert.equal(shouldAutosaveStudioDraft(true, true, true), false);
});

test('published object loss is blocked unless explicitly removed', () => {
  const published = dynamicDraft();
  const draft = { ...published, objects: published.objects.filter((object) => object.id !== 'pennamatita') };
  assert.deepEqual(getUnexpectedlyRemovedObjectIds(draft, published, new Set()), ['pennamatita']);
  assert.deepEqual(getUnexpectedlyRemovedObjectIds(draft, published, new Set(['pennamatita'])), []);
});
