'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ExternalLink, Music2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { HOME_AMBIENT_METADATA } from '@/lib/audio-config';
import type { LanguageCode } from '@/lib/types';
import { useAudio } from './AudioProvider';

interface AudioCopy {
  ambience: string;
  controls: string;
  home: string;
  museum: string;
  mute: string;
  pause: string;
  play: string;
  source: string;
  unmute: string;
  volume: string;
}

const AUDIO_COPY: Record<LanguageCode, AudioCopy> = {
  IT: { ambience: 'Atmosfera sonora', controls: 'Controlli audio', home: 'Stanza di lettura', museum: 'Sala museo', mute: 'Disattiva suono', pause: 'Pausa', play: 'Riproduci', source: 'Credito', unmute: 'Riattiva suono', volume: 'Volume' },
  EN: { ambience: 'Sound atmosphere', controls: 'Audio controls', home: 'Reading room', museum: 'Museum room', mute: 'Mute', pause: 'Pause', play: 'Play', source: 'Credit', unmute: 'Unmute', volume: 'Volume' },
  FR: { ambience: 'Atmosphère sonore', controls: 'Contrôles audio', home: 'Salle de lecture', museum: 'Salle du musée', mute: 'Couper le son', pause: 'Pause', play: 'Lecture', source: 'Crédit', unmute: 'Réactiver le son', volume: 'Volume' },
  DE: { ambience: 'Klangatmosphäre', controls: 'Audiosteuerung', home: 'Lesezimmer', museum: 'Museumsraum', mute: 'Stummschalten', pause: 'Pause', play: 'Abspielen', source: 'Quelle', unmute: 'Ton einschalten', volume: 'Lautstärke' },
  ES: { ambience: 'Atmósfera sonora', controls: 'Controles de audio', home: 'Sala de lectura', museum: 'Sala del museo', mute: 'Silenciar', pause: 'Pausa', play: 'Reproducir', source: 'Crédito', unmute: 'Activar sonido', volume: 'Volumen' },
  PT: { ambience: 'Atmosfera sonora', controls: 'Controlos de áudio', home: 'Sala de leitura', museum: 'Sala do museu', mute: 'Silenciar', pause: 'Pausa', play: 'Reproduzir', source: 'Crédito', unmute: 'Ativar som', volume: 'Volume' },
};

const MUSEUM_AUDIO_COPY: Record<LanguageCode, { label: string; on: string; off: string }> = {
  IT: { label: 'Ambiente', on: 'Disattiva ambiente museale', off: 'Attiva ambiente museale' },
  EN: { label: 'Ambience', on: 'Turn museum ambience off', off: 'Turn museum ambience on' },
  FR: { label: 'Ambiance', on: 'Désactiver l’ambiance du musée', off: 'Activer l’ambiance du musée' },
  DE: { label: 'Ambiente', on: 'Museumsatmosphäre ausschalten', off: 'Museumsatmosphäre einschalten' },
  ES: { label: 'Ambiente', on: 'Desactivar el ambiente del museo', off: 'Activar el ambiente del museo' },
  PT: { label: 'Ambiente', on: 'Desativar o ambiente do museu', off: 'Ativar o ambiente do museu' },
};

export default function GlobalAudioControl({ language }: { language: LanguageCode }) {
  const { activeAmbience, enabled, masterVolume, muted, setEnabled, setMasterVolume, setMuted } = useAudio();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const playPauseRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const copy = AUDIO_COPY[language] ?? AUDIO_COPY.EN;
  const museumCopy = MUSEUM_AUDIO_COPY[language] ?? MUSEUM_AUDIO_COPY.EN;
  const audible = enabled && !muted && masterVolume > 0;

  useEffect(() => {
    if (activeAmbience === 'museum') setOpen(false);
  }, [activeAmbience]);

  useEffect(() => {
    if (!open) return;
    const focusFrame = window.requestAnimationFrame(() => playPauseRef.current?.focus());
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (activeAmbience === 'museum') {
    const actionLabel = audible ? museumCopy.on : museumCopy.off;
    return (
      <button
        type="button"
        className={`museum-ambience-control ${audible ? 'is-on' : 'is-off'}`}
        aria-label={actionLabel}
        aria-pressed={audible}
        title={actionLabel}
        data-scene-safe="interactive"
        onClick={(event) => {
          event.stopPropagation();
          if (!enabled) {
            setEnabled(true);
            setMuted(false);
            return;
          }
          setMuted(!muted);
        }}
      >
        {audible ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
        <span>{museumCopy.label}</span>
      </button>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`global-audio-control min-[1180px]:max-[1660px]:!right-[172px] ${open ? 'is-open' : ''} ${audible ? 'is-audible' : ''} is-home`}
      data-scene-safe="interactive"
    >
      {open ? (
        <section className="global-audio-popover" role="dialog" aria-modal="false" aria-labelledby={titleId}>
          <Music2 className="global-audio-mark" aria-hidden="true" />
          <div className="global-audio-track">
            <strong id={titleId}>{HOME_AMBIENT_METADATA.title}</strong>
            {HOME_AMBIENT_METADATA.artist ? <span>{HOME_AMBIENT_METADATA.artist}</span> : null}
            <small title={copy.ambience}>{copy.home}</small>
          </div>

          <div className="global-audio-actions">
            <button
              ref={playPauseRef}
              type="button"
              className="global-audio-action is-primary"
              aria-label={enabled ? copy.pause : copy.play}
              onClick={() => setEnabled(!enabled)}
            >
              {enabled ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </button>
            <button
              type="button"
              className="global-audio-action"
              aria-label={muted ? copy.unmute : copy.mute}
              aria-pressed={muted}
              onClick={() => setMuted(!muted)}
            >
              {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            </button>
          </div>

          <label className="global-audio-volume">
            <span className="sr-only">{copy.volume}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={masterVolume}
              aria-label={copy.volume}
              onChange={(event) => setMasterVolume(Number(event.currentTarget.value))}
            />
          </label>

          {HOME_AMBIENT_METADATA.sourceUrl ? (
            <a className="global-audio-credit" href={HOME_AMBIENT_METADATA.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`${copy.source}: ${HOME_AMBIENT_METADATA.sourceLabel}`} title={`${copy.source}: ${HOME_AMBIENT_METADATA.sourceLabel}`}>
              <span>{HOME_AMBIENT_METADATA.sourceLabel}</span>
              <ExternalLink aria-hidden="true" />
            </a>
          ) : null}
        </section>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        className="global-audio-trigger notebook-action notebook-action-icon"
        aria-label={copy.controls}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={copy.controls}
        onClick={() => setOpen((current) => !current)}
      >
        {audible ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
      </button>
    </div>
  );
}
