import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getSceneResponsiveBreakpoint,
  getSceneResponsiveBreakpoints,
  resolveSceneObjectForViewport,
  SCENE_OBJECT_ANCHORS,
  sceneDraftToCss,
  validateSceneDraft,
} from '../lib/scene-draft.ts';
import {
  HOME_SCENE_DRAFT_BASELINE_V1,
  cloneBaselineSceneDraft,
  createSceneResponsiveOverride,
  removeSceneResponsiveOverride,
  resolveSceneDraft,
  updateSceneDraft,
} from '../lib/scene-draft-editor.ts';

test('base is used when no override exists', () => {
  const object = resolveSceneObjectForViewport(cloneBaselineSceneDraft().objects['seasonal-fig'], { width: 1366, height: 768 });
  assert.equal(object.breakpointId, 'compactDesktop');
  assert.equal(object.object.offsetX, 0);
  assert.equal(object.object.visible, true);
});

test('partial override inherits missing base properties', () => {
  const draft = updateSceneDraft(createSceneResponsiveOverride(cloneBaselineSceneDraft(), 'seasonal-fig', 'compactDesktop'), 'seasonal-fig', { offsetX: 35, scale: 0.92 }, { mode: 'override', breakpointId: 'compactDesktop' });
  const resolved = resolveSceneObjectForViewport(draft.objects['seasonal-fig'], { width: 1366, height: 768 }).object;
  assert.deepEqual({ offsetX: resolved.offsetX, offsetY: resolved.offsetY, scale: resolved.scale, rotation: resolved.rotation }, { offsetX: 35, offsetY: 0, scale: 0.92, rotation: 0 });
});

test('complete override and visibility apply only in its responsive band', () => {
  let draft = createSceneResponsiveOverride(cloneBaselineSceneDraft(), 'seasonal-fig', 'compactDesktop');
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 20, offsetY: -10, scale: 0.8, rotation: 12, visible: false }, { mode: 'override', breakpointId: 'compactDesktop' });
  assert.equal(resolveSceneObjectForViewport(draft.objects['seasonal-fig'], { width: 1366, height: 768 }).object.visible, false);
  assert.equal(resolveSceneObjectForViewport(draft.objects['seasonal-fig'], { width: 1920, height: 1080 }).object.visible, true);
});

test('a visibility override can restore the base scene visibility without bypassing baseline eligibility', () => {
  let draft = updateSceneDraft(cloneBaselineSceneDraft(), 'seasonal-fig', { visible: false });
  draft = createSceneResponsiveOverride(draft, 'seasonal-fig', 'compactDesktop');
  draft = updateSceneDraft(draft, 'seasonal-fig', { visible: true }, { mode: 'override', breakpointId: 'compactDesktop' });
  assert.equal(resolveSceneObjectForViewport(draft.objects['seasonal-fig'], { width: 1366, height: 768 }).object.visible, true);
  assert.equal(resolveSceneObjectForViewport(draft.objects['seasonal-fig'], { width: 1920, height: 1080 }).object.visible, false);
});

test('breakpoints follow real width and height eligibility bands', () => {
  assert.equal(getSceneResponsiveBreakpoint({ width: 1920, height: 1080 }), 'wide');
  assert.equal(getSceneResponsiveBreakpoint({ width: 1440, height: 900 }), 'desktopShort');
  assert.equal(getSceneResponsiveBreakpoint({ width: 1366, height: 768 }), 'compactDesktop');
  assert.equal(getSceneResponsiveBreakpoint({ width: 1440, height: 700 }), 'veryShortDesktop');
});

