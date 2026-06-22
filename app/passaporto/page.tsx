import type { ReactNode } from 'react';
import { createClient } from '@supabase/supabase-js';
import { IM_Fell_Double_Pica } from 'next/font/google';
import localFont from 'next/font/local';
import ExportJpegButton from './ExportJpegButton';
import PrintableZineButton from './PrintableZineButton';
import styles from './passaporto.module.css';
import {
  findArtworkAcrossMuseums,
  localizeArtworkToItalian,
  type Artwork,
} from '@/lib/artwork';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const garamond = IM_Fell_Double_Pica({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const jocky = localFont({
  src: '../../public/fonts/JockyStarline.ttf',
  display: 'block',
  preload: true,
  fallback: ['serif'],
});

type OperaGiorno = Artwork;

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
  musica: { brano: string; autore: string; genere: string; motivo: string; chiave_ricerca?: string };
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
        {pageNumber !== 1 && <span className={styles.pageNumber}>{pageNumber}</span>}
        {label && <span className={styles.sectionLabel}>{label}</span>}
        {children}
      </div>
    </section>
  );
}

function printablePage(pageNumber: number, label: string, children: ReactNode, className = '') {
  return zinePage(pageNumber, label, children, className);
}

function digitalPage(pageNumber: number, label: string, children: ReactNode, className = '') {
  return zinePage(pageNumber, label, children, `${styles.digitalPage} ${className}`);
}

function textDensityClass(text: string) {
  const length = text.trim().length;

  if (length > 900) return styles.longText;
  if (length > 620) return styles.mediumText;
  return styles.shortText;
}

function estimatedZineLines(text: string) {
  return text
    .trim()
    .split(/\r?\n/)
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.trim().length / 38)), 0);
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

