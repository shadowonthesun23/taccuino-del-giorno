import type { ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import { EB_Garamond } from 'next/font/google';
import localFont from 'next/font/local';
import ExportJpegButton from './ExportJpegButton';
import styles from './passaporto.module.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const garamond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
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
  keyword_arte_en?: string | null;
  opera_giorno?: OperaGiorno | null;
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

function zinePage(pageNumber: number, label: string, children: ReactNode, className = '') {
  const ariaLabel = label ? `Facciata ${pageNumber}: ${label}` : `Facciata ${pageNumber}`;

  return (
    <section className={`${styles.zinePage} ${className}`} aria-label={ariaLabel}>
      <div className={styles.zinePageInner}>
        <span className={styles.pageNumber}>{pageNumber}</span>
        {label && <span className={styles.sectionLabel}>{label}</span>}
        {children}
      </div>
    </section>
  );
}

function textDensityClass(text: string) {
  const length = text.trim().length;

  if (length > 900) return styles.longText;
  if (length > 620) return styles.mediumText;
  return styles.shortText;
}

function sentenceCase(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function endWithPeriod(text: string) {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function summarizeEventForZine(event: string) {
  const normalized = event.replace(/\s+/g, ' ').trim();
  const [possibleYear, ...rest] = normalized.split(':');
  const hasYear = /^\d{3,4}$/.test(possibleYear.trim());
  const year = hasYear ? possibleYear.trim() : '';
  const body = (hasYear ? rest.join(':') : normalized)
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+-\s+/g, ' ')
    .trim();
  const lowerBody = body.toLowerCase();

  const knownSummary =
    lowerBody.includes('montgolfier')
      ? 'I fratelli Montgolfier dimostrano pubblicamente un pallone ad aria.'
      : lowerBody.includes('capanna dello zio tom')
        ? "Inizia la pubblicazione de 'La capanna dello zio Tom'."
        : lowerBody.includes('piano marshall') || lowerBody.includes('george marshall')
          ? 'George Marshall propone il piano per la ricostruzione europea.'
          : lowerBody.includes('aids')
            ? 'Il CDC descrive i primi casi clinici di AIDS.'
            : lowerBody.includes('tienanmen') || lowerBody.includes('rivoltoso sconosciuto')
              ? 'Il Rivoltoso sconosciuto sfida i carri armati a piazza Tienanmen.'
              : '';

  const firstSentence = knownSummary || body.split(/(?<=[.!?])\s+/)[0] || body;
  const withoutOpeningAside = firstSentence.replace(/^Durante\s+[^,]+,\s+/i, '').trim();
  const summary = endWithPeriod(sentenceCase(withoutOpeningAside));

  return year ? `${year}: ${summary}` : summary;
}

function summarizeEventsForZine(events: string[]) {
  const summaries = events.map(summarizeEventForZine);
  const totalLength = summaries.join(' ').length;
  const maxItems = totalLength > 640 ? 4 : 5;

  return summaries.slice(0, maxItems);
}

function proxiedImageUrl(url: string | null | undefined) {
  return url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : '';
}

async function getFotoAutore(nomeAutore: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(nomeAutore);
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`, {
      headers: { 'User-Agent': 'TaccuinoDelGiorno/1.0' },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.thumbnail?.source ?? json?.originalimage?.source ?? null;
  } catch {
    return null;
  }
}

async function findArtwork(keyword: string | null | undefined): Promise<OperaGiorno | null> {
  if (!keyword) return null;

  try {
    const searchRes = await fetch(
      `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(keyword)}&hasImages=true&isPublicDomain=true`,
      { next: { revalidate: 86400 } }
    );
    const searchData = await searchRes.json();
    const objectIDs = Array.isArray(searchData.objectIDs) ? searchData.objectIDs.slice(0, 25) : [];
    if (objectIDs.length === 0) return null;

    for (const objectID of objectIDs.slice(0, 6)) {
      const objRes = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectID}`, {
        next: { revalidate: 86400 },
      });
      if (!objRes.ok) continue;
      const obj = await objRes.json();
      if (obj.primaryImageSmall && obj.title) {
        return {
          titolo: obj.title,
          artista: obj.artistDisplayName || 'Artista sconosciuto',
          anno: obj.objectDate || '',
          immagine_url: obj.primaryImageSmall,
          immagine_url_hd: obj.primaryImage || obj.primaryImageSmall,
          museo: 'Metropolitan Museum of Art',
          medium: obj.medium || '',
          dipartimento: obj.department || '',
        };
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function getPassportData(dataIso: string): Promise<{ data: DatiTaccuino; opera: OperaGiorno | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('contenuti_giornalieri')
    .select('*')
    .eq('data', dataIso)
    .single();

  if (error || !data) {
    throw new Error('Nessun contenuto disponibile per questa data.');
  }

  const fotoUrl = await getFotoAutore(data.autore_giorno);
  const opera = data.opera_giorno ?? await findArtwork(data.keyword_arte_en);

  return {
    data: { ...data, foto_autore_url: fotoUrl },
    opera,
  };
}

export default async function PassportPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string | string[] }>;
}) {
  const params = await searchParams;
  const dataParam = Array.isArray(params.data) ? params.data[0] : params.data;
  const dataIso = dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam)
    ? dataParam
    : new Date().toISOString().split('T')[0];

  let payload: { data: DatiTaccuino; opera: OperaGiorno | null };
  try {
    payload = await getPassportData(dataIso);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore nel caricamento del passaporto.';
    return <main className={`${styles.error} ${garamond.className}`}>{message}</main>;
  }

  const { data, opera } = payload;
  const initials = getInitials(data.autore_giorno);
  const zineId = 'daily-zine-sheet';
  const zineEvents = summarizeEventsForZine(data.avvenimenti);
  const artworkImageUrl = proxiedImageUrl(opera?.immagine_url || opera?.immagine_url_hd);
  const artworkImageUrlHd = proxiedImageUrl(opera?.immagine_url_hd);

  return (
    <main className={`${styles.page} ${garamond.className}`}>
      <header className={styles.toolbar}>
        <div>
          <h1>Passaporto del Giorno</h1>
          <p>Zine A4 a 8 facciate, pensata per essere piegata e conservata.</p>
        </div>
        <ExportJpegButton targetId={zineId} filename={`passaporto-zine-${dataIso}.jpg`} />
      </header>

      <div className={styles.sheetWrap}>
        <article id={zineId} className={styles.zineSheet} aria-label={`Passaporto del Giorno in formato zine: ${data.data_odierna}`}>
          <div className={styles.foldGuides} aria-hidden="true">
            <span /><span /><span />
            <i />
          </div>

          {zinePage(5, 'Poesia del Giorno', (
            <>
              <h2>{data.poesia.autore}</h2>
              <p className={styles.source}>{data.poesia.fonte}</p>
              <p className={`${styles.poem} ${textDensityClass(data.poesia.testo)}`}>{data.poesia.testo}</p>
            </>
          ), styles.isInverted)}

          {zinePage(4, 'Accadde Oggi', (
            <ul className={styles.events}>
              {zineEvents.map((evento, index) => (
                <li key={index}>{evento}</li>
              ))}
            </ul>
          ), styles.isInverted)}

          {zinePage(3, '', (
            <>
              {entry('Parola del Giorno', (
                <>
                  <h2>{data.parola_giorno.parola}</h2>
                  <p className={styles.source}>{data.parola_giorno.etimologia}</p>
                  <p>{data.parola_giorno.definizione}</p>
                  {data.parola_giorno.esempio && data.parola_giorno.esempio !== 'null' && (
                    <blockquote>&ldquo;{data.parola_giorno.esempio}&rdquo;</blockquote>
                  )}
                </>
              ))}
              {entry('I Santi di Oggi', (
                <>
                  {data.santi.slice(0, 2).map((santo, index) => (
                    <div key={index} className={styles.miniEntry}>
                      <h3>{santo.nome}</h3>
                      <p><strong>{santo.ruolo}</strong>{santo.anni ? ` · ${santo.anni}` : ''}</p>
                      <p>{santo.biografia}</p>
                    </div>
                  ))}
                </>
              ))}
            </>
          ), `${styles.isInverted} ${styles.wordSaintsPage}`)}

          {zinePage(2, 'Autore del giorno', (
            <>
              <div className={`${styles.authorFeature} ${!data.foto_autore_url ? styles.authorFeatureNoPhoto : ''}`}>
                {data.foto_autore_url && (
                  <figure className={styles.authorPhoto}>
                    <img crossOrigin="anonymous" src={data.foto_autore_url} alt={`Ritratto dell'autore: ${data.autore_giorno}`} />
                  </figure>
                )}
                <div className={styles.authorBio}>
                  <h2>{data.autore_giorno}</h2>
                  <p>{data.breve_descrizione}</p>
                </div>
              </div>
              <div className={styles.quoteBlock}>
                <blockquote>&ldquo;{data.citazione.testo}&rdquo;</blockquote>
                <p className={styles.source}>{data.citazione.autore}{data.citazione.fonte ? `, ${data.citazione.fonte}` : ''}</p>
              </div>
            </>
          ), `${styles.isInverted} ${styles.authorPage}`)}

          {zinePage(6, 'Passaggio biblico del giorno', (
            <>
              <h2>{data.bibbia.fonte}</h2>
              <p className={`${styles.bibleText} ${textDensityClass(data.bibbia.testo)}`}>{data.bibbia.testo}</p>
            </>
          ), styles.biblePage)}

          {zinePage(7, 'Consiglio Musicale', (
            <>
              <h2>{data.musica.brano}</h2>
              <p className={styles.source}>{data.musica.autore} · {data.musica.genere}</p>
              <p>{data.musica.motivo}</p>
            </>
          ))}

          {zinePage(8, 'Opera del giorno', (
            <>
              {opera && (
                <>
                  {artworkImageUrl && (
                    <figure className={styles.artwork}>
                      <img
                        decoding="sync"
                        fetchPriority="high"
                        loading="eager"
                        src={artworkImageUrl}
                        srcSet={artworkImageUrlHd ? `${artworkImageUrlHd} 2x` : undefined}
                        alt={`Opera del Giorno: ${opera.titolo}`}
                      />
                    </figure>
                  )}
                  <h2>{opera.titolo}</h2>
                  <p className={styles.source}>{opera.artista}{opera.anno ? ` · ${opera.anno}` : ''}</p>
                  <p>{[opera.medium, opera.dipartimento, opera.museo].filter(Boolean).join(' · ')}</p>
                </>
              )}
              <footer className={styles.signature}>
                <strong className={`${jocky.className} notebook-wordmark`}>Il Taccuino del Giorno</strong>
                <span>Realizzato con amore da Antonello.</span>
              </footer>
            </>
          ), styles.artworkPage)}

          {zinePage(1, '', (
            <div className={styles.cover}>
              <p className={styles.number}>N. {passportCode(dataIso, initials)}</p>
              <h2 className={styles.title}>Passaporto del Giorno</h2>
              <p className={styles.date}>{data.data_odierna}</p>
              <div className={styles.stamp}>
                <span>Visitato</span>
                <strong>{initials}</strong>
                <em>{formatExLibrisDate(dataIso)}</em>
              </div>
              <p className={styles.zineNote}>Un foglio A4, otto facciate di cultura quotidiana.</p>
            </div>
          ))}
        </article>
      </div>
    </main>
  );
}
