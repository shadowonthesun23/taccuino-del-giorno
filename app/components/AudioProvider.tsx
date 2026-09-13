'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AUDIO_ASSETS,
  AUDIO_LEVELS,
  AUDIO_PREFERENCE_STORAGE_KEY,
  AUDIO_SETTINGS_STORAGE_KEY,
  AUDIO_TIMING,
  clampAudioLevel,
  getAudioFadeProgress,
  getAmbientVolume,
  getEffectVolume,
  readAudioSettings,
  type AmbientTrack,
  type AudioEffect,
} from '@/lib/audio-config';

type AudioElements<T extends string> = Partial<Record<T, HTMLAudioElement>>;

interface AudioContextValue {
  activeAmbience: AmbientTrack;
  enabled: boolean;
  masterVolume: number;
  muted: boolean;
  playEffect: (effect: AudioEffect) => void;
  setAmbience: (track: AmbientTrack) => void;
  setEnabled: (enabled: boolean) => void;
  setMasterVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [activeAmbience, setActiveAmbience] = useState<AmbientTrack>('home');
  const [masterVolume, setMasterVolumeState] = useState<number>(AUDIO_LEVELS.master);
  const [muted, setMutedState] = useState(false);
  const ambienceRef = useRef<AudioElements<AmbientTrack>>({});
  const effectsRef = useRef<AudioElements<AudioEffect>>({});
  const enabledRef = useRef(false);
  const activeAmbienceRef = useRef<AmbientTrack>('home');
  const masterVolumeRef = useRef<number>(AUDIO_LEVELS.master);
  const mutedRef = useRef(false);
  const activatedRef = useRef(false);
  const mountedRef = useRef(false);
  const transitionFrameRef = useRef<number | null>(null);
  const transitionIntentRef = useRef(0);
  const lastEffectRef = useRef<{ effect: AudioEffect; playedAt: number } | null>(null);

