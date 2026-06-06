'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { EB_Garamond, Caveat } from 'next/font/google';
import localFont from 'next/font/local';
import styles from './passaporto.module.css';

const garamond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

const jocky = localFont({
  src: '../../public/fonts/JockyStarline.ttf',
  display: 'block',
  preload: true,
  fallback: ['serif'],
});

interface OperaGiorno {
  titolo: string;
  artista: string;
  anno: string;
  immagine_url: string;
  immagine_url_hd: string;
  museo: string;
  medium: string;
  dipartimento: string;
}

interface DatiTaccuino {
  data_odierna: string;
  autore_giorno: string;
  breve_descrizione: string;
  citazione: { testo: string; autore: string; fonte: string };
  avvenimenti: string[];
  parola_giorno: { parola: string; definizione: string; etimologia: string; esempio: string; nota: string };
  santi: { nome: string; ruolo: string; anni: string; biografia: string }[];
  bibbia: { testo: string; fonte: string; nota: string };
  poesia: { testo: string; autore: string; fonte: string; nota: string };
  musica: { brano: string; autore: string; genere: string; motivo: string };
  foto_autore_url?: string | null;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'TDG';
}

function formatExLibrisDate(dataIso: string): string {
  const [year, month, day] = dataIso.split('-');
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const monthIndex = Math.max(0, Math.min(11, Number(month) - 1));
  return `${Number(day)} · ${romanMonths[monthIndex]} · ${year}`;
}

function passportCode(dataIso: string, initials: string): string {
  return `${dataIso.replace(/-/g, '')}-${initials}`;
}

function entry(label: string, children: ReactNode) {
  return (
    <section className={styles.entry}>
      <span className={styles.sectionLabel}>{label}</span>
      {children}
    </section>
  );
}

