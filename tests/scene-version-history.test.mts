import assert from 'node:assert/strict';
import test from 'node:test';
import { canDeleteSceneVersion, currentSceneVersion, nextSceneVersionNumber, normalizeSceneVersionDisplayName, rollbackVersionLabel } from '../lib/scene-versioning.ts';

const versions = [
  { id: 'v7', version_number: 7, is_current: false, is_baseline: false },
  { id: 'v12', version_number: 12, is_current: true, is_baseline: false },
  { id: 'v1', version_number: 1, is_current: false, is_baseline: true },
];

test('version history appends after the highest version and keeps one current marker', () => {
  assert.equal(nextSceneVersionNumber(versions), 13);
  assert.equal(currentSceneVersion(versions)?.id, 'v12');
});

test('rollback metadata points to the source without mutating old versions', () => {
  assert.equal(rollbackVersionLabel(7), 'Ripristino di v7');
  assert.equal(versions.find((version) => version.id === 'v7')?.is_current, false);
  assert.equal(canDeleteSceneVersion(), false);
});

test('custom version names trim, cap at sixty characters and clear when empty', () => {
  assert.equal(normalizeSceneVersionDisplayName('  Prima pubblicazione  '), 'Prima pubblicazione');
  assert.equal(normalizeSceneVersionDisplayName('   '), null);
  assert.equal(normalizeSceneVersionDisplayName('x'.repeat(70))?.length, 60);
});
