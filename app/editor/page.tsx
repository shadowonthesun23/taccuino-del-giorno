'use client';

import { FormEvent, useEffect, useState } from 'react';
import { IM_Fell_Double_Pica } from 'next/font/google';

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

export default function EditorPage() {
  const [secret, setSecret] = useState('');
  const [date, setDate] = useState(todayInRome);
  const [author, setAuthor] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [hasSnapshot, setHasSnapshot] = useState(false);

  useEffect(() => {
    setSecret(window.localStorage.getItem('taccuino-editor-secret') ?? '');
  }, []);

  useEffect(() => {
    setHasSnapshot(Boolean(window.localStorage.getItem(snapshotKey(date))));
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

  return (
    <main className={`${garamond.className} min-h-screen bg-[#f8f6f0] px-5 py-10 text-[#2a2522]`}>
      <section className="mx-auto max-w-3xl rounded-[18px] border border-[#b5956a]/25 bg-[#fffdf6]/82 p-6 shadow-[0_24px_70px_-52px_rgba(42,37,34,0.42)] md:p-9">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[#9e2a2b]">Editor</p>
        <h1 className="text-4xl font-bold leading-tight md:text-5xl">Direzione curatoriale del giorno</h1>
        <p className="mt-4 max-w-2xl text-lg italic leading-relaxed text-[#5f5548]">
          Usa questa pagina quando vuoi forzare o orientare l’autore del giorno senza intervenire a mano nel database.
          La rigenerazione aggiorna il contenuto della data selezionata.
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
      </section>
    </main>
  );
}