export default function PassportPage() {
  const [data, setData] = useState<DatiTaccuino | null>(null);
  const [opera, setOpera] = useState<OperaGiorno | null>(null);
  const [dataIso, setDataIso] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedDate = params.get('data') || new Date().toISOString().split('T')[0];
    setDataIso(requestedDate);

    Promise.all([
      fetch(`/api/oggi?data=${requestedDate}`).then((res) => {
        if (!res.ok) throw new Error('Nessun contenuto disponibile per questa data.');
        return res.json();
      }),
      fetch('/api/opera').then((res) => res.ok ? res.json() : null).catch(() => null),
    ])
      .then(([nextData, nextOpera]) => {
        setData(nextData);
        setOpera(nextOpera);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const initials = useMemo(() => data ? getInitials(data.autore_giorno) : 'TDG', [data]);

  if (error) {
    return <main className={`${styles.error} ${garamond.className}`}>{error}</main>;
  }

  if (!data) {
    return <main className={`${styles.loading} ${garamond.className}`}>Preparo il passaporto...</main>;
  }

  return (
    <main className={`${styles.page} ${garamond.className}`}>
      <header className={styles.toolbar}>
        <div>
          <h1>Passaporto del Giorno</h1>
          <p>Una mappa A4 orizzontale da stampare e conservare.</p>
        </div>
        <button className={styles.printButton} type="button" onClick={() => window.print()}>
          Scarica PDF
        </button>
      </header>

      <div className={styles.sheetWrap}>
        <article className={styles.sheet} aria-label={`Passaporto del Giorno: ${data.data_odierna}`}>
          <div className={styles.folds} aria-hidden="true">
            <span /><span /><span /><span /><span />
          </div>

          <section className={`${styles.panel} ${styles.cover}`}>
            <p className={styles.number}>N. {passportCode(dataIso, initials)}</p>
            <h2 className={styles.title}>Passaporto del Giorno</h2>
            <p className={styles.date}>{data.data_odierna}</p>
            <div className={styles.stamp}>
              <span>Visitato</span>
              <strong>{initials}</strong>
              <em>{formatExLibrisDate(dataIso)}</em>
            </div>
            <div className={styles.coverAuthor}>
              <span className={styles.sectionLabel}>Autore del Giorno</span>
              <h2>{data.autore_giorno}</h2>
              <p>{data.breve_descrizione}</p>
            </div>
            {data.foto_autore_url && (
              <figure className={styles.authorPhoto}>
                <img src={data.foto_autore_url} alt={`Ritratto dell'autore: ${data.autore_giorno}`} />
              </figure>
            )}
            <p className={styles.foldHint}>Piega lungo i tratteggi</p>
          </section>

          <section className={styles.panel}>
            {entry('Citazione', (
              <>
                <blockquote>&ldquo;{data.citazione.testo}&rdquo;</blockquote>
                <p className={styles.source}>{data.citazione.autore}{data.citazione.fonte ? `, ${data.citazione.fonte}` : ''}</p>
              </>
            ))}
            {entry('Parola del Giorno', (
              <>
                <h2>{data.parola_giorno.parola}</h2>
                <p><strong>{data.parola_giorno.etimologia}</strong></p>
                <p>{data.parola_giorno.definizione}</p>
                {data.parola_giorno.esempio && data.parola_giorno.esempio !== 'null' && (
                  <blockquote>&ldquo;{data.parola_giorno.esempio}&rdquo;</blockquote>
                )}
                {data.parola_giorno.nota && <p>{data.parola_giorno.nota}</p>}
              </>
            ))}
          </section>

          <section className={styles.panel}>
            {entry('I Santi di Oggi', (
              <>
                {data.santi.map((santo, index) => (
                  <div key={index} className={styles.entry}>
                    <h2>{santo.nome}</h2>
                    <p><strong>{santo.ruolo}</strong>{santo.anni ? ` · ${santo.anni}` : ''}</p>
                    <p>{santo.biografia}</p>
                  </div>
                ))}
              </>
            ))}
            {entry('Accadde Oggi', (
              <ul className={styles.events}>
                {data.avvenimenti.map((evento, index) => (
                  <li key={index}>{evento}</li>
                ))}
              </ul>
            ))}
          </section>

          <section className={styles.panel}>
            {entry('Poesia del Giorno', (
              <>
                <h2>{data.poesia.autore}</h2>
                <p className={styles.source}>{data.poesia.fonte}</p>
                <p className={styles.poem}>{data.poesia.testo}</p>
                {data.poesia.nota && <p>{data.poesia.nota}</p>}
              </>
            ))}
          </section>

          <section className={styles.panel}>
            {entry('Passaggio Biblico', (
              <>
                <h2>{data.bibbia.fonte}</h2>
                <p className={styles.bibleText}>{data.bibbia.testo}</p>
                {data.bibbia.nota && <p>{data.bibbia.nota}</p>}
              </>
            ))}
          </section>

          <section className={styles.panel}>
            {entry('Consiglio Musicale', (
              <>
                <h2>{data.musica.brano}</h2>
                <p className={styles.source}>{data.musica.autore} · {data.musica.genere}</p>
                <p>{data.musica.motivo}</p>
              </>
            ))}
            {opera && entry('Opera del Giorno', (
              <>
                {(opera.immagine_url_hd || opera.immagine_url) && (
                  <figure className={styles.artwork}>
                    <img src={opera.immagine_url_hd || opera.immagine_url} alt={`Opera del Giorno: ${opera.titolo}`} />
                  </figure>
                )}
                <h2>{opera.titolo}</h2>
                <p className={styles.source}>{opera.artista}{opera.anno ? ` · ${opera.anno}` : ''}</p>
                <p>{[opera.medium, opera.dipartimento, opera.museo].filter(Boolean).join(' · ')}</p>
              </>
            ))}
            <footer className={styles.signature}>
              <strong className={`${jocky.className} notebook-wordmark`}>Il Taccuino del Giorno</strong>
              <span>Realizzato con amore da Antonello.</span>
            </footer>
          </section>
        </article>
      </div>
    </main>
  );
}
