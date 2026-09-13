'use client';

import { Volume2, VolumeX } from 'lucide-react';
import type { LanguageCode } from '@/lib/types';
import { useAudio } from './AudioProvider';

const AUDIO_COPY: Record<LanguageCode, { label: string; on: string; off: string }> = {
  IT: { label: 'Audio', on: 'Disattiva ambiente sonoro', off: 'Attiva ambiente sonoro' },
  EN: { label: 'Audio', on: 'Turn sound off', off: 'Turn sound on' },
  FR: { label: 'Audio', on: 'Désactiver le son', off: 'Activer le son' },
  DE: { label: 'Audio', on: 'Ton ausschalten', off: 'Ton einschalten' },
  ES: { label: 'Audio', on: 'Desactivar sonido', off: 'Activar sonido' },
  PT: { label: 'Áudio', on: 'Desativar áudio', off: 'Ativar áudio' },
};

export default function GlobalAudioControl({ language }: { language: LanguageCode }) {
  const { activeAmbience, enabled, setEnabled } = useAudio();
  const copy = AUDIO_COPY[language] ?? AUDIO_COPY.EN;
  const actionLabel = enabled ? copy.on : copy.off;

  return (
    <button
      type="button"
      className={`global-audio-control ${enabled ? 'is-on' : 'is-off'} ${activeAmbience === 'museum' ? 'is-museum' : 'is-home'}`}
      aria-label={actionLabel}
      aria-pressed={enabled}
      title={actionLabel}
      data-scene-safe="interactive"
      onClick={() => setEnabled(!enabled)}
    >
      {enabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
      <span>{copy.label}</span>
    </button>
  );
}
