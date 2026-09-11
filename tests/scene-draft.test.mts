import assert from 'node:assert/strict';
import test from 'node:test';
import { getSceneObject, getSceneObjectResponsiveState, getSceneResponsiveBreakpoints, resolveSceneObjectForViewport, sceneDraftToCss, validateSceneDraft } from '../lib/scene-draft.ts';
import { cloneBaselineSceneDraft, createSceneResponsiveOverride, removeSceneResponsiveOverride, replaceSceneObjectAsset, resolveSceneDraft, updateSceneDraft } from '../lib/scene-draft-editor.ts';

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

test('mobile and tablet bands use the exact width thresholds', () => {
  assert.deepEqual(getSceneResponsiveBreakpoints({ width: 767, height: 844 }), ['mobile']);
  assert.deepEqual(getSceneResponsiveBreakpoints({ width: 768, height: 1024 }), ['tablet']);
  assert.deepEqual(getSceneResponsiveBreakpoints({ width: 1023, height: 800 }), ['tablet']);
  assert.deepEqual(getSceneResponsiveBreakpoints({ width: 1024, height: 800 }), ['narrowDesktop']);
});

test('responsive state is calculated only for the selected object', () => {
  let draft = cloneBaselineSceneDraft();
  draft = createSceneResponsiveOverride(draft, 'seasonal-fig', 'mobile');
  draft = updateSceneDraft(draft, 'seasonal-fig', { visible: false }, { mode: 'override', breakpointId: 'mobile' });
  const cupState = getSceneObjectResponsiveState(getSceneObject(draft, 'coffee-cup')!, { width: 390, height: 844 });
  const figState = getSceneObjectResponsiveState(getSceneObject(draft, 'seasonal-fig')!, { width: 390, height: 844 });
  assert.equal(cupState.status, 'base');
  assert.equal(figState.status, 'hidden');
  assert.equal(figState.overrideBreakpointId, 'mobile');
});

test('an override with inherited visibility is not marked hidden', () => {
  const draft = createSceneResponsiveOverride(cloneBaselineSceneDraft(), 'seasonal-fig', 'tablet');
  const state = getSceneObjectResponsiveState(getSceneObject(draft, 'seasonal-fig')!, { width: 768, height: 1024 });
  assert.equal(state.status, 'override');
  assert.equal(state.object.visible, true);
});

test('baseline technical hiding cannot be forced visible by a scene override', () => {
  let draft = createSceneResponsiveOverride(cloneBaselineSceneDraft(), 'seasonal-fig', 'mobile');
  draft = updateSceneDraft(draft, 'seasonal-fig', { visible: true }, { mode: 'override', breakpointId: 'mobile' });
  const state = getSceneObjectResponsiveState(getSceneObject(draft, 'seasonal-fig')!, { width: 390, height: 844 });
  assert.equal(state.object.visible, true);
  assert.equal(state.status, 'override');
  assert.equal(getSceneResponsiveBreakpoints({ width: 390, height: 844 })[0], 'mobile');
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
  assert.match(sceneDraftToCss(changed, { width: 1366, height: 768 }), /transform-origin: 50% 50%/);
  changed = removeSceneResponsiveOverride(changed, 'test-object', 'compactDesktop');
  assert.equal(resolveSceneObjectForViewport(getSceneObject(changed, 'test-object')!, { width: 1366, height: 768 }).object.visible, true);
});

test('central pivot is independent from left/top and right/bottom anchors', () => {
  const draft = cloneBaselineSceneDraft();
  const leftTop = getSceneObject(draft, 'coffee-cup')!;
  const rightBottom = getSceneObject(draft, 'seasonal-fig')!;
  const css = sceneDraftToCss({ ...draft, objects: [leftTop, rightBottom] }, { width: 1440, height: 900 });
  assert.equal((css.match(/transform-origin: 50% 50%/g) ?? []).length, 2);
  assert.equal(resolveSceneObjectForViewport(rightBottom, { width: 1440, height: 900 }).object.anchorX, 'right');
  assert.equal(resolveSceneObjectForViewport(leftTop, { width: 1440, height: 900 }).object.anchorX, 'left');
});

test('replacing an asset preserves the selected object identity and editing state', () => {
  let draft = cloneBaselineSceneDraft();
  draft = createSceneResponsiveOverride(draft, 'seasonal-fig', 'mobile');
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 80, scale: .8 }, { mode: 'override', breakpointId: 'mobile' });
  const before = getSceneObject(draft, 'seasonal-fig')!;
  const replaced = replaceSceneObjectAsset(draft, 'seasonal-fig', { source: 'storage', path: 'editor/new-fig.webp' });
  const after = getSceneObject(replaced, 'seasonal-fig')!;
  assert.deepEqual(after.asset, { source: 'storage', path: 'editor/new-fig.webp' });
  assert.equal(after.id, before.id);
  assert.equal(after.offsetX, before.offsetX);
  assert.equal(after.scale, before.scale);
  assert.deepEqual(after.responsiveOverrides, before.responsiveOverrides);
  assert.equal(replaced.objects.length, draft.objects.length);
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