  const persistSettings = useCallback(() => {
    try {
      window.localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify({
        enabled: enabledRef.current,
        masterVolume: masterVolumeRef.current,
        muted: mutedRef.current,
      }));
    } catch {
      // Audio remains usable when storage is unavailable or full.
    }
  }, []);

  const stopTransition = useCallback(() => {
    transitionIntentRef.current += 1;
    if (transitionFrameRef.current !== null) {
      window.cancelAnimationFrame(transitionFrameRef.current);
      transitionFrameRef.current = null;
    }
  }, []);

  const fadeOutAll = useCallback((duration = AUDIO_TIMING.ambienceFadeMs) => {
    stopTransition();
    const intent = transitionIntentRef.current;
    const entries = Object.entries(ambienceRef.current) as [AmbientTrack, HTMLAudioElement][];
    const startingVolumes = new Map(entries.map(([track, audio]) => [track, audio.volume]));
    const startedAt = performance.now();

    const paint = (now: number) => {
      if (intent !== transitionIntentRef.current) return;
      const progress = getAudioFadeProgress(now - startedAt, duration);
      for (const [track, audio] of entries) {
        audio.volume = (startingVolumes.get(track) ?? 0) * (1 - progress);
      }
      if (progress < 1) {
        transitionFrameRef.current = window.requestAnimationFrame(paint);
        return;
      }
      transitionFrameRef.current = null;
      for (const [, audio] of entries) audio.pause();
    };

    transitionFrameRef.current = window.requestAnimationFrame(paint);
  }, [stopTransition]);

  const transitionTo = useCallback((track: AmbientTrack) => {
    if (!enabledRef.current || mutedRef.current || !activatedRef.current || document.hidden) return;

    stopTransition();
    const intent = transitionIntentRef.current;
    const entries = Object.entries(ambienceRef.current) as [AmbientTrack, HTMLAudioElement][];
    const targetAudio = ambienceRef.current[track];
    const startingVolumes = new Map(entries.map(([entryTrack, audio]) => [entryTrack, audio.volume]));
    const startedAt = performance.now();

    if (targetAudio?.paused) {
      targetAudio.volume = 0;
      void targetAudio.play().catch(() => {
        if (intent !== transitionIntentRef.current) return;
        targetAudio.pause();
        targetAudio.volume = 0;
      });
    }

    const paint = (now: number) => {
      if (intent !== transitionIntentRef.current) return;
      const progress = getAudioFadeProgress(now - startedAt, AUDIO_TIMING.ambienceFadeMs);
      for (const [entryTrack, audio] of entries) {
        const targetVolume = entryTrack === track && !audio.paused
          ? getAmbientVolume(entryTrack, masterVolumeRef.current)
          : 0;
        const initialVolume = startingVolumes.get(entryTrack) ?? 0;
        audio.volume = initialVolume + (targetVolume - initialVolume) * progress;
      }
      if (progress < 1) {
        transitionFrameRef.current = window.requestAnimationFrame(paint);
        return;
      }
      transitionFrameRef.current = null;
      for (const [entryTrack, audio] of entries) {
        if (entryTrack !== track) audio.pause();
      }
    };

    transitionFrameRef.current = window.requestAnimationFrame(paint);
  }, [stopTransition]);

  const activateFromGesture = useCallback(() => {
    if (!enabledRef.current || mutedRef.current) return;
    activatedRef.current = true;
    const activeTrack = activeAmbienceRef.current;
    const activeAudio = ambienceRef.current[activeTrack];

    // Prime each configured ambience element inside a real user gesture. This
    // lets mobile browsers allow a later room transition without autoplay.
    for (const [track, audio] of Object.entries(ambienceRef.current) as [AmbientTrack, HTMLAudioElement][]) {
      if (track === activeTrack) continue;
      audio.volume = 0;
      void audio.play()
        .then(() => {
          if (!mountedRef.current || track === activeAmbienceRef.current) return;
          audio.pause();
        })
        .catch(() => {
          audio.pause();
          audio.volume = 0;
        });
    }

    if (!activeAudio) {
      transitionTo(activeTrack);
      return;
    }
    activeAudio.volume = 0;
    void activeAudio.play()
      .then(() => {
        if (!mountedRef.current || !enabledRef.current || mutedRef.current || !activatedRef.current) {
          activeAudio.pause();
          return;
        }
        transitionTo(activeAmbienceRef.current);
      })
      .catch(() => {
        activeAudio.pause();
        activeAudio.volume = 0;
      });
  }, [transitionTo]);

  const setEnabled = useCallback((nextEnabled: boolean) => {
    enabledRef.current = nextEnabled;
    setEnabledState(nextEnabled);
    persistSettings();

    if (nextEnabled) {
      activateFromGesture();
      return;
    }
    activatedRef.current = false;
    fadeOutAll();
  }, [activateFromGesture, fadeOutAll, persistSettings]);

  const setMuted = useCallback((nextMuted: boolean) => {
    mutedRef.current = nextMuted;
    setMutedState(nextMuted);
    persistSettings();
    if (!nextMuted && enabledRef.current) {
      activateFromGesture();
      return;
    }
    fadeOutAll();
  }, [activateFromGesture, fadeOutAll, persistSettings]);

  const setAmbience = useCallback((track: AmbientTrack) => {
    if (activeAmbienceRef.current === track) return;
    activeAmbienceRef.current = track;
    setActiveAmbience(track);
    transitionTo(track);
  }, [transitionTo]);

  const playEffect = useCallback((effect: AudioEffect) => {
    if (document.hidden) return;
    const audio = effectsRef.current[effect];
    if (!audio) return;
    const now = performance.now();
    if (lastEffectRef.current?.effect === effect && now - lastEffectRef.current.playedAt < 180) return;
    lastEffectRef.current = { effect, playedAt: now };
    audio.pause();
    audio.currentTime = 0;
    // Postcard/ticket micro-effects are intentionally independent from the
    // ambience play/mute/volume controls and keep their own discreet gain.
    audio.volume = getEffectVolume(effect, 1);
    void audio.play().catch(() => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    const nextVolume = clampAudioLevel(volume);
    masterVolumeRef.current = nextVolume;
    setMasterVolumeState(nextVolume);
    persistSettings();
    transitionTo(activeAmbienceRef.current);
  }, [persistSettings, transitionTo]);

  useEffect(() => {
    mountedRef.current = true;

    for (const [track, src] of Object.entries(AUDIO_ASSETS.ambience) as [AmbientTrack, string | null][]) {
      if (!src) continue;
      const audio = new Audio(src);
      audio.loop = true;
      audio.preload = 'none';
      audio.volume = 0;
      ambienceRef.current[track] = audio;
    }
    for (const [effect, src] of Object.entries(AUDIO_ASSETS.effects) as [AudioEffect, string | null][]) {
      if (!src) continue;
      const audio = new Audio(src);
      audio.preload = 'none';
      audio.volume = 0;
      effectsRef.current[effect] = audio;
    }

    let savedSettings = readAudioSettings(null);
    try {
      savedSettings = readAudioSettings(
        window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY),
        window.localStorage.getItem(AUDIO_PREFERENCE_STORAGE_KEY),
      );
    } catch {
      savedSettings = readAudioSettings(null);
    }
    enabledRef.current = savedSettings.enabled;
    masterVolumeRef.current = savedSettings.masterVolume;
    mutedRef.current = savedSettings.muted;
    const preferenceFrame = window.requestAnimationFrame(() => {
      setEnabledState(savedSettings.enabled);
      setMasterVolumeState(savedSettings.masterVolume);
      setMutedState(savedSettings.muted);
    });

    return () => {
      mountedRef.current = false;
      window.cancelAnimationFrame(preferenceFrame);
      stopTransition();
      for (const audio of [...Object.values(ambienceRef.current), ...Object.values(effectsRef.current)]) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
      ambienceRef.current = {};
      effectsRef.current = {};
    };
  }, [stopTransition]);

  useEffect(() => {
    if (!enabled || muted || activatedRef.current) return;
    const handleFirstGesture = () => activateFromGesture();
    document.addEventListener('pointerdown', handleFirstGesture, { capture: true, once: true });
    document.addEventListener('keydown', handleFirstGesture, { capture: true, once: true });
    return () => {
      document.removeEventListener('pointerdown', handleFirstGesture, true);
      document.removeEventListener('keydown', handleFirstGesture, true);
    };
  }, [activateFromGesture, enabled, muted]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTransition();
        for (const audio of [...Object.values(ambienceRef.current), ...Object.values(effectsRef.current)]) {
          audio.pause();
          audio.volume = 0;
        }
        return;
      }
      transitionTo(activeAmbienceRef.current);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [stopTransition, transitionTo]);

  const value = useMemo<AudioContextValue>(() => ({
    activeAmbience,
    enabled,
    masterVolume,
    muted,
    playEffect,
    setAmbience,
    setEnabled,
    setMasterVolume,
    setMuted,
  }), [activeAmbience, enabled, masterVolume, muted, playEffect, setAmbience, setEnabled, setMasterVolume, setMuted]);

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within AudioProvider');
  return context;
}
