export type AmbientTrack = 'home' | 'museum';
export type AudioEffect = 'paperOpen' | 'dayChange';

export const AUDIO_PREFERENCE_STORAGE_KEY = 'day-atlas:audio-enabled:v1';

export const AUDIO_ASSETS: {
  ambience: Record<AmbientTrack, string | null>;
  effects: Record<AudioEffect, string | null>;
} = {
  ambience: {
    home: '/audio/home-ambient-jazz.mp3',
    museum: '/audio/museum-gallery-ambience.mp3',
  },
  effects: {
    paperOpen: '/audio/postcard-paper.mp3',
    // Reserved for a future asset; V1 has no day-change trigger.
    dayChange: null,
  },
};

export const AUDIO_LEVELS = {
  master: 1,
  ambience: {
    home: 0.08,
    museum: 0.2,
  },
  effects: {
    paperOpen: 0.045,
    dayChange: 0.04,
  },
} as const;

export const AUDIO_TIMING = {
  ambienceFadeMs: 1800,
} as const;

export function clampAudioLevel(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function getAudioFadeProgress(elapsedMs: number, durationMs: number) {
  if (durationMs <= 0) return 1;
  return clampAudioLevel(elapsedMs / durationMs);
}

export function getAmbientVolume(track: AmbientTrack, masterVolume: number) {
  return clampAudioLevel(masterVolume) * AUDIO_LEVELS.ambience[track];
}

export function getEffectVolume(effect: AudioEffect, masterVolume: number) {
  return clampAudioLevel(masterVolume) * AUDIO_LEVELS.effects[effect];
}

export function readAudioPreference(value: string | null) {
  return value === 'on';
}
