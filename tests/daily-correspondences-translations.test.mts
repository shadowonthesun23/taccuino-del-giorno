import assert from 'node:assert/strict';
import test from 'node:test';
import { UI_TRANSLATIONS } from '../lib/translation.ts';

const languages = ['IT', 'EN', 'FR', 'DE', 'ES', 'PT'] as const;
const correspondenceKeys = [
  'correspondencesTitle',
  'correspondencesKicker',
  'correspondencesLead',
  'correspondencesCopy',
  'correspondencesFollow',
  'correspondencesDownload',
  'correspondencesPreparing',
  'correspondencesDownloadAria',
  'correspondenceAuthor',
  'correspondenceWord',
  'correspondenceSaint',
  'correspondenceArtwork',
  'correspondenceMusic',
  'correspondenceSky',
  'correspondenceApod',
  'correspondenceArtworkUnavailable',
  'correspondencePortraitUnavailable',
  'correspondenceMusicCoverUnavailable',
  'visiblePlanetsInSky',
  'nakedEye',
  'binocularsRecommended',
  'seasonalArtwork',
  'seasonalArtworkOpen',
  'waxSealAria',
  'edition',
  'number',
  'of',
] as const;

test('provides every daily-correspondences label in all supported languages', () => {
  for (const key of correspondenceKeys) {
    for (const language of languages) {
      const translation = UI_TRANSLATIONS[key]?.[language];
      assert.equal(typeof translation, 'string', `${key} is missing for ${language}`);
      assert.ok(translation.trim(), `${key} is empty for ${language}`);
    }
  }
});
