import assert from 'node:assert/strict';
import test from 'node:test';
import { getSceneObject, getSceneObjectResponsiveState, getScenePresetOverrideId, getSceneResponsiveBreakpoints, resolveSceneObjectForViewport, sceneDraftToCss, validateSceneDraft } from '../lib/scene-draft.ts';
import { addSceneObject, cloneBaselineSceneDraft, convertSceneObjectAnchorOffsets, createScenePresetOverride, createSceneResponsiveOverride, getNaturalSceneObjectAnchors, initializeSceneObjectAnchors, removeScenePresetOverride, removeSceneResponsiveOverride, replaceSceneObjectAsset, resolveSceneDraft, resolveSceneDraftStrict, updateSceneDraft } from '../lib/scene-draft-editor.ts';

const fig = (draft = cloneBaselineSceneDraft()) => getSceneObject(draft, 'seasonal-fig')!;
const testObject = { id: 'test-object', name: 'Oggetto test', rendererType: 'image' as const, asset: { source: 'bundled' as const, path: '/images/test-object.png' }, anchorX: 'right' as const, anchorY: 'bottom' as const, zIndex: 7, offsetX: 12, offsetY: -4, scale: 1, rotation: 0, visible: true, locked: false, availability: 'permanent' as const, responsiveOverrides: {}, presetOverrides: {} };
const profiledFig = { ...testObject, id: 'seasonal-fig', offsetX: 23.66, offsetY: -91.69219970703125, scale: 1.6769914095350518, responsiveOverrides: { wide: { scale: 1.481995695194387, offsetX: 11.66, offsetY: -89.60687255859375 }, wideShort: { offsetX: 999, offsetY: 999, scale: .5 }, desktopShort: { offsetX: -2.95, offsetY: -91.96173095703125 }, mobile: { visible: false }, tablet: { visible: false } }, presetOverrides: { '1536x864': { offsetX: -25.95 }, '1680x1050': { scale: 1.28, offsetX: 35.66000000000008, offsetY: -89.60687255859375 }, '1920x1080': { scale: 1.28, offsetX: 11.66 } } };
const pencil = { ...testObject, id: 'pennamatita', offsetX: -48, offsetY: -48, presetOverrides: { '1920x1080': { scale: 2.44, offsetX: -103.6103515625, offsetY: -752.07 } } };

test('exact preset overrides are distinct and fall back to the nearest compatible preset', () => {
  let draft = cloneBaselineSceneDraft();
  draft = createScenePresetOverride(draft, 'seasonal-fig', '1920x1080');
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 120 }, { mode: 'preset', presetId: '1920x1080' });
  draft = createScenePresetOverride(draft, 'seasonal-fig', '1680x1050');
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 30 }, { mode: 'preset', presetId: '1680x1050' });
  const object = fig(draft);
  assert.equal(resolveSceneObjectForViewport(object, { width: 1920, height: 1080 }, '1920x1080').object.offsetX, 120);
  assert.equal(resolveSceneObjectForViewport(object, { width: 1680, height: 1050 }, '1680x1050').object.offsetX, 30);
  assert.equal(resolveSceneObjectForViewport(object, { width: 1440, height: 900 }, '1440x900').object.offsetX, object.offsetX);
  assert.equal(getScenePresetOverrideId({ width: 3840, height: 2160 }), '3840x2160');
  assert.equal(getScenePresetOverrideId({ width: 5120, height: 2880 }), '5120x2880');
  draft = removeScenePresetOverride(draft, 'seasonal-fig', '1920x1080');
  assert.equal(resolveSceneObjectForViewport(fig(draft), { width: 1920, height: 1080 }, '1920x1080').object.offsetX, 30);
});

test('resolves same-width presets when the browser height differs', () => {
  let draft = cloneBaselineSceneDraft();
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 120 }, { mode: 'preset', presetId: '1920x1080' });
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 30 }, { mode: 'preset', presetId: '1680x1050' });
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 75 }, { mode: 'preset', presetId: '1536x864' });

  const fullHd = resolveSceneObjectForViewport(fig(draft), { width: 1920, height: 950 });
  const sixteenEighty = resolveSceneObjectForViewport(fig(draft), { width: 1680, height: 970 });
  const fifteenThirtySix = resolveSceneObjectForViewport(fig(draft), { width: 1536, height: 800 });
  assert.equal(fullHd.presetId, '1920x1080');
  assert.equal(fullHd.object.offsetX, 120);
  assert.equal(sixteenEighty.presetId, '1680x1050');
  assert.equal(sixteenEighty.object.offsetX, 30);
  assert.equal(fifteenThirtySix.presetId, '1536x864');
  assert.equal(fifteenThirtySix.object.offsetX, 75);
});

