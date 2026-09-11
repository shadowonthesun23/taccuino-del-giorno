import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSceneAssetUpload } from '../lib/scene-assets.ts';
import { cloneBaselineSceneDraft } from '../lib/scene-draft-editor.ts';
import { isMonthDayActive, resolvePublishedScene } from '../lib/scene-publication.ts';
import { resolveSceneAssetUrl } from '../lib/scene-assets.ts';

test('upload validation accepts PNG/WebP up to 1 MB and rejects other input', () => {
  assert.equal(validateSceneAssetUpload({ name: 'foglia.webp', type: 'image/webp', size: 42_000 }).ok, true);
  assert.equal(validateSceneAssetUpload({ name: 'foglia.jpg', type: 'image/jpeg', size: 42_000 }).ok, false);
  assert.equal(validateSceneAssetUpload({ name: 'foglia.png', type: 'image/png', size: 1_048_577 }).ok, false);
});

test('seasonal dates include boundaries and support intervals across New Year', () => {
  assert.equal(isMonthDayActive(new Date('2026-09-01T00:00:00Z'), '09-01', '09-30'), true);
  assert.equal(isMonthDayActive(new Date('2026-10-01T00:00:00Z'), '09-01', '09-30'), false);
  assert.equal(isMonthDayActive(new Date('2026-01-05T00:00:00Z'), '12-20', '01-10'), true);
});

test('published scene read validates and removes inactive seasonal objects', () => {
  const draft = cloneBaselineSceneDraft();
  const september = resolvePublishedScene(draft, new Date('2026-09-10T00:00:00Z'));
  const october = resolvePublishedScene(draft, new Date('2026-10-10T00:00:00Z'));
  assert.equal(september?.objects.some((object) => object.id === 'seasonal-fig'), true);
  assert.equal(october?.objects.some((object) => object.id === 'seasonal-fig'), false);
  assert.equal(resolvePublishedScene({ invalid: true }), null);
});

test('baseline seasonal object resolves a replaced bundled asset while retaining the original fallback', () => {
  assert.equal(resolveSceneAssetUrl({ source: 'bundled', path: '/images/seasonal/day-atlas-fico-stagionale.webp' }, '/images/seasonal/day-atlas-fico-stagionale.webp'), null);
  assert.equal(resolveSceneAssetUrl({ source: 'bundled', path: '/images/seasonal/custom-fig.webp' }, '/images/seasonal/day-atlas-fico-stagionale.webp'), '/images/seasonal/custom-fig.webp');
});
