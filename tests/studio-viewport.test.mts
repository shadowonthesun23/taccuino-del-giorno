import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STUDIO_VIEWPORT_PRESETS,
  calculatePreviewScale,
  clampPanelPosition,
  getStudioViewportPreset,
} from '../lib/studio-viewport.ts';

test('studio exposes the five requested real viewport presets', () => {
  assert.deepEqual(
    STUDIO_VIEWPORT_PRESETS.map(({ width, height }) => [width, height]),
    [[1920, 1080], [1680, 1050], [1440, 900], [1366, 768], [1280, 800]],
  );
  assert.equal(getStudioViewportPreset('unknown').id, '1440x900');
});

test('preview scale fits the selected viewport without changing its dimensions', () => {
  assert.equal(calculatePreviewScale({ width: 1440, height: 900 }, { width: 1504, height: 964 }), 1);
  assert.equal(calculatePreviewScale({ width: 1920, height: 1080 }, { width: 1280, height: 800 }), 1216 / 1920);
});

test('floating panels remain inside the visible viewport', () => {
  assert.deepEqual(
    clampPanelPosition({ x: -200, y: 900 }, { width: 280, height: 180 }, { width: 1280, height: 800 }),
    { x: 12, y: 608 },
  );
});
