'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const MUSEUM_AMBIENCE_VOLUME = 0.14;
const MUSEUM_AMBIENCE_FADE_MS = 1350;
const FADE_STEP_MS = 50;

const AMBIENCE_COPY = {
  IT: { label: 'Ambiente', on: 'Disattiva ambiente museale', off: 'Attiva ambiente museale' },
  EN: { label: 'Ambience', on: 'Turn museum ambience off', off: 'Turn museum ambience on' },
  FR: { label: 'Ambiance', on: 'Désactiver l’ambiance du musée', off: 'Activer l’ambiance du musée' },
  DE: { label: 'Ambiente', on: 'Museumsatmosphäre ausschalten', off: 'Museumsatmosphäre einschalten' },
  ES: { label: 'Ambiente', on: 'Desactivar el ambiente del museo', off: 'Activar el ambiente del museo' },
  PT: { label: 'Ambiente', on: 'Desativar o ambiente do museu', off: 'Ativar o ambiente do museu' },
} as const;

type MuseumLanguage = keyof typeof AMBIENCE_COPY;

export default function MuseumAmbienceControl({
  active,
  language = 'IT',
}: {
  active: boolean;
  language?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const intentRef = useRef(0);
  const enabledRef = useRef(false);
  const mountedRef = useRef(true);
  const [isEnabled, setIsEnabled] = useState(false);

  const copy = AMBIENCE_COPY[(language as MuseumLanguage) in AMBIENCE_COPY
    ? language as MuseumLanguage
    : 'EN'];

  const stopFade = useCallback(() => {
    if (fadeTimerRef.current !== null) {
      window.clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const fadeTo = useCallback((targetVolume: number, onComplete?: () => void) => {
    const audio = audioRef.current;
    if (!audio) return;

    stopFade();
    const initialVolume = audio.volume;
    const startedAt = performance.now();

    fadeTimerRef.current = window.setInterval(() => {
      const progress = Math.min((performance.now() - startedAt) / MUSEUM_AMBIENCE_FADE_MS, 1);
      audio.volume = initialVolume + (targetVolume - initialVolume) * progress;

      if (progress >= 1) {
        stopFade();
        onComplete?.();
      }
    }, FADE_STEP_MS);
  }, [stopFade]);

  const disableAmbience = useCallback(() => {
    const audio = audioRef.current;
    enabledRef.current = false;
    intentRef.current += 1;
    setIsEnabled(false);
    if (!audio) return;

    fadeTo(0, () => audio.pause());
  }, [fadeTo]);

  const enableAmbience = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    const intent = intentRef.current + 1;
    intentRef.current = intent;
    enabledRef.current = true;
    setIsEnabled(true);
    stopFade();
    audio.volume = 0;

    try {
      await audio.play();
      if (!mountedRef.current || !enabledRef.current || intentRef.current !== intent) {
        audio.pause();
        return;
      }
      fadeTo(MUSEUM_AMBIENCE_VOLUME);
    } catch {
      if (!mountedRef.current || intentRef.current !== intent) return;
      enabledRef.current = false;
      setIsEnabled(false);
      audio.pause();
      audio.volume = 0;
    }
  }, [fadeTo, stopFade]);

  useEffect(() => {
    if (!active && enabledRef.current) disableAmbience();
  }, [active, disableAmbience]);

  useEffect(() => {
    mountedRef.current = true;
    const audio = audioRef.current;

    const handleVisibilityChange = () => {
      if (!audio || !enabledRef.current) return;

      if (document.hidden) {
        intentRef.current += 1;
        stopFade();
        audio.volume = 0;
        audio.pause();
        return;
      }

      void enableAmbience();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      mountedRef.current = false;
      enabledRef.current = false;
      intentRef.current += 1;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopFade();
      if (audio) {
        audio.pause();
        audio.volume = 0;
      }
    };
  }, [enableAmbience, stopFade]);

  return (
    <>
      <button
        type="button"
        className={`museum-ambience-control ${isEnabled ? 'is-on' : 'is-off'}`}
        aria-label={isEnabled ? copy.on : copy.off}
        aria-pressed={isEnabled}
        title={isEnabled ? copy.on : copy.off}
        onClick={(event) => {
          event.stopPropagation();
          if (isEnabled) disableAmbience();
          else void enableAmbience();
        }}
      >
        {isEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
        <span>{copy.label}</span>
      </button>
      <audio ref={audioRef} src="/audio/museum-gallery-ambience.mp3" preload="none" loop />
    </>
  );
}