test('same-width presets retain their offsets without viewport compensation', () => {
  const object = { ...testObject, presetOverrides: { '1920x1080': { offsetX: 11, offsetY: 0 } } };

  const exact = resolveSceneObjectForViewport(object, { width: 1920, height: 1080 });
  const shorter = resolveSceneObjectForViewport(object, { width: 1920, height: 851 });
  const narrower = resolveSceneObjectForViewport(object, { width: 1680, height: 1080 });
  assert.deepEqual({ x: exact.object.offsetX, y: exact.object.offsetY }, { x: 11, y: 0 });
  assert.deepEqual({ x: shorter.object.offsetX, y: shorter.object.offsetY }, { x: 11, y: 0 });
  assert.equal(narrower.object.offsetX, 11);
  assert.match(sceneDraftToCss({ ...cloneBaselineSceneDraft(), objects: [object] }, { width: 1920, height: 851 }), /translate: 11px 0px/);
});

test('left and top anchors do not receive viewport compensation', () => {
  const leftTopObject = { ...testObject, anchorX: 'left' as const, anchorY: 'top' as const, presetOverrides: { '1920x1080': { offsetX: 11, offsetY: -12 } } };
  const resolved = resolveSceneObjectForViewport(leftTopObject, { width: 1680, height: 851 });
  assert.equal(resolved.presetId, '1920x1080');
  assert.deepEqual({ x: resolved.object.offsetX, y: resolved.object.offsetY }, { x: 11, y: -12 });
});

test('resolves the nearest configured preset only within the viewport responsive band', () => {
  let draft = cloneBaselineSceneDraft();
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 10 }, { mode: 'preset', presetId: '1280x800' });
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 20 }, { mode: 'preset', presetId: '1366x768' });
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 999 }, { mode: 'preset', presetId: '768x1024' });

  const resolved = resolveSceneObjectForViewport(fig(draft), { width: 1200, height: 800 });
  assert.equal(resolved.presetId, '1280x800');
  assert.equal(resolved.object.offsetX, 10);
});

test('same-width fig presets materialize their nominal responsive profile without geometry compensation', () => {
  const studio = resolveSceneObjectForViewport(profiledFig, { width: 1920, height: 1080 });
  const home = resolveSceneObjectForViewport(profiledFig, { width: 1920, height: 851 });

  assert.equal(studio.presetId, '1920x1080');
  assert.deepEqual({ x: studio.object.offsetX, y: studio.object.offsetY, scale: studio.object.scale, rotation: studio.object.rotation, visible: studio.object.visible }, { x: 11.66, y: -89.60687255859375, scale: 1.28, rotation: 0, visible: true });
  assert.equal(home.presetId, '1920x1080');
  assert.deepEqual({ x: home.object.offsetX, y: home.object.offsetY, scale: home.object.scale, rotation: home.object.rotation, visible: home.object.visible }, { x: 11.66, y: -89.60687255859375, scale: 1.28, rotation: 0, visible: true });
  assert.match(sceneDraftToCss({ ...cloneBaselineSceneDraft(), objects: [profiledFig] }, { width: 1920, height: 851 }), /translate: 11\.66px -89\.607px/);
});

test('same-width presets preserve pennamatita geometry at a shorter browser height', () => {
  const resolved = resolveSceneObjectForViewport(pencil, { width: 1920, height: 851 });
  assert.equal(resolved.presetId, '1920x1080');
  assert.deepEqual({ x: resolved.object.offsetX, y: resolved.object.offsetY, scale: resolved.object.scale }, { x: -103.6103515625, y: -752.07, scale: 2.44 });
});

test('natural anchor selection follows the final visual centre', () => {
  assert.deepEqual(getNaturalSceneObjectAnchors({ viewport: { width: 1920, height: 1080 }, centerX: 1500, centerY: 200 }), { anchorX: 'right', anchorY: 'top' });
  assert.deepEqual(getNaturalSceneObjectAnchors({ viewport: { width: 1920, height: 1080 }, centerX: 1500, centerY: 900 }), { anchorX: 'right', anchorY: 'bottom' });
});

