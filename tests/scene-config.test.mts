import assert from 'node:assert/strict';
import test from 'node:test';
import { HOME_SCENE_BASELINE_V1 } from '../lib/scene-baseline.ts';
import {
  resolveSceneConfig,
  sceneConfigToCss,
  sceneLengthToCss,
  validateSceneConfig,
  type SceneConfig,
} from '../lib/scene-config.ts';

test('compiled home baseline validates and contains only the three production objects', () => {
  const result = validateSceneConfig(HOME_SCENE_BASELINE_V1);
  assert.equal(result.ok, true);
  assert.deepEqual(
    HOME_SCENE_BASELINE_V1.objects.map((object) => object.id),
    ['coffee-cup', 'ink-bottle', 'seasonal-fig'],
  );
});

test('baseline compiles only numeric scene data into responsive CSS', () => {
  const css = sceneConfigToCss(HOME_SCENE_BASELINE_V1);
  assert.match(css, /\[data-scene-object="coffee-cup"\]/);
  assert.match(css, /left: clamp\(-150px, -6vw, -96px\)/);
  assert.match(css, /@media \(min-width: 1440px\) and \(max-height: 920px\)/);
  assert.match(css, /bottom: clamp\(1\.4rem, 4\.6vh, 3\.6rem\)/);
  assert.doesNotMatch(css, /summer-herbarium|url\(|expression\(/);
  const figRule = css.slice(css.indexOf('[data-scene-object="seasonal-fig"]'));
  assert.match(figRule, /opacity: 1/);
  assert.doesNotMatch(figRule, /opacity: 0\.62/);
});

test('typed lengths reproduce the production clamp and calc formulas', () => {
  const coffee = HOME_SCENE_BASELINE_V1.objects[0];
  const bottle = HOME_SCENE_BASELINE_V1.objects[1];
  const compactBottleRule = bottle.responsive.height[0];
  const compactBottle = 'placement' in compactBottleRule
    ? compactBottleRule.placement?.offsetY
    : undefined;

  assert.equal(sceneLengthToCss(coffee.placement.offsetX), 'clamp(-150px, -6vw, -96px)');
  assert.equal(sceneLengthToCss(bottle.placement.offsetX), 'clamp(-60px, calc(50vw - 792px), 8px)');
  assert.ok(compactBottle);
  assert.equal(sceneLengthToCss(compactBottle), 'clamp(310px, calc(100vh - 410px), 510px)');
});

test('fig records September scheduling without changing legacy summer activation', () => {
  const fig = HOME_SCENE_BASELINE_V1.objects[2];
  assert.deepEqual(fig.seasonal, {
    activeFrom: '09-01',
    activeUntil: '09-30',
    activation: 'metadata-only',
    legacySeason: 'summer',
  });
});

test('invalid external scene data fails closed to the compiled baseline', () => {
  const invalidCandidate = {
    ...HOME_SCENE_BASELINE_V1,
    objects: [{ ...HOME_SCENE_BASELINE_V1.objects[0], renderer: 'raw-html' }],
  };
  const result = validateSceneConfig(invalidCandidate);
  assert.equal(result.ok, false);
  assert.equal(resolveSceneConfig(invalidCandidate, HOME_SCENE_BASELINE_V1), HOME_SCENE_BASELINE_V1);
});

test('valid scene data is accepted as the renderer source', () => {
  const candidate: SceneConfig = structuredClone(HOME_SCENE_BASELINE_V1);
  assert.equal(resolveSceneConfig(candidate, HOME_SCENE_BASELINE_V1), candidate);
});
