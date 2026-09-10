import assert from 'node:assert/strict';
import test from 'node:test';
import {
  expandSceneRect,
  findSceneCollisions,
  sceneRectsIntersect,
  shouldShowSceneGuide,
} from '../lib/scene-safe-areas.ts';

const content = { id: 'content-0', category: 'content' as const, rect: { left: 100, top: 100, width: 200, height: 120 } };

test('detects a positive-area intersection and ignores edge touching', () => {
  assert.equal(sceneRectsIntersect({ left: 250, top: 130, width: 80, height: 80 }, content.rect), true);
  assert.equal(sceneRectsIntersect({ left: 300, top: 130, width: 80, height: 80 }, content.rect), false);
});

test('expands safe areas with the global safety padding', () => {
  assert.deepEqual(expandSceneRect(content.rect), { left: 68, top: 68, width: 264, height: 184 });
});

test('returns no warning for hidden objects and finds collisions only for the resolved viewport rect', () => {
  assert.deepEqual(findSceneCollisions(null, [content]), []);
  assert.deepEqual(findSceneCollisions({ left: 50, top: 130, width: 30, height: 30 }, [content]), [{ id: 'content-0', category: 'content' }]);
  assert.deepEqual(findSceneCollisions({ left: 400, top: 400, width: 30, height: 30 }, [content]), []);
});

test('uses the actual rotated bounding box supplied by the DOM measurement', () => {
  const rotatedBoundingBox = { left: 70, top: 140, width: 90, height: 90 };
  assert.deepEqual(findSceneCollisions(rotatedBoundingBox, [content]), [{ id: 'content-0', category: 'content' }]);
});

test('guides remain absent for Off and are category-filtered in edit mode', () => {
  assert.equal(shouldShowSceneGuide('off', 'content'), false);
  assert.equal(shouldShowSceneGuide('content', 'content'), true);
  assert.equal(shouldShowSceneGuide('content', 'interactive'), false);
  assert.equal(shouldShowSceneGuide('interactive', 'interactive'), true);
  assert.equal(shouldShowSceneGuide('all', 'postcard'), true);
});