test('anchor conversion preserves the exact visual position using rendered asset dimensions', () => {
  const viewport = { width: 1920, height: 1080 };
  const geometry = { viewport, renderedWidth: 360, renderedHeight: 180, scale: 2 };
  const converted = convertSceneObjectAnchorOffsets({ offsetX: 1400, offsetY: 100 }, { anchorX: 'left', anchorY: 'top' }, { anchorX: 'right', anchorY: 'top' }, geometry);
  assert.deepEqual(converted, { offsetX: -340, offsetY: 100 });
  const oldCenter = { x: 1400 + 90, y: 100 + 45 };
  const newCenter = { x: viewport.width - 180 - 340 + 90, y: 100 + 45 };
  assert.deepEqual(newCenter, oldCenter);
});

test('a new asset initializes its natural anchor once and then keeps it stable', () => {
  const object = { ...testObject, id: 'new-upload', asset: { source: 'storage' as const, path: 'editor/new-upload.webp' }, anchorX: 'left' as const, anchorY: 'top' as const, offsetX: 1400, offsetY: 100 };
  const draft = addSceneObject(cloneBaselineSceneDraft(), object);
  const pending = new Set([object.id]);
  const first = initializeSceneObjectAnchors(draft, object.id, { viewport: { width: 1920, height: 1080 }, centerX: 1490, centerY: 145, renderedWidth: 360, renderedHeight: 180, scale: 2 }, { mode: 'preset', presetId: '1920x1080' }, pending);
  assert.equal(first.initialized, true);
  assert.deepEqual({ anchorX: getSceneObject(first.draft, object.id)?.anchorX, anchorY: getSceneObject(first.draft, object.id)?.anchorY }, { anchorX: 'right', anchorY: 'top' });
  assert.deepEqual(getSceneObject(first.draft, object.id)?.presetOverrides['1920x1080'], { offsetX: -340, offsetY: 100 });

  pending.delete(object.id);
  const second = initializeSceneObjectAnchors(first.draft, object.id, { viewport: { width: 1920, height: 1080 }, centerX: 200, centerY: 900, renderedWidth: 360, renderedHeight: 180, scale: 2 }, { mode: 'preset', presetId: '1920x1080' }, pending);
  assert.equal(second.initialized, false);
  assert.deepEqual(second.draft, first.draft);
});

test('fig keeps its existing responsive fallback when no same-width preset exists', () => {
  const compact = resolveSceneObjectForViewport(profiledFig, { width: 1440, height: 900 });
  const wide = resolveSceneObjectForViewport(profiledFig, { width: 2560, height: 1440 });
  assert.equal(compact.presetId, undefined);
  assert.deepEqual({ x: compact.object.offsetX, y: compact.object.offsetY, scale: compact.object.scale }, { x: -2.95, y: -91.96173095703125, scale: 1.6769914095350518 });
  assert.equal(wide.presetId, undefined);
  assert.deepEqual({ x: wide.object.offsetX, y: wide.object.offsetY, scale: wide.object.scale }, { x: 11.66, y: -89.60687255859375, scale: 1.481995695194387 });
});

test('responsive visibility remains active without a same-width preset', () => {
  const mobile = resolveSceneObjectForViewport(profiledFig, { width: 390, height: 844 });
  const tablet = resolveSceneObjectForViewport(profiledFig, { width: 768, height: 1024 });
  assert.equal(mobile.object.visible, false);
  assert.equal(tablet.object.visible, false);
});

test('exact presets retain priority over active responsive overrides', () => {
  let draft = createSceneResponsiveOverride(cloneBaselineSceneDraft(), 'seasonal-fig', 'wide');
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 40, scale: .9 }, { mode: 'override', breakpointId: 'wide' });
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 11, offsetY: 0 }, { mode: 'preset', presetId: '1920x1080' });

  const resolved = resolveSceneObjectForViewport(fig(draft), { width: 1920, height: 1080 });
  assert.equal(resolved.presetId, '1920x1080');
  assert.deepEqual({ x: resolved.object.offsetX, y: resolved.object.offsetY, scale: resolved.object.scale }, { x: 11, y: 0, scale: .9 });
});