test('responsive precedence is Base, then width, then the vertical refinement', () => {
  let draft = createSceneResponsiveOverride(cloneBaselineSceneDraft(), 'seasonal-fig', 'desktop');
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 40, scale: 0.9 }, { mode: 'override', breakpointId: 'desktop' });
  draft = createSceneResponsiveOverride(draft, 'seasonal-fig', 'desktopShort');
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetY: -30, scale: 0.8 }, { mode: 'override', breakpointId: 'desktopShort' });
  const resolved = resolveSceneObjectForViewport(draft.objects['seasonal-fig'], { width: 1440, height: 900 });
  assert.deepEqual(resolved.breakpointIds, ['desktop', 'desktopShort']);
  assert.deepEqual(
    { offsetX: resolved.object.offsetX, offsetY: resolved.object.offsetY, scale: resolved.object.scale },
    { offsetX: 40, offsetY: -30, scale: 0.8 },
  );
});

test('width-only and height refinements obey their exact 920 and 700 thresholds', () => {
  assert.deepEqual(getSceneResponsiveBreakpoints({ width: 1366, height: 920 }), ['compactDesktop']);
  assert.deepEqual(getSceneResponsiveBreakpoints({ width: 1440, height: 921 }), ['desktop']);
  assert.deepEqual(getSceneResponsiveBreakpoints({ width: 1440, height: 920 }), ['desktop', 'desktopShort']);
  assert.deepEqual(getSceneResponsiveBreakpoints({ width: 1440, height: 701 }), ['desktop', 'desktopShort']);
  assert.deepEqual(getSceneResponsiveBreakpoints({ width: 1440, height: 700 }), ['desktop', 'veryShortDesktop']);
});

test('anchors stay in the production baseline while offsets remain screen-space deltas', () => {
  assert.equal(SCENE_OBJECT_ANCHORS['coffee-cup'], 'left-top');
  assert.equal(SCENE_OBJECT_ANCHORS['ink-bottle'], 'left-top');
  assert.equal(SCENE_OBJECT_ANCHORS['seasonal-fig'], 'right-bottom');
  let draft = createSceneResponsiveOverride(cloneBaselineSceneDraft(), 'seasonal-fig', 'compactDesktop');
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 35, offsetY: -20 }, { mode: 'override', breakpointId: 'compactDesktop' });
  assert.match(sceneDraftToCss(draft, { width: 1366, height: 768 }), /translate: 35px -20px/);
});

test('removing an override returns entirely to base', () => {
  let draft = createSceneResponsiveOverride(cloneBaselineSceneDraft(), 'seasonal-fig', 'compactDesktop');
  draft = updateSceneDraft(draft, 'seasonal-fig', { offsetX: 45 }, { mode: 'override', breakpointId: 'compactDesktop' });
  draft = removeSceneResponsiveOverride(draft, 'seasonal-fig', 'compactDesktop');
  assert.equal(resolveSceneObjectForViewport(draft.objects['seasonal-fig'], { width: 1366, height: 768 }).object.offsetX, 0);
});

test('v1 drafts migrate without losing their valid transforms', () => {
  const migrated = resolveSceneDraft({ schemaVersion: 1, sceneId: 'home', objects: {
    'coffee-cup': { x: 4, y: 5, scale: 1, rotation: -3.5, locked: true, visible: true },
    'ink-bottle': { x: 0, y: 0, scale: 1, rotation: -6, locked: true, visible: true },
    'seasonal-fig': { x: 80, y: -20, scale: 1.2, rotation: 5, locked: false, visible: true },
  }});
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.objects['seasonal-fig'].offsetX, 80);
  assert.deepEqual(migrated.objects['seasonal-fig'].responsiveOverrides, {});
});

test('corrupt local drafts fall back and generated CSS uses resolved values only', () => {
  assert.deepEqual(resolveSceneDraft('{bad json'), HOME_SCENE_DRAFT_BASELINE_V1);
  const css = sceneDraftToCss(cloneBaselineSceneDraft(), { width: 1920, height: 1080 });
  assert.match(css, /translate: 0px 0px/);
  assert.doesNotMatch(css, /url\(|expression\(/);
  assert.equal(validateSceneDraft({}).ok, false);
});
