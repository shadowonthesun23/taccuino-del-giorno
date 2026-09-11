import assert from 'node:assert/strict';
import test from 'node:test';
import { getSceneObject, getSceneResponsiveBreakpoints, resolveSceneObjectForViewport, sceneDraftToCss, validateSceneDraft } from '../lib/scene-draft.ts';
import { cloneBaselineSceneDraft, createSceneResponsiveOverride, removeSceneResponsiveOverride, resolveSceneDraft, updateSceneDraft } from '../lib/scene-draft-editor.ts';

const fig = (draft = cloneBaselineSceneDraft()) => getSceneObject(draft, 'seasonal-fig')!;
const testObject = { id: 'test-object', name: 'Oggetto test', rendererType: 'image' as const, asset: { source: 'bundled' as const, path: '/images/test-object.png' }, anchorX: 'right' as const, anchorY: 'bottom' as const, zIndex: 7, offsetX: 12, offsetY: -4, scale: 1, rotation: 0, visible: true, locked: false, availability: 'permanent' as const, responsiveOverrides: {} };

test('base and partial responsive overrides resolve deterministically', () => {
  let draft = createSceneResponsiveOverride(cloneBaselineSceneDraft(), 'seasonal-fig', 'desktop');
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 40, scale: .9 }, { mode: 'override', breakpointId: 'desktop' });
  draft = createSceneResponsiveOverride(draft, 'seasonal-fig', 'desktopShort');
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetY: -30, scale: .8 }, { mode: 'override', breakpointId: 'desktopShort' });
  const resolved = resolveSceneObjectForViewport(fig(draft), { width: 1440, height: 900 });
  assert.deepEqual(resolved.breakpointIds, ['desktop', 'desktopShort']);
  assert.deepEqual({ x: resolved.object.offsetX, y: resolved.object.offsetY, scale: resolved.object.scale }, { x: 40, y: -30, scale: .8 });
  assert.deepEqual(getSceneResponsiveBreakpoints({ width: 1440, height: 921 }), ['desktop']);
  assert.deepEqual(getSceneResponsiveBreakpoints({ width: 1440, height: 920 }), ['desktop', 'desktopShort']);
  assert.deepEqual(getSceneResponsiveBreakpoints({ width: 1440, height: 700 }), ['desktop', 'veryShortDesktop']);
});

test('generic valid objects are accepted and inherit Base plus override', () => {
  const draft = cloneBaselineSceneDraft();
  draft.objects.push(testObject);
  assert.equal(validateSceneDraft(draft).ok, true);
  let changed = createSceneResponsiveOverride(draft, 'test-object', 'compactDesktop');
  changed = updateSceneDraft(changed, 'test-object', { scale: .75, visible: false }, { mode: 'override', breakpointId: 'compactDesktop' });
  const resolved = resolveSceneObjectForViewport(getSceneObject(changed, 'test-object')!, { width: 1366, height: 768 }).object;
  assert.equal(resolved.offsetX, 12);
  assert.equal(resolved.scale, .75);
  assert.equal(resolved.visible, false);
  assert.equal(resolved.locked, false);
  assert.match(sceneDraftToCss(changed, { width: 1366, height: 768 }), /data-scene-object="test-object"/);
  changed = removeSceneResponsiveOverride(changed, 'test-object', 'compactDesktop');
  assert.equal(resolveSceneObjectForViewport(getSceneObject(changed, 'test-object')!, { width: 1366, height: 768 }).object.visible, true);
});

test('validator rejects duplicate IDs, unknown renderers and unsafe assets', () => {
  const duplicate = cloneBaselineSceneDraft(); duplicate.objects.push({ ...testObject, id: 'coffee-cup' });
  assert.equal(validateSceneDraft(duplicate).ok, false);
  const renderer = cloneBaselineSceneDraft(); renderer.objects.push({ ...testObject, rendererType: 'unknown' as 'image' });
  assert.equal(validateSceneDraft(renderer).ok, false);
  const asset = cloneBaselineSceneDraft(); asset.objects.push({ ...testObject, asset: { source: 'bundled', path: 'https://bad.example/test.png' } });
  assert.equal(validateSceneDraft(asset).ok, false);
});

test('v2 migration preserves transforms, overrides, visibility and lock', () => {
  const v2 = { schemaVersion: 2, sceneId: 'home', objects: {
    'coffee-cup': { offsetX: 4, offsetY: 5, scale: 1, rotation: -3.5, locked: true, visible: true, responsiveOverrides: {} },
    'ink-bottle': { offsetX: 0, offsetY: 0, scale: 1, rotation: -6, locked: true, visible: true, responsiveOverrides: {} },
    'seasonal-fig': { offsetX: 80, offsetY: -20, scale: 1.2, rotation: 5, locked: false, visible: false, responsiveOverrides: { compactDesktop: { offsetX: 35 } } },
  } };
  const migrated = resolveSceneDraft(v2); const object = fig(migrated);
  assert.equal(migrated.schemaVersion, 4); assert.equal(object.offsetX, 80); assert.equal(object.visible, false); assert.equal(object.locked, false); assert.equal(object.responsiveOverrides.compactDesktop?.offsetX, 35);
});

test('corrupt drafts fall back to the baseline safely', () => {
  const draft = resolveSceneDraft('{bad json');
  assert.equal(draft.objects.length, 3);
  assert.equal(validateSceneDraft({}).ok, false);
});
