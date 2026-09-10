import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sceneDraftToCss,
  validateSceneDraft,
} from '../lib/scene-draft.ts';
import {
  HOME_SCENE_DRAFT_BASELINE_V1,
  cloneBaselineSceneDraft,
  resolveSceneDraft,
  updateSceneDraft,
} from '../lib/scene-draft-editor.ts';

test('baseline draft has the requested initial lock state', () => {
  assert.equal(HOME_SCENE_DRAFT_BASELINE_V1.objects['coffee-cup'].locked, true);
  assert.equal(HOME_SCENE_DRAFT_BASELINE_V1.objects['ink-bottle'].locked, true);
  assert.equal(HOME_SCENE_DRAFT_BASELINE_V1.objects['seasonal-fig'].locked, false);
});

test('draft updates are immutable and clamp transform bounds', () => {
  const baseline = cloneBaselineSceneDraft();
  const changed = updateSceneDraft(baseline, 'seasonal-fig', {
    x: 125,
    y: -42,
    scale: 8,
    rotation: 22,
    visible: false,
  });

  assert.equal(baseline.objects['seasonal-fig'].x, 0);
  assert.deepEqual(changed.objects['seasonal-fig'], {
    x: 125,
    y: -42,
    scale: 4,
    rotation: 22,
    locked: false,
    visible: false,
  });
});

test('draft CSS contains only validated numeric transforms and visibility', () => {
  const draft = updateSceneDraft(cloneBaselineSceneDraft(), 'seasonal-fig', {
    x: 12.3456,
    y: -8,
    scale: 1.25,
    rotation: 17.5,
    visible: false,
  });
  const css = sceneDraftToCss(draft);

  assert.match(css, /translate: 12\.346px -8px/);
  assert.match(css, /--scene-object-scale: 1\.25/);
  assert.match(css, /--scene-object-rotation: 17\.5deg/);
  assert.match(css, /display: none !important/);
  assert.doesNotMatch(css, /url\(|expression\(/);
});

test('invalid or extra local data fails closed to a fresh baseline', () => {
  const invalid = {
    ...HOME_SCENE_DRAFT_BASELINE_V1,
    objects: {
      ...HOME_SCENE_DRAFT_BASELINE_V1.objects,
      'seasonal-fig': {
        ...HOME_SCENE_DRAFT_BASELINE_V1.objects['seasonal-fig'],
        scale: 'huge',
        css: 'position: fixed',
      },
    },
  };

  assert.equal(validateSceneDraft(invalid).ok, false);
  const resolved = resolveSceneDraft(invalid);
  assert.deepEqual(resolved, HOME_SCENE_DRAFT_BASELINE_V1);
  assert.notEqual(resolved, HOME_SCENE_DRAFT_BASELINE_V1);
});
