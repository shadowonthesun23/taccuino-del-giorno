'use client';

import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react';
import { IM_Fell_Double_Pica } from 'next/font/google';
import { ExternalLink, ImagePlus, RotateCcw, Save, Upload } from 'lucide-react';
import type { DatiTaccuino } from '@/lib/types';
import {
  clearEditorialMediaOverrides,
  getEditorialMediaOverrides,
  normalizeEditorialMediaValue,
  saveEditorialMediaOverrides,
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

type EditorPreviewData = DatiTaccuino & { keyword_arte_en?: string | null };

const MEDIA_FIELDS: Array<{
  id: EditorialMediaSectionId;
  label: string;
  hint: string;
}> = [
  { id: 'autore', label: 'Autore del giorno', hint: 'Ritratto o fotografia d’archivio.' },
  { id: 'citazione', label: 'Citazione', hint: 'Un’immagine che accompagni la voce dell’autore.' },
  { id: 'parola', label: 'Parola del giorno', hint: 'Un’immagine capace di dare corpo al lemma.' },
  { id: 'santi', label: 'Santi', hint: 'Icona, dipinto o immagine del santo.' },
  { id: 'avvenimenti', label: 'Accadde oggi', hint: 'Una fotografia legata all’evento storico.' },
  { id: 'poesia', label: 'Poesia', hint: 'Ritratto del poeta o immagine evocativa.' },
  { id: 'bibbia', label: 'Passaggio biblico', hint: 'Un’immagine d’arte o simbolica.' },
  { id: 'opera', label: 'Opera del giorno', hint: 'Immagine dell’opera da usare nella tavola.' },
  { id: 'musica', label: 'Musica', hint: 'Copertina dell’album o del brano.' },
  { id: 'effemeridi', label: 'Cielo ed effemeridi', hint: 'Una fotografia del cielo o del fenomeno.' },
  { id: 'apod', label: 'Foto astronomica', hint: 'Un’immagine astronomica alternativa.' },
];

function mediaSearchQuery(id: EditorialMediaSectionId, preview: EditorPreviewData | null, author: string, date: string) {
  const currentAuthor = preview?.autore_giorno?.trim() || author.trim() || 'autore del giorno';

  switch (id) {
    case 'autore':
      return `${currentAuthor} ritratto`;
    case 'citazione':
      return `${preview?.citazione?.autore?.trim() || currentAuthor} ritratto archivio`;
    case 'parola':
      return `${preview?.parola_giorno?.parola?.trim() || 'parola italiana'} fotografia`;
    case 'santi':
      return `${preview?.santi?.[0]?.nome?.trim() || 'santo del giorno'} immagine`;
    case 'avvenimenti':
      return `${preview?.avvenimenti?.[0]?.trim() || 'evento storico'} fotografia`;
    case 'poesia':
      return `${preview?.poesia?.autore?.trim() || 'poesia italiana'} ritratto`;
    case 'bibbia':
      return `${preview?.bibbia?.fonte?.trim() || 'passaggio biblico'} arte`;
    case 'opera':
      return `${preview?.keyword_arte_en?.trim() || 'artwork museum'} painting`;
    case 'musica':
      return `${preview?.musica?.brano?.trim() || 'album'} ${preview?.musica?.autore?.trim() || ''} cover`.trim();
    case 'effemeridi':
      return `night sky ${date}`;
    case 'apod':
      return `astronomy ${date} NASA`;
  }
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
  const [secret, setSecret] = useState('');
  const [date, setDate] = useState(todayInRome);
  const [author, setAuthor] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [previewData, setPreviewData] = useState<EditorPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [mediaOverrides, setMediaOverrides] = useState<EditorialMediaOverrides>({});
  const [mediaStatus, setMediaStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [mediaMessage, setMediaMessage] = useState('');

  useEffect(() => {
    // The editor secret is a client-only preference; hydrate it after the server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSecret(window.localStorage.getItem('taccuino-editor-secret') ?? '');
  }, []);

  useEffect(() => {
    // Snapshot availability is an external localStorage value keyed by the selected date.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasSnapshot(Boolean(window.localStorage.getItem(snapshotKey(date))));
  }, [date]);

  useEffect(() => {
    // Manual media is an external localStorage value keyed by the selected date.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMediaOverrides(getEditorialMediaOverrides(date));
    setMediaStatus('idle');
    setMediaMessage('');
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
        if (!cancelled) setPreviewData(nextPreview);
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
      if (!secret.trim()) throw new Error('Inserisci il CRON_SECRET.');
      if (!date.trim()) throw new Error('Inserisci una data.');
      if (!author.trim() && !notes.trim()) {
        throw new Error('Inserisci almeno un autore o una nota curatoriale.');
      }

      window.localStorage.setItem('taccuino-editor-secret', secret.trim());
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
        headers: {
          Authorization: `Bearer ${secret.trim()}`,
        },
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
      if (!secret.trim()) throw new Error('Inserisci il CRON_SECRET.');
      const rawSnapshot = window.localStorage.getItem(snapshotKey(date.trim()));
      if (!rawSnapshot) throw new Error('Non c’è una copia locale da ripristinare per questa data.');
      const snapshot = JSON.parse(rawSnapshot) as { data?: Record<string, unknown> };
      if (!snapshot.data) throw new Error('La copia locale non è valida.');

      const response = await fetch('/api/editor/restore', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret.trim()}`,
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
    setMediaStatus('idle');
    setMediaMessage('');
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

  function handleSaveMedia() {
    const invalidField = MEDIA_FIELDS.find(({ id }) => {
      const value = mediaOverrides[id];
      return Boolean(value?.trim()) && !normalizeEditorialMediaValue(value);
    });

    if (invalidField) {
      setMediaStatus('error');
      setMediaMessage(`L’immagine per “${invalidField.label}” non è un URL https valido. Usa un URL diretto oppure carica il file.`);
      return;
    }

    if (!saveEditorialMediaOverrides(date.trim(), mediaOverrides)) {
      setMediaStatus('error');
      setMediaMessage('Non riesco a salvare le immagini in questo browser.');
      return;
    }

    setMediaOverrides(getEditorialMediaOverrides(date.trim()));
    setMediaStatus('success');
    setMediaMessage('Immagini salvate per questa data in questo browser.');
  }

  function handleClearMedia() {
    if (!window.confirm(`Rimuovere tutte le immagini manuali del ${date}?`)) return;
    clearEditorialMediaOverrides(date.trim());
    setMediaOverrides({});
    setMediaStatus('success');
    setMediaMessage('Immagini manuali rimosse per questa data.');
  }

  return (
    <main className={`${garamond.className} min-h-screen bg-[#f8f6f0] px-5 py-10 text-[#2a2522]`}>
      <section className="mx-auto max-w-5xl rounded-[18px] border border-[#b5956a]/25 bg-[#fffdf6]/82 p-6 shadow-[0_24px_70px_-52px_rgba(42,37,34,0.42)] md:p-9">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[#9e2a2b]">Editor</p>
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">Direzione curatoriale del giorno</h1>
        <p className="mt-4 max-w-2xl text-lg italic leading-relaxed text-[#5f5548]">
          Usa questa pagina quando vuoi forzare o orientare l’autore del giorno senza intervenire a mano nel database.
          La rigenerazione aggiorna il contenuto della data selezionata; le immagini manuali qui sotto completano la tavola senza toccare i contenuti.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#6f614d]">CRON_SECRET</span>
            <input
              className="w-full rounded-xl border border-[#b5956a]/35 bg-[#f8f1df] px-4 py-3 text-lg outline-none transition focus:border-[#9e2a2b]"
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="La chiave privata usata per generare"
            />
          </label>

          <div className="grid gap-5 md:grid-cols-[180px_1fr]">
            <label className="block">
              <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#6f614d]">Data</span>
              <input
                className="w-full rounded-xl border border-[#b5956a]/35 bg-[#f8f1df] px-4 py-3 text-lg outline-none transition focus:border-[#9e2a2b]"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#6f614d]">Autore da forzare</span>
              <input
                className="w-full rounded-xl border border-[#b5956a]/35 bg-[#f8f1df] px-4 py-3 text-lg outline-none transition focus:border-[#9e2a2b]"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder="Es. Simone Weil, Italo Calvino, Cristina Campo…"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-[#6f614d]">Note curatoriale</span>
            <textarea
              className="min-h-36 w-full rounded-xl border border-[#b5956a]/35 bg-[#f8f1df] px-4 py-3 text-lg leading-relaxed outline-none transition focus:border-[#9e2a2b]"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Es. Voglio un taglio più filosofico e meno biografico; collega l’autore al tema della memoria e della responsabilità."
            />
          </label>

          <div className="flex flex-col gap-3 border-t border-[#b5956a]/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm italic text-[#756957]">
              Prima della rigenerazione salvo una copia locale nel browser, così puoi ripristinarla.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="rounded-xl border border-[#756957]/35 bg-transparent px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-[#5f5548] transition hover:border-[#9e2a2b]/45 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={status === 'loading' || !hasSnapshot}
                type="button"
                onClick={handleRestore}
              >
                Ripristina copia
              </button>
              <button
                className="rounded-xl border border-[#9e2a2b]/55 bg-[#9e2a2b] px-6 py-3 text-sm font-bold uppercase tracking-[0.16em] text-[#fffdf6] transition hover:bg-[#7f2223] disabled:cursor-wait disabled:opacity-55"
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
            className={`mt-6 rounded-xl border px-4 py-3 text-base ${
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
            Per ogni sezione puoi incollare l’URL diretto dell’immagine oppure caricare un file che hai trovato online.
            Le immagini vengono salvate solo in questo browser e restano associate alla data scelta.
          </p>
          <div className="editor-media-note">
            <strong>Nota pratica.</strong> Dal pulsante “Cerca immagini” apri una ricerca, poi copia l’URL del file immagine; se il sito non offre un URL diretto, scarica l’immagine e usa “Carica file”.
          </div>

          <div className="editor-media-grid">
            {MEDIA_FIELDS.map((field) => {
              const value = mediaOverrides[field.id] ?? '';
              const query = mediaSearchQuery(field.id, previewData, author, date);
              return (
                <fieldset key={field.id} className="editor-media-field">
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
                </fieldset>
              );
            })}
          </div>

          <div className="editor-media-actions">
            <p>Le immagini manuali prendono il posto del risultato automatico nella home e nella tavola.</p>
            <div>
              <button type="button" className="editor-media-clear" onClick={handleClearMedia} disabled={!Object.keys(mediaOverrides).length}>
                <RotateCcw aria-hidden="true" />
                <span>Svuota questa data</span>
              </button>
              <button type="button" className="editor-media-save" onClick={handleSaveMedia}>
                <Save aria-hidden="true" />
                <span>Salva immagini</span>
              </button>
            </div>
          </div>
          {mediaMessage ? (
            <p className={`editor-media-message ${mediaStatus === 'error' ? 'is-error' : 'is-success'}`} role="status">
              {mediaMessage}
            </p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