test('falls back to Base unchanged when no configured preset is compatible', () => {
  let draft = cloneBaselineSceneDraft();
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 999 }, { mode: 'preset', presetId: '390x844' });

  const resolved = resolveSceneObjectForViewport(fig(draft), { width: 1440, height: 900 });
  assert.equal(resolved.presetId, undefined);
  assert.equal(resolved.object.offsetX, fig(draft).offsetX);
  assert.equal(resolved.object.scale, fig(draft).scale);
});

test('configured preset overrides retain responsive values they do not replace', () => {
  let draft = createSceneResponsiveOverride(cloneBaselineSceneDraft(), 'seasonal-fig', 'desktop');
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 40, scale: .9 }, { mode: 'override', breakpointId: 'desktop' });
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetY: -30 }, { mode: 'preset', presetId: '1440x900' });

  const resolved = resolveSceneObjectForViewport(fig(draft), { width: 1440, height: 900 });
  assert.deepEqual({ x: resolved.object.offsetX, y: resolved.object.offsetY, scale: resolved.object.scale }, { x: 40, y: -30, scale: .9 });
});

test('first edit on a preset creates only that preset override', () => {
  let draft = cloneBaselineSceneDraft();
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 100 }, { mode: 'preset', presetId: '1920x1080' });
  assert.deepEqual(draft.objects.find((object) => object.id === 'seasonal-fig')?.presetOverrides, { '1920x1080': { offsetX: 100 } });
  assert.equal(resolveSceneObjectForViewport(fig(draft), { width: 1920, height: 1080 }, '1920x1080').object.offsetX, 100);
  assert.equal(resolveSceneObjectForViewport(fig(draft), { width: 1680, height: 1050 }, '1680x1050').object.offsetX, 100);
});

test('global z-index edits write only to the Base object', () => {
  let draft = cloneBaselineSceneDraft();
  draft = createSceneResponsiveOverride(draft, 'seasonal-fig', 'desktop');
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 40 }, { mode: 'override', breakpointId: 'desktop' });
  draft = updateSceneDraft(draft, 'seasonal-fig', { scale: 1.2 }, { mode: 'preset', presetId: '1920x1080' });
  const before = fig(draft);
  const responsiveOverrides = structuredClone(before.responsiveOverrides);
  const presetOverrides = structuredClone(before.presetOverrides);
  const anchorX = before.anchorX;
  const anchorY = before.anchorY;

  draft = updateSceneDraft(draft, 'seasonal-fig', { zIndex: 8 }, { mode: 'base' });
  const after = fig(draft);

  assert.equal(after.zIndex, 8);
  assert.deepEqual(after.responsiveOverrides, responsiveOverrides);
  assert.deepEqual(after.presetOverrides, presetOverrides);
  assert.equal(after.anchorX, anchorX);
  assert.equal(after.anchorY, anchorY);
  assert.equal(resolveSceneObjectForViewport(after, { width: 1920, height: 1080 }).object.zIndex, 8);
  assert.equal(validateSceneDraft(draft).ok, true);
});

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
  assert.equal(migrated.schemaVersion, 5); assert.equal(object.offsetX, 80); assert.equal(object.visible, false); assert.equal(object.locked, false); assert.equal(object.responsiveOverrides.compactDesktop?.offsetX, 35); assert.deepEqual(object.presetOverrides, {});
});

test('corrupt drafts fall back to the baseline safely', () => {
  const draft = resolveSceneDraft('{bad json');
  assert.equal(draft.objects.length, 3);
  assert.equal(validateSceneDraft({}).ok, false);
});

test('strict historical resolver migrates legacy snapshots without baseline fallback', () => {
  const current = cloneBaselineSceneDraft();
  assert.equal(resolveSceneDraftStrict(current)?.schemaVersion, 5);
  const legacy = { ...current, schemaVersion: 4, objects: current.objects.map((object) => ({ ...object, presetOverrides: undefined })) };
  const migrated = resolveSceneDraftStrict(legacy);
  assert.equal(migrated?.schemaVersion, 5);
  assert.equal(migrated?.objects[2].id, 'seasonal-fig');
  assert.equal(resolveSceneDraftStrict({ schemaVersion: 4, sceneId: 'home', objects: [] }), null);
});
