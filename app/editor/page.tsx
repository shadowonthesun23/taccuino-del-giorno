'use client';

import { type ChangeEvent, type FormEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent, useEffect, useRef, useState } from 'react';
import { IM_Fell_Double_Pica } from 'next/font/google';
import { ExternalLink, ImagePlus, RotateCcw, Save, Upload } from 'lucide-react';
import type { DatiTaccuino } from '@/lib/types';
import type { EditorialContentOverrides } from '@/lib/editorial-content';
import { sanitizeEditorialContentOverrides } from '@/lib/editorial-content';
import { createClient as createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  clearEditorialMediaOverrides,
  DEFAULT_EDITORIAL_MEDIA_CROP,
  getEditorialMediaCropImageStyle,
  getEditorialMediaDocument,
  normalizeEditorialMediaValue,
  sanitizeEditorialMediaCrops,
  sanitizeEditorialMediaOverrides,
  saveEditorialMediaDocument,
  type EditorialMediaCrop,
  type EditorialMediaCrops,
  type EditorialMediaOverrides,
  type EditorialMediaSectionId,
} from '@/lib/editorial-media';

const garamond = IM_Fell_Double_Pica({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
});

function todayInRome() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function snapshotKey(date: string) {
  return `taccuino-editor-snapshot-${date}`;
}

type EditorPreviewData = DatiTaccuino & {
  keyword_arte_en?: string | null;
  editorial_media?: unknown;
  editorial_media_crops?: unknown;
  editorial_content?: unknown;
};

const MEDIA_FIELDS: Array<{
  id: EditorialMediaSectionId;
  label: string;
  hint: string;
}> = [
  { id: 'autore', label: 'Autore del giorno', hint: 'Ritratto o fotografia d’archivio.' },
  { id: 'santi', label: 'Santi', hint: 'Icona, dipinto o immagine del santo.' },
  { id: 'opera', label: 'Opera del giorno', hint: 'Immagine dell’opera da usare nella tavola.' },
  { id: 'musica', label: 'Musica', hint: 'Copertina dell’album o del brano.' },
  { id: 'apod', label: 'Foto astronomica', hint: 'Un’immagine astronomica alternativa.' },
];

