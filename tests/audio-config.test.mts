import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AUDIO_ASSETS,
  AUDIO_LEVELS,
  clampAudioLevel,
  getAudioFadeProgress,
  getAmbientVolume,
  getEffectVolume,
  readAudioPreference,
  readAudioSettings,
} from '../lib/audio-config.ts';

test('audio remains opt-in unless the persisted value is explicitly on', () => {
  assert.equal(readAudioPreference(null), false);
  assert.equal(readAudioPreference('off'), false);
  assert.equal(readAudioPreference('on'), true);
});

test('master volume is clamped and scales every channel centrally', () => {
  assert.equal(clampAudioLevel(-1), 0);
  assert.equal(clampAudioLevel(2), 1);
  assert.equal(getAmbientVolume('museum', 0.5), AUDIO_LEVELS.ambience.museum * 0.5);
  assert.equal(getEffectVolume('paperOpen', 0.5), AUDIO_LEVELS.effects.paperOpen * 0.5);
  assert.equal(getEffectVolume('paperFlip', 0.5), AUDIO_LEVELS.effects.paperFlip * 0.5);
});

test('audio settings persist play, mute, and a clamped master level', () => {
  assert.deepEqual(readAudioSettings('{"enabled":true,"masterVolume":0.35,"muted":true}'), {
    enabled: true,
    masterVolume: 0.35,
    muted: true,
  });
  assert.equal(readAudioSettings('{"masterVolume":4}').masterVolume, 1);
  assert.equal(readAudioSettings('invalid', 'on').enabled, true);
});

test('fade progress cannot produce an invalid volume around the first animation frame', () => {
  assert.equal(getAudioFadeProgress(-4, 1800), 0);
  assert.equal(getAudioFadeProgress(900, 1800), 0.5);
  assert.equal(getAudioFadeProgress(1900, 1800), 1);
  assert.equal(getAudioFadeProgress(1, 0), 1);
});

test('selected V1 assets are configured while day change stays disabled', () => {
  assert.equal(AUDIO_ASSETS.ambience.home, '/audio/home-ambient-jazz.mp3');
  assert.equal(AUDIO_ASSETS.effects.paperOpen, '/audio/postcard-paper.mp3');
  assert.equal(AUDIO_ASSETS.effects.paperFlip, '/audio/postcard-flip-soft.mp3');
  assert.equal(AUDIO_ASSETS.effects.dayChange, null);
  assert.equal(AUDIO_ASSETS.ambience.museum, '/audio/museum-gallery-ambience.mp3');
  assert.ok(AUDIO_LEVELS.effects.paperOpen < AUDIO_LEVELS.ambience.home);
  assert.ok(AUDIO_LEVELS.effects.paperFlip < AUDIO_LEVELS.ambience.home);
  assert.ok(AUDIO_LEVELS.effects.dayChange < AUDIO_LEVELS.ambience.home);
});