async function findAlbumCover(musica: DatiTaccuino['musica']): Promise<string | null> {
  const searchTerm = musica.chiave_ricerca?.trim() || `${musica.brano} ${musica.autore}`.trim();
  if (!searchTerm) return null;

  try {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=album&limit=5&country=IT`,
      { next: { revalidate: 86400 } }
    );
    if (!response.ok) return null;

    const payload = await response.json();
    const result = Array.isArray(payload.results)
      ? payload.results.find((item: { artworkUrl100?: string }) => item.artworkUrl100)
      : null;

    return result?.artworkUrl100?.replace('100x100bb', '600x600bb') ?? null;
  } catch {
    return null;
  }
}

async function getPassportData(dataIso: string): Promise<{
  data: DatiTaccuino;
  opera: OperaGiorno | null;
  albumCover: string | null;
}> {
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

  const [fotoUrl, rawArtwork, albumCover] = await Promise.all([
    getFotoAutore(data.autore_giorno),
    data.opera_giorno
      ? Promise.resolve(data.opera_giorno)
      : data.keyword_arte_en
        ? findArtworkAcrossMuseums({
            keyword: data.keyword_arte_en,
            dataIso,
          })
        : Promise.resolve(null),
    findAlbumCover(data.musica),
  ]);
  const opera = rawArtwork ? await localizeArtworkToItalian(rawArtwork) : null;

  return {
    data: { ...data, foto_autore_url: fotoUrl },
    opera,
    albumCover,
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

  let payload: {
    data: DatiTaccuino;
    opera: OperaGiorno | null;
    albumCover: string | null;
  };
  try {
    payload = await getPassportData(dataIso);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore nel caricamento del passaporto.';
    return <main className={`${styles.error} ${garamond.className}`}>{message}</main>;
  }

  const { data, opera, albumCover } = payload;
  const initials = getInitials(data.autore_giorno);
  const printableZineId = 'daily-zine-print-sheet';
  const digitalZineId = 'daily-zine-digital-sheet';
  const zineEvents = summarizeEventsForZine(data.avvenimenti);
  const artworkImageUrl = proxiedImageUrl(opera?.immagine_url || opera?.immagine_url_hd);
  const artworkImageUrlHd = proxiedImageUrl(opera?.immagine_url_hd);
  const albumCoverUrl = proxiedImageUrl(albumCover);
  const poemNeedsExcerpt = estimatedZineLines(data.poesia.testo) > 18;
  const bibleNeedsExcerpt = estimatedZineLines(data.bibbia.testo) > 18;
  const wordSaintsNeedsCondensing = estimatedZineLines([
    data.parola_giorno.etimologia,
    data.parola_giorno.definizione,
    data.parola_giorno.esempio,
    ...data.santi.slice(0, 2).flatMap((santo) => [santo.nome, santo.ruolo, santo.biografia]),
  ].filter(Boolean).join('\n')) > 24;
  const coverContent = (
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
  );
  const authorContent = (
    <>
      <div className={`${styles.authorFeature} ${!data.foto_autore_url ? styles.authorFeatureNoPhoto : ''}`}>
        {data.foto_autore_url && (
          <figure className={styles.authorPhoto}>
            {/* Plain img keeps the printable sheet deterministic for client-side rasterization. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img draggable={false} crossOrigin="anonymous" src={data.foto_autore_url} alt={`Ritratto dell'autore: ${data.autore_giorno}`} />
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
  );
  const wordSaintsContent = (
    <>
      {entry('Parola del Giorno', (
        <>
          <h2>{data.parola_giorno.parola}</h2>
          <p className={`${styles.source} ${styles.wordEtymology}`}>{data.parola_giorno.etimologia}</p>
          <p className={styles.wordDefinition}>{data.parola_giorno.definizione}</p>
          {data.parola_giorno.esempio && data.parola_giorno.esempio !== 'null' && (
            <blockquote className={styles.wordExample}>&ldquo;{data.parola_giorno.esempio}&rdquo;</blockquote>
          )}
        </>
      ))}
      {entry('I Santi di Oggi', (
        <>
          {data.santi.slice(0, 2).map((santo, index) => (
            <div key={index} className={styles.miniEntry}>
              <h3>{santo.nome}</h3>
              <p><strong>{santo.ruolo}</strong>{santo.anni ? ` · ${santo.anni}` : ''}</p>
              <p className={styles.saintBiography}>{santo.biografia}</p>
            </div>
          ))}
        </>
      ))}
    </>
  );
  const eventsContent = (
    <ul className={styles.events}>
      {zineEvents.map((evento, index) => (
        <li key={index}>{evento}</li>
      ))}
    </ul>
  );
  const poetryContent = (
    <>
      <h2>{data.poesia.autore}</h2>
      <p className={styles.source}>
        {[data.poesia.fonte, poemNeedsExcerpt ? 'Estratto' : ''].filter(Boolean).join(' · ')}
      </p>
      <p className={`${styles.poem} ${textDensityClass(data.poesia.testo)} ${poemNeedsExcerpt ? styles.zineExcerpt : ''}`}>
        {data.poesia.testo}
      </p>
    </>
  );
  const bibleContent = (
    <>
      <h2>
        {data.bibbia.fonte}
        {bibleNeedsExcerpt && <span className={styles.excerptMark}>Estratto</span>}
      </h2>
      <p className={`${styles.bibleText} ${textDensityClass(data.bibbia.testo)} ${bibleNeedsExcerpt ? styles.zineExcerpt : ''}`}>
        {data.bibbia.testo}
      </p>
    </>
  );
  const musicContent = (
    <>
      {albumCoverUrl && (
        <figure className={styles.albumCover}>
          {/* Plain img is decoded synchronously before the PDF capture. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            draggable={false}
            decoding="sync"
            loading="eager"
            src={albumCoverUrl}
            alt={`Copertina di ${data.musica.brano}`}
          />
        </figure>
      )}
      <h2>{data.musica.brano}</h2>
      <p className={styles.source}>{data.musica.autore} · {data.musica.genere}</p>
      <p>{data.musica.motivo}</p>
      <footer className={styles.signature}>
        <strong className={`${jocky.className} notebook-wordmark`}>Il giorno da custodire</strong>
        <span>Realizzato con amore da Antonello.</span>
      </footer>
    </>
  );
  const artworkContent = (
    <>
      {opera && (
        <>
          {artworkImageUrl && (
            <figure className={styles.artwork}>
              {/* Plain img preserves srcSet and eager decoding for the PDF capture. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                draggable={false}
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
          <p>{[
            opera.medium_it || opera.medium,
            opera.dipartimento_it || opera.dipartimento,
            opera.museo,
          ].filter(Boolean).join(' · ')}</p>
        </>
      )}
    </>
  );

  return (
    <main className={`${styles.page} ${garamond.className}`}>
      <header className={styles.toolbar}>
        <div>
          <h1>Passaporto del Giorno</h1>
          <p>Anteprima digitale, con zine A4 stampabile e pieghevole.</p>
        </div>
        <div className={styles.exportActions}>
          <ExportJpegButton targetId={digitalZineId} filename={`passaporto-zine-digitale-${dataIso}.jpg`}>
            Scarica versione digitale
          </ExportJpegButton>
          <PrintableZineButton targetId={printableZineId} filename={`passaporto-zine-stampabile-${dataIso}.pdf`} />
        </div>
      </header>

      <div className={styles.sheetWrap}>
        <article id={digitalZineId} className={`${styles.zineSheet} ${styles.digitalSheet}`} aria-label={`Passaporto del Giorno in versione digitale: ${data.data_odierna}`}>
          {digitalPage(1, '', coverContent)}
          {digitalPage(2, 'Autore del giorno', authorContent, styles.authorPage)}
          {digitalPage(3, '', wordSaintsContent, `${styles.wordSaintsPage} ${wordSaintsNeedsCondensing ? styles.wordSaintsDense : ''}`)}
          {digitalPage(4, 'Accadde Oggi', eventsContent)}
          {digitalPage(5, 'Poesia del Giorno', poetryContent)}
          {digitalPage(6, 'Passaggio biblico del giorno', bibleContent, styles.biblePage)}
          {digitalPage(7, 'Opera del giorno', artworkContent, styles.artworkPage)}
          {digitalPage(8, 'Consiglio Musicale', musicContent, styles.musicPage)}
        </article>
      </div>

      <div className={styles.exportOnly} aria-hidden="true">
        <article id={printableZineId} className={`${styles.zineSheet} ${styles.exportSheet}`} aria-label={`Passaporto del Giorno in formato zine stampabile: ${data.data_odierna}`}>
          <div className={styles.foldGuides} aria-hidden="true">
            <span /><span /><span />
            <i />
          </div>

          {printablePage(5, 'Poesia del Giorno', poetryContent, styles.isInverted)}
          {printablePage(4, 'Accadde Oggi', eventsContent, styles.isInverted)}
          {printablePage(3, '', wordSaintsContent, `${styles.isInverted} ${styles.wordSaintsPage} ${wordSaintsNeedsCondensing ? styles.wordSaintsDense : ''}`)}
          {printablePage(2, 'Autore del giorno', authorContent, `${styles.isInverted} ${styles.authorPage}`)}
          {printablePage(6, 'Passaggio biblico del giorno', bibleContent, styles.biblePage)}
          {printablePage(7, 'Opera del giorno', artworkContent, styles.artworkPage)}
          {printablePage(8, 'Consiglio Musicale', musicContent, styles.musicPage)}
          {printablePage(1, '', coverContent)}
        </article>
      </div>
    </main>
  );
}
