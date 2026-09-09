import assert from 'node:assert/strict';
import test from 'node:test';
import { clampMuseumCamera, getMuseumCameraPose, museumCameraTransform, RESTING_MUSEUM_CAMERA } from '../lib/museum-camera.ts';

test('approach centres the painting by moving the entire wall coordinate system', () => {
  const frame = { x: 500, y: 85, width: 440, height: 360 };
  const pose = getMuseumCameraPose(1440, 634, frame);
  assert.ok(pose.scale > 2.2 && pose.scale < 3.2);
  assert.ok(Math.abs((frame.x + frame.width / 2) * pose.scale + pose.x - 720) < 0.001);
  assert.ok(Math.abs((frame.y + frame.height / 2) * pose.scale + pose.y - 634 * 0.44) < 0.001);
});

test('portrait mobile still approaches when the painting already fills the width', () => {
  const pose = getMuseumCameraPose(390, 844, { x: 15, y: 195, width: 360, height: 300 });
  assert.equal(pose.scale, 2);
  assert.ok(pose.x <= 0 && pose.x >= 390 * (1 - pose.scale));
  assert.ok(pose.y <= 0 && pose.y >= 844 * (1 - pose.scale));
});

test('dragging cannot expose empty space outside the room', () => {
  assert.deepEqual(clampMuseumCamera({ scale: 2, x: 100, y: -2000 }, 390, 844), { scale: 2, x: 0, y: -844 });
});

test('rest and invalid geometry do not generate a broken camera transform', () => {
  assert.equal(museumCameraTransform(RESTING_MUSEUM_CAMERA), 'translate3d(0px, 0px, 0) scale(1)');
  assert.deepEqual(getMuseumCameraPose(390, 844, { x: 0, y: 0, width: 0, height: 0 }), RESTING_MUSEUM_CAMERA);
});