function mediaSearchQuery(id: EditorialMediaSectionId, preview: EditorPreviewData | null, author: string, date: string) {
  const currentAuthor = preview?.autore_giorno?.trim() || author.trim() || 'autore del giorno';

  switch (id) {
    case 'autore':
      return `${currentAuthor} ritratto`;
    case 'santi':
      return `${preview?.santi?.[0]?.nome?.trim() || 'santo del giorno'} immagine`;
    case 'opera':
      return `${preview?.keyword_arte_en?.trim() || 'artwork museum'} painting`;
    case 'musica':
      return `${preview?.musica?.brano?.trim() || 'album'} ${preview?.musica?.autore?.trim() || ''} cover`.trim();
    case 'apod':
      return `astronomy ${date} NASA`;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isRecordValue(value: unknown): value is Record<string, string> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function AuthorCropEditor({
  src,
  crop,
  onChange,
  onReset,
}: {
  src: string;
  crop: EditorialMediaCrop;
  onChange: (crop: EditorialMediaCrop) => void;
  onReset: () => void;
}) {
  const dragRef = useRef<{ startX: number; startY: number; cropX: number; cropY: number } | null>(null);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, cropX: crop.x, cropY: crop.y };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const deltaX = ((event.clientX - drag.startX) / Math.max(1, bounds.width)) * 100;
    const deltaY = ((event.clientY - drag.startY) / Math.max(1, bounds.height)) * 100;
    onChange({
      x: clamp(drag.cropX - deltaX, 0, 100),
      y: clamp(drag.cropY - deltaY, 0, 100),
      zoom: crop.zoom,
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    onChange({ ...crop, zoom: clamp(crop.zoom + (event.deltaY < 0 ? 0.05 : -0.05), 1, 3) });
  }

  return (
    <div className="editor-author-crop">
      <div
        className="editor-author-crop-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        role="application"
        aria-label="Ritaglia il ritratto dell’autore trascinando la foto"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- crop preview accepts author-supplied remote URLs and local data URLs */}
        <img
          src={src}
          alt="Anteprima del ritaglio dell’autore"
          draggable={false}
          style={getEditorialMediaCropImageStyle(crop)}
        />
        <span className="editor-author-crop-guides" aria-hidden="true" />
      </div>
      <div className="editor-author-crop-controls">
        <label>
          <span>Zoom <strong>{crop.zoom.toFixed(2)}×</strong></span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={crop.zoom}
            aria-label="Zoom del ritratto"
            onChange={(event) => onChange({ ...crop, zoom: Number(event.target.value) })}
          />
        </label>
        <button type="button" onClick={onReset}>Ripristina inquadratura</button>
      </div>
      <p className="editor-author-crop-hint">Trascina la foto per scegliere il punto da mettere in evidenza. Puoi anche usare la rotellina sul computer.</p>
    </div>
  );
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Scegli un file immagine.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossibile leggere il file immagine.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Impossibile preparare l’anteprima dell’immagine.'));
      image.onload = () => {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Il browser non permette di preparare questa immagine.'));
          return;
        }

        context.fillStyle = '#f8f6f0';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
        if (!normalizeEditorialMediaValue(dataUrl)) {
          reject(new Error('L’immagine è troppo grande. Scegline una più leggera.'));
          return;
        }
        resolve(dataUrl);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function EditorPage() {
  const [date, setDate] = useState(todayInRome);
  const [author, setAuthor] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [previewData, setPreviewData] = useState<EditorPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [mediaOverrides, setMediaOverrides] = useState<EditorialMediaOverrides>({});
  const [mediaCrops, setMediaCrops] = useState<EditorialMediaCrops>({});
  const [mediaStatus, setMediaStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [mediaMessage, setMediaMessage] = useState('');
  const [contentOverrides, setContentOverrides] = useState<EditorialContentOverrides>({});
  const [contentStatus, setContentStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [contentMessage, setContentMessage] = useState('');

  useEffect(() => {
    // Remove the legacy secret that older editor versions stored in localStorage.
    window.localStorage.removeItem('taccuino-editor-secret');
  }, []);

  useEffect(() => {
    // Snapshot availability is an external localStorage value keyed by the selected date.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasSnapshot(Boolean(window.localStorage.getItem(snapshotKey(date))));
  }, [date]);

  useEffect(() => {
    // Manual media is an external localStorage value keyed by the selected date.
    const localDocument = getEditorialMediaDocument(date);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMediaOverrides(localDocument.overrides);
    setMediaCrops(localDocument.crops);
    setContentOverrides({});
    setMediaStatus('idle');
    setMediaMessage('');
    setContentStatus('idle');
    setContentMessage('');
  }, [date]);

  useEffect(() => {
    let cancelled = false;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      // Clear stale preview content while the date input is temporarily incomplete.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewData(null);
      setPreviewLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setPreviewLoading(true);
    fetch(`/api/oggi?data=${encodeURIComponent(date.trim())}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<EditorPreviewData> : null)
      .then((nextPreview) => {
        if (!cancelled) {
          setPreviewData(nextPreview);
          if (nextPreview) {
            const remoteOverrides = sanitizeEditorialMediaOverrides(nextPreview.editorial_media);
            const remoteCrops = sanitizeEditorialMediaCrops(nextPreview.editorial_media_crops);
            const localDocument = getEditorialMediaDocument(date.trim());
            const hasRemoteMedia = Object.keys(remoteOverrides).length > 0 || Object.keys(remoteCrops).length > 0;
            setMediaOverrides(hasRemoteMedia ? remoteOverrides : localDocument.overrides);
            setMediaCrops(hasRemoteMedia ? remoteCrops : localDocument.crops);
            setContentOverrides(sanitizeEditorialContentOverrides(nextPreview.editorial_content));
          }
        }
      })
      .catch(() => {
        if (!cancelled) setPreviewData(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [date]);

  async function fetchCurrentDay() {
    const response = await fetch(`/api/oggi?data=${encodeURIComponent(date.trim())}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return response.json();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setMessage('Salvo una copia locale e poi rigenero il giorno…');

    try {
      if (!date.trim()) throw new Error('Inserisci una data.');
      if (!author.trim() && !notes.trim()) {
        throw new Error('Inserisci almeno un autore o una nota curatoriale.');
      }

      const currentDay = await fetchCurrentDay();
      if (currentDay) {
        window.localStorage.setItem(snapshotKey(date.trim()), JSON.stringify({
          savedAt: new Date().toISOString(),
          data: currentDay,
        }));
        setHasSnapshot(true);
      }

      const params = new URLSearchParams({ data: date.trim() });
      if (author.trim()) params.set('autore', author.trim());
      if (notes.trim()) params.set('note', notes.trim());

      const response = await fetch(`/api/generate?${params.toString()}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Errore ${response.status}`);
      }

      setStatus('success');
      setMessage(`Giorno ${date} rigenerato. Ora puoi aprire la home con ?data=${date}.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Rigenerazione non riuscita.');
    }
  }

  async function handleRestore() {
    setStatus('loading');
    setMessage('Ripristino la copia locale salvata prima della rigenerazione…');

    try {
      const rawSnapshot = window.localStorage.getItem(snapshotKey(date.trim()));
      if (!rawSnapshot) throw new Error('Non c’è una copia locale da ripristinare per questa data.');
      const snapshot = JSON.parse(rawSnapshot) as { data?: Record<string, unknown> };
      if (!snapshot.data) throw new Error('La copia locale non è valida.');

      const response = await fetch('/api/editor/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: date.trim(), contenuto: snapshot.data }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Errore ${response.status}`);
      }

      setStatus('success');
      setMessage(`Ripristinata la versione precedente del ${date}.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Ripristino non riuscito.');
    }
  }

  function updateMediaOverride(section: EditorialMediaSectionId, value: string) {
    setMediaOverrides((current) => ({ ...current, [section]: value }));
    if (section === 'autore') {
      setMediaCrops((current) => current.autore ? {} : current);
    }
    setMediaStatus('idle');
    setMediaMessage('');
  }

  function updateAuthorCrop(crop: EditorialMediaCrop) {
    setMediaCrops({ autore: crop });
    setMediaStatus('idle');
    setMediaMessage('');
  }

  function updateContentOverride(section: Exclude<keyof EditorialContentOverrides, 'avvenimenti'>, field: string, value: string) {
    setContentOverrides((current) => {
      const next = { ...current } as Record<string, unknown>;
      const group = isRecordValue(next[section]) ? { ...(next[section] as Record<string, string>) } : {};
      group[field] = value;
      next[section] = group;
      return next as EditorialContentOverrides;
    });
    setContentStatus('idle');
    setContentMessage('');
  }

  function updateEvents(value: string) {
    setContentOverrides((current) => ({ ...current, avvenimenti: value.split('\n') }));
    setContentStatus('idle');
    setContentMessage('');
  }

  async function handleMediaFileChange(section: EditorialMediaSectionId, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const dataUrl = await readImageFile(file);
      updateMediaOverride(section, dataUrl);
    } catch (error) {
      setMediaStatus('error');
      setMediaMessage(error instanceof Error ? error.message : 'Impossibile usare questa immagine.');
    }
  }

  async function handleSaveMedia() {
    const invalidField = MEDIA_FIELDS.find(({ id }) => {
      const value = mediaOverrides[id];
      return Boolean(value?.trim()) && !normalizeEditorialMediaValue(value);
    });

    if (invalidField) {
      setMediaStatus('error');
      setMediaMessage(`L’immagine per “${invalidField.label}” non è un URL https valido. Usa un URL diretto oppure carica il file.`);
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setMediaStatus('error');
      setMediaMessage('Inserisci una data valida prima di salvare le immagini.');
      return;
    }

    setMediaStatus('loading');
    setMediaMessage('Pubblico le immagini nella tavola condivisa…');

    try {
      const overrides = sanitizeEditorialMediaOverrides(mediaOverrides);
      const crops = sanitizeEditorialMediaCrops(mediaCrops);
      const response = await fetch('/api/editorial-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: date.trim(), overrides, crops }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Errore ${response.status}`);
      }

      const result = await response.json() as { overrides?: unknown; crops?: unknown };
      const savedOverrides = sanitizeEditorialMediaOverrides(result.overrides ?? overrides);
      const savedCrops = sanitizeEditorialMediaCrops(result.crops ?? crops);
      saveEditorialMediaDocument(date.trim(), { overrides: savedOverrides, crops: savedCrops });
      setMediaOverrides(savedOverrides);
      setMediaCrops(savedCrops);
      setMediaStatus('success');
      setMediaMessage('Immagini pubblicate in Supabase: ora valgono per tutti i visitatori.');
    } catch (error) {
      setMediaStatus('error');
      setMediaMessage(error instanceof Error ? error.message : 'Pubblicazione delle immagini non riuscita.');
    }
  }

  async function handleClearMedia() {
    if (!window.confirm(`Rimuovere tutte le immagini manuali del ${date}?`)) return;
    setMediaStatus('loading');
    setMediaMessage('Rimuovo le immagini dalla tavola condivisa…');

    try {
      const response = await fetch('/api/editorial-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: date.trim(), overrides: {}, crops: {} }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Errore ${response.status}`);
      }

      clearEditorialMediaOverrides(date.trim());
      setMediaOverrides({});
      setMediaCrops({});
      setMediaStatus('success');
      setMediaMessage('Immagini manuali rimosse dalla tavola condivisa.');
    } catch (error) {
      setMediaStatus('error');
      setMediaMessage(error instanceof Error ? error.message : 'Rimozione delle immagini non riuscita.');
    }
  }

  async function refreshEditorPreview() {
    const response = await fetch(`/api/oggi?data=${encodeURIComponent(date.trim())}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return response.json() as Promise<EditorPreviewData>;
  }

  async function handleSaveContent() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setContentStatus('error');
      setContentMessage('Inserisci una data valida prima di salvare il contenuto.');
      return;
    }

    setContentStatus('loading');
    setContentMessage('Pubblico il contenuto nella tavola condivisa…');

    try {
      const overrides = sanitizeEditorialContentOverrides(contentOverrides);
      const response = await fetch('/api/editorial-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: date.trim(), overrides }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Errore ${response.status}`);
      }

      const result = await response.json() as { overrides?: unknown };
      const savedOverrides = sanitizeEditorialContentOverrides(result.overrides ?? overrides);
      setContentOverrides(savedOverrides);
      const refreshedPreview = await refreshEditorPreview();
      if (refreshedPreview) setPreviewData(refreshedPreview);
      setContentStatus('success');
      setContentMessage('Contenuto pubblicato in Supabase: ora vale per tutti i visitatori.');
    } catch (error) {
      setContentStatus('error');
      setContentMessage(error instanceof Error ? error.message : 'Pubblicazione del contenuto non riuscita.');
    }
  }

  async function handleClearContent() {
    if (!window.confirm(`Ripristinare il contenuto automatico del ${date}?`)) return;
    setContentStatus('loading');
    setContentMessage('Ripristino il contenuto automatico…');

    try {
      const response = await fetch('/api/editorial-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: date.trim(), overrides: {} }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Errore ${response.status}`);
      }

      setContentOverrides({});
      const refreshedPreview = await refreshEditorPreview();
      if (refreshedPreview) setPreviewData(refreshedPreview);
      setContentStatus('success');
      setContentMessage('Contenuto automatico ripristinato per questa data.');
    } catch (error) {
      setContentStatus('error');
      setContentMessage(error instanceof Error ? error.message : 'Ripristino del contenuto non riuscito.');
    }
  }

  async function handleLogout() {
    await createSupabaseBrowserClient().auth.signOut();
    window.location.replace('/login');
  }

  return (
    <main className={`${garamond.className} editor-page min-h-screen bg-[#f8f6f0] px-5 py-10 text-[#2a2522]`}>
      <section className="editor-card mx-auto max-w-5xl rounded-[18px] border border-[#b5956a]/25 bg-[#fffdf6]/82 p-6 shadow-[0_24px_70px_-52px_rgba(42,37,34,0.42)] md:p-9">
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#9e2a2b]">Editor</p>
          <button
            className="editor-logout text-xs font-bold uppercase tracking-[0.14em] text-[#6f614d] underline decoration-[#b5956a]/60 underline-offset-4"
            type="button"
            onClick={() => void handleLogout()}
          >
            Esci
          </button>
        </div>
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">Direzione curatoriale del giorno</h1>
        <p className="editor-intro mt-4 max-w-2xl text-lg italic leading-relaxed text-[#5f5548]">
          Usa questa pagina quando vuoi forzare o orientare l’autore del giorno senza intervenire a mano nel database.
          La rigenerazione aggiorna il contenuto della data selezionata; le immagini manuali qui sotto completano la tavola senza toccare i contenuti.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-[180px_1fr]">
            <label className="block">
              <span className="editor-top-label mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#6f614d]">Data</span>
              <input
                className="editor-top-input w-full rounded-xl border border-[#b5956a]/35 bg-[#f8f1df] px-4 py-3 text-lg outline-none transition focus:border-[#9e2a2b]"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>

            <label className="block">
              <span className="editor-top-label mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#6f614d]">Autore da forzare</span>
              <input
                className="editor-top-input w-full rounded-xl border border-[#b5956a]/35 bg-[#f8f1df] px-4 py-3 text-lg outline-none transition focus:border-[#9e2a2b]"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="Es. Simone Weil, Italo Calvino, Cristina Campo…"
              />
            </label>
          </div>

          <label className="block">
            <span className="editor-top-label mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#6f614d]">Note curatoriale</span>
            <textarea
              className="editor-top-textarea min-h-36 w-full rounded-xl border border-[#b5956a]/35 bg-[#f8f1df] px-4 py-3 text-lg leading-relaxed outline-none transition focus:border-[#9e2a2b]"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Es. Voglio un taglio più filosofico e meno biografico; collega l’autore al tema della memoria e della responsabilità."
            />
          </label>

          <div className="flex flex-col gap-3 border-t border-[#b5956a]/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="editor-snapshot-note text-sm italic text-[#756957]">
              Prima della rigenerazione salvo una copia locale nel browser, così puoi ripristinarla.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="editor-secondary-action rounded-xl border border-[#756957]/35 bg-transparent px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-[#5f5548] transition hover:border-[#9e2a2b]/45 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={status === 'loading' || !hasSnapshot}
                type="button"
                onClick={handleRestore}
              >
                Ripristina copia
              </button>
              <button
                className="editor-primary-action rounded-xl border border-[#9e2a2b]/55 bg-[#9e2a2b] px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-[#fffdf6] transition hover:bg-[#7f2223] disabled:cursor-wait disabled:opacity-55"
                disabled={status === 'loading'}
                type="submit"
              >
                {status === 'loading' ? 'Lavoro…' : 'Rigenera giorno'}
              </button>
            </div>
          </div>
        </form>

        {message ? (
          <div
            className={`editor-status-message ${status === 'error' ? 'is-error' : ''} mt-6 rounded-xl border px-4 py-3 text-base ${
              status === 'error'
                ? 'border-[#9e2a2b]/30 bg-[#9e2a2b]/8 text-[#7f2223]'
                : 'border-[#b5956a]/25 bg-[#f4eddb] text-[#5f5548]'
            }`}
          >
            {message}
          </div>
        ) : null}

        <section className="editor-media-panel" aria-labelledby="editor-media-title">
          <div className="editor-media-heading">
            <div>
              <p className="editor-media-kicker"><ImagePlus aria-hidden="true" /> Immagini manuali</p>
              <h2 id="editor-media-title">Completa la tavola</h2>
            </div>
            <span className="editor-media-date-note">
              {previewLoading ? 'Leggo il giorno…' : previewData ? `Contenuto del ${date}` : 'Inserimento libero'}
            </span>
          </div>
          <p className="editor-media-intro">
            Qui puoi scegliere le immagini che hanno una presenza reale nella tavola: autore, santi, opera, musica e foto astronomica.
            Dopo il salvataggio vengono pubblicate in Supabase e restano associate alla data scelta per tutti i visitatori.
            Il browser conserva anche una copia di fallback per te.
          </p>
          <div className="editor-media-note">
            <strong>Nota pratica.</strong> Dal pulsante “Cerca immagini” apri una ricerca, poi copia l’URL del file immagine; se il sito non offre un URL diretto, scarica l’immagine e usa “Carica file”.
          </div>

          <div className="editor-media-grid">
            {MEDIA_FIELDS.map((field) => {
              const value = mediaOverrides[field.id] ?? '';
              const query = mediaSearchQuery(field.id, previewData, author, date);
              const cropSource = field.id === 'autore'
                ? normalizeEditorialMediaValue(value) || normalizeEditorialMediaValue(previewData?.foto_autore_url)
                : '';
              const authorCrop = mediaCrops.autore ?? DEFAULT_EDITORIAL_MEDIA_CROP;
              return (
                <fieldset key={field.id} className={`editor-media-field ${field.id === 'autore' ? 'editor-media-author-field' : ''}`}>
                  <div className="editor-media-field-heading">
                    <legend>{field.label}</legend>
                    <a
                      href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="editor-media-search"
                    >
                      <span>Cerca immagini</span>
                      <ExternalLink aria-hidden="true" />
                    </a>
                  </div>
                  <p className="editor-media-hint">{field.hint}</p>
                  <div className="editor-media-input-row">
                    <input
                      className="editor-media-input"
                      type="url"
                      value={value}
                      onChange={(event) => updateMediaOverride(field.id, event.target.value)}
                      placeholder="https://…/immagine.jpg"
                      inputMode="url"
                      spellCheck={false}
                    />
                    <label className="editor-media-upload" htmlFor={`editor-media-file-${field.id}`}>
                      <Upload aria-hidden="true" />
                      <span>Carica file</span>
                      <input
                        id={`editor-media-file-${field.id}`}
                        type="file"
                        accept="image/*"
                        onChange={(event) => void handleMediaFileChange(field.id, event)}
                      />
                    </label>
                  </div>
                  {value ? (
                    <div className="editor-media-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element -- editor previews accept author-supplied remote URLs and local data URLs */}
                      <img src={value} alt={`Anteprima: ${field.label}`} />
                      <button type="button" onClick={() => updateMediaOverride(field.id, '')}>Rimuovi</button>
                    </div>
                  ) : null}
                  {field.id === 'autore' && cropSource ? (
                    <AuthorCropEditor
                      src={cropSource}
                      crop={authorCrop}
                      onChange={updateAuthorCrop}
                      onReset={() => {
                        setMediaCrops({});
                        setMediaStatus('idle');
                        setMediaMessage('');
                      }}
                    />
                  ) : null}
                </fieldset>
              );
            })}
          </div>

          <div className="editor-media-actions">
            <p>Le immagini manuali prendono il posto del risultato automatico nella home e nella tavola, per tutti i visitatori.</p>
            <div>
              <button type="button" className="editor-media-clear" onClick={() => void handleClearMedia()} disabled={mediaStatus === 'loading' || (!Object.keys(mediaOverrides).length && !Object.keys(mediaCrops).length)}>
                <RotateCcw aria-hidden="true" />
                <span>Svuota questa data</span>
              </button>
              <button type="button" className="editor-media-save" onClick={() => void handleSaveMedia()} disabled={mediaStatus === 'loading'}>
                <Save aria-hidden="true" />
                <span>{mediaStatus === 'loading' ? 'Pubblico…' : 'Pubblica immagini'}</span>
              </button>
            </div>
          </div>
          {mediaMessage ? (
            <p className={`editor-media-message ${mediaStatus === 'error' ? 'is-error' : 'is-success'}`} role="status">
              {mediaMessage}
            </p>
          ) : null}
        </section>

        <section className="editor-content-panel" aria-labelledby="editor-content-title">
          <div className="editor-media-heading">
            <div>
              <p className="editor-media-kicker"><Save aria-hidden="true" /> Testi manuali</p>
              <h2 id="editor-content-title">Correggi il contenuto</h2>
            </div>
            <span className="editor-media-date-note">Override condivisi per la data</span>
          </div>
          <p className="editor-media-intro">
            Questi campi sostituiscono solo il testo scelto, senza rigenerare l’intera giornata. Lascia invariato ciò che vuoi mantenere automatico.
            Le modifiche pubblicate valgono per tutti i visitatori; quando cambi testo o autore della citazione, la vecchia fonte viene rimossa se non ne inserisci una nuova.
          </p>

          <div className="editor-content-grid">
            <fieldset className="editor-content-field editor-content-field-wide">
              <legend>Citazione</legend>
              <label>
                <span>Testo</span>
                <textarea
                  className="editor-content-input editor-content-textarea"
                  value={contentOverrides.citazione?.testo ?? previewData?.citazione?.testo ?? ''}
                  onChange={(event) => updateContentOverride('citazione', 'testo', event.target.value)}
                />
              </label>
              <div className="editor-content-two-columns">
                <label>
                  <span>Autore</span>
                  <input
                    className="editor-content-input"
                    value={contentOverrides.citazione?.autore ?? previewData?.citazione?.autore ?? ''}
                    onChange={(event) => updateContentOverride('citazione', 'autore', event.target.value)}
                  />
                </label>
                <label>
                  <span>Fonte</span>
                  <input
                    className="editor-content-input"
                    value={contentOverrides.citazione?.fonte ?? previewData?.citazione?.fonte ?? ''}
                    onChange={(event) => updateContentOverride('citazione', 'fonte', event.target.value)}
                    placeholder="Lascia vuoto per rimuovere la fonte"
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="editor-content-field">
              <legend>Parola del giorno</legend>
              <label>
                <span>Parola</span>
                <input
                  className="editor-content-input"
                  value={contentOverrides.parola_giorno?.parola ?? previewData?.parola_giorno?.parola ?? ''}
                  onChange={(event) => updateContentOverride('parola_giorno', 'parola', event.target.value)}
                />
              </label>
              <label>
                <span>Etimologia</span>
                <input
                  className="editor-content-input"
                  value={contentOverrides.parola_giorno?.etimologia ?? previewData?.parola_giorno?.etimologia ?? ''}
                  onChange={(event) => updateContentOverride('parola_giorno', 'etimologia', event.target.value)}
                />
              </label>
              <label>
                <span>Definizione</span>
                <textarea
                  className="editor-content-input editor-content-textarea"
                  value={contentOverrides.parola_giorno?.definizione ?? previewData?.parola_giorno?.definizione ?? ''}
                  onChange={(event) => updateContentOverride('parola_giorno', 'definizione', event.target.value)}
                />
              </label>
              <label>
                <span>Esempio</span>
                <textarea
                  className="editor-content-input editor-content-textarea editor-content-textarea-compact"
                  value={contentOverrides.parola_giorno?.esempio ?? previewData?.parola_giorno?.esempio ?? ''}
                  onChange={(event) => updateContentOverride('parola_giorno', 'esempio', event.target.value)}
                />
              </label>
              <label>
                <span>Nota</span>
                <textarea
                  className="editor-content-input editor-content-textarea editor-content-textarea-compact"
                  value={contentOverrides.parola_giorno?.nota ?? previewData?.parola_giorno?.nota ?? ''}
                  onChange={(event) => updateContentOverride('parola_giorno', 'nota', event.target.value)}
                />
              </label>
            </fieldset>

            <fieldset className="editor-content-field">
              <legend>Accadde oggi</legend>
              <label>
                <span>Un evento per riga</span>
                <textarea
                  className="editor-content-input editor-content-textarea editor-content-events"
                  value={contentOverrides.avvenimenti?.join('\n') ?? previewData?.avvenimenti?.join('\n') ?? ''}
                  onChange={(event) => updateEvents(event.target.value)}
                />
              </label>
              <p className="editor-content-hint">Le righe vuote vengono ignorate quando pubblichi.</p>
            </fieldset>

            <fieldset className="editor-content-field editor-content-field-wide">
              <legend>Poesia</legend>
              <label>
                <span>Testo</span>
                <textarea
                  className="editor-content-input editor-content-textarea editor-content-poem"
                  value={contentOverrides.poesia?.testo ?? previewData?.poesia?.testo ?? ''}
                  onChange={(event) => updateContentOverride('poesia', 'testo', event.target.value)}
                />
              </label>
              <div className="editor-content-two-columns">
                <label>
                  <span>Autore</span>
                  <input
                    className="editor-content-input"
                    value={contentOverrides.poesia?.autore ?? previewData?.poesia?.autore ?? ''}
                    onChange={(event) => updateContentOverride('poesia', 'autore', event.target.value)}
                  />
                </label>
                <label>
                  <span>Fonte</span>
                  <input
                    className="editor-content-input"
                    value={contentOverrides.poesia?.fonte ?? previewData?.poesia?.fonte ?? ''}
                    onChange={(event) => updateContentOverride('poesia', 'fonte', event.target.value)}
                  />
                </label>
              </div>
              <label>
                <span>Nota curatoriale</span>
                <textarea
                  className="editor-content-input editor-content-textarea editor-content-textarea-compact"
                  value={contentOverrides.poesia?.nota ?? previewData?.poesia?.nota ?? ''}
                  onChange={(event) => updateContentOverride('poesia', 'nota', event.target.value)}
                />
              </label>
            </fieldset>

            <fieldset className="editor-content-field editor-content-field-wide">
              <legend>Passaggio biblico</legend>
              <label>
                <span>Testo</span>
                <textarea
                  className="editor-content-input editor-content-textarea editor-content-poem"
                  value={contentOverrides.bibbia?.testo ?? previewData?.bibbia?.testo ?? ''}
                  onChange={(event) => updateContentOverride('bibbia', 'testo', event.target.value)}
                />
              </label>
              <div className="editor-content-two-columns">
                <label>
                  <span>Fonte</span>
                  <input
                    className="editor-content-input"
                    value={contentOverrides.bibbia?.fonte ?? previewData?.bibbia?.fonte ?? ''}
                    onChange={(event) => updateContentOverride('bibbia', 'fonte', event.target.value)}
                  />
                </label>
                <label>
                  <span>Nota</span>
                  <input
                    className="editor-content-input"
                    value={contentOverrides.bibbia?.nota ?? previewData?.bibbia?.nota ?? ''}
                    onChange={(event) => updateContentOverride('bibbia', 'nota', event.target.value)}
                  />
                </label>
              </div>
            </fieldset>
          </div>

          <p className="editor-content-note">
            Cielo ed effemeridi restano calcolati automaticamente dalla data e dalla posizione scelta dal visitatore.
          </p>
          <div className="editor-media-actions">
            <p>Puoi tornare al testo generato in qualsiasi momento, rimuovendo gli override della data.</p>
            <div>
              <button type="button" className="editor-media-clear" onClick={() => void handleClearContent()} disabled={contentStatus === 'loading'}>
                <RotateCcw aria-hidden="true" />
                <span>Ripristina automatico</span>
              </button>
              <button type="button" className="editor-media-save" onClick={() => void handleSaveContent()} disabled={contentStatus === 'loading'}>
                <Save aria-hidden="true" />
                <span>{contentStatus === 'loading' ? 'Pubblico…' : 'Pubblica contenuti'}</span>
              </button>
            </div>
          </div>
          {contentMessage ? (
            <p className={`editor-media-message ${contentStatus === 'error' ? 'is-error' : 'is-success'}`} role="status">
              {contentMessage}
            </p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
