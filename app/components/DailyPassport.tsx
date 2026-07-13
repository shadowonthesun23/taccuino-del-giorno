'use client';

import { Stamp, X, FileDown, Printer } from 'lucide-react';
import type { DatiTaccuino, LanguageCode, OperaGiorno } from '@/lib/types';
import { t } from '@/lib/translation';
import { getDisplayDate, formatExLibrisDate } from '@/lib/date-utils';
import { getImageLoadingProps } from '@/lib/browser-utils';
import { garamond, masterSignature } from '@/lib/fonts';

export function getPassportCode(dataIso: string, initials: string): string {
  return `${dataIso.replace(/-/g, '')}-${initials || 'TDG'}`;
}

const lazyImageProps = getImageLoadingProps();

export default function DailyPassport({
  data,
  opera,
  lingua,
  isDark,
  dataIso,
  initials,
  onClose,
}: {
  data: DatiTaccuino;
  opera: OperaGiorno | null;
  lingua: LanguageCode;
  isDark: boolean;
  dataIso: string;
  initials: string;
  onClose: () => void;
}) {
  const label = {
    title: t('passportTitle', lingua),
    subtitle: t('passportSubtitle', lingua),
    download: t('downloadPdf', lingua),
    print: t('openPrint', lingua),
    close: t('close', lingua),
    author: t('authorOfTheDay', lingua),
    quote: t('quote', lingua),
    word: t('word', lingua),
    saints: t('saintsTitle', lingua),
    events: t('eventsTitle', lingua),
    poem: t('poemTitle', lingua),
    bible: t('bibleTitle', lingua),
    music: t('musicTitle', lingua),
    artwork: t('artworkTitle', lingua),
    stamp: t('visitedStamp', lingua),
    number: t('number', lingua),
    foldHint: t('foldHint', lingua),
    authorPhoto: t('authorPhoto', lingua),
    artworkImage: t('artworkImage', lingua),
  };
  const passportCode = getPassportCode(dataIso, initials);

  return (
    <div className={`daily-passport-overlay ${garamond.className} ${isDark ? 'is-dark' : ''}`} role="dialog" aria-modal="true" aria-labelledby="daily-passport-title">
      <div className="daily-passport-toolbar">
        <div>
          <span className="daily-passport-kicker">
            <Stamp className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
            {t('keepsake', lingua)}
          </span>
          <h2 id="daily-passport-title">{t('passportPreview', lingua)}</h2>
          <p>{label.subtitle}</p>
        </div>
        <div className="daily-passport-actions">
          <button type="button" className="daily-passport-print-button" onClick={() => window.print()}>
            <FileDown className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
            <span>{label.download}</span>
          </button>
          <button type="button" className="daily-passport-close-button" onClick={onClose} aria-label={label.close}>
            <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="daily-passport-preview">
        <article className="daily-passport-document" aria-label={`${label.title}: ${getDisplayDate(data, lingua, dataIso)}`}>
          <div className="daily-passport-paper-grain" aria-hidden="true" />
          <div className="daily-passport-folds" aria-hidden="true">
            <span /><span /><span /><span /><span />
          </div>

          <section className="daily-passport-cover-panel">
            <p className="daily-passport-small-label">{label.number} {passportCode}</p>
            <h3>{label.title}</h3>
            <p className="daily-passport-date">{getDisplayDate(data, lingua, dataIso)}</p>
            <div className="daily-passport-stamp">
              <span>{label.stamp}</span>
              <strong>{initials}</strong>
              <em>{formatExLibrisDate(dataIso)}</em>
            </div>
            <div className="daily-passport-cover-author">
              <span>{label.author}</span>
              <h4>{data.autore_giorno}</h4>
              <p>{data.breve_descrizione}</p>
            </div>
            {data.foto_autore_url && (
              <figure className="daily-passport-author-photo">
                <img draggable={false} src={data.foto_autore_url} alt={`${label.authorPhoto}: ${data.autore_giorno}`} {...lazyImageProps} />
              </figure>
            )}
            <p className="daily-passport-fold-hint">{label.foldHint}</p>
          </section>

          <section className="daily-passport-content-flow">
            <section>
              <span>{label.quote}</span>
              <blockquote>&ldquo;{data.citazione.testo}&rdquo;</blockquote>
              <p className="daily-passport-source">{data.citazione.autore}{data.citazione.fonte ? `, ${data.citazione.fonte}` : ''}</p>
            </section>

            <section>
              <span>{label.word}</span>
              <h4>{data.parola_giorno.parola}</h4>
              <p><strong>{data.parola_giorno.etimologia}</strong></p>
              <p>{data.parola_giorno.definizione}</p>
              {data.parola_giorno.esempio && data.parola_giorno.esempio.trim() !== '' && data.parola_giorno.esempio !== 'null' && (
                <blockquote>&ldquo;{data.parola_giorno.esempio}&rdquo;</blockquote>
              )}
              {data.parola_giorno.nota && <p>{data.parola_giorno.nota}</p>}
            </section>

            <section>
              <span>{label.saints}</span>
              {data.santi.map((santo, index) => (
                <div key={index} className="daily-passport-mini-entry">
                  <h5>{santo.nome}</h5>
                  <p><strong>{santo.ruolo}</strong>{santo.anni ? ` · ${santo.anni}` : ''}</p>
                  <p>{santo.biografia}</p>
                </div>
              ))}
            </section>

            <section>
              <span>{label.events}</span>
              <ul className="daily-passport-events">
                {data.avvenimenti.map((evento, index) => (
                  <li key={index}>{evento}</li>
                ))}
              </ul>
            </section>

            <section>
              <span>{label.poem}</span>
              <h4>{data.poesia.autore}</h4>
              <p className="daily-passport-source">{data.poesia.fonte}</p>
              <p className="daily-passport-poem">{data.poesia.testo}</p>
              {data.poesia.nota && <p>{data.poesia.nota}</p>}
            </section>

            <section>
              <span>{label.bible}</span>
              <h4>{data.bibbia.fonte}</h4>
              <p className="daily-passport-bible-text">{data.bibbia.testo}</p>
              {data.bibbia.nota && <p>{data.bibbia.nota}</p>}
            </section>
          </section>

          <aside className="daily-passport-art-panel">
            <section>
              <span>{label.music}</span>
              <h4>{data.musica.brano}</h4>
              <p className="daily-passport-source">{data.musica.autore} · {data.musica.genere}</p>
              <p>{data.musica.motivo}</p>
            </section>

            {opera && (
              <section>
                <span>{label.artwork}</span>
                {opera.immagine_url_hd || opera.immagine_url ? (
                  <figure className="daily-passport-artwork">
                    <img draggable={false} src={opera.immagine_url || opera.immagine_url_hd} alt={`${label.artworkImage}: ${opera.titolo}`} {...lazyImageProps} />
                  </figure>
                ) : null}
                <h4>{opera.titolo}</h4>
                <p className="daily-passport-source">{opera.artista}{opera.anno ? ` · ${opera.anno}` : ''}</p>
                <p>{[
                  lingua === 'IT' ? opera.medium_it || opera.medium : opera.medium,
                  lingua === 'IT' ? opera.dipartimento_it || opera.dipartimento : opera.dipartimento,
                  opera.museo,
                ].filter(Boolean).join(' · ')}</p>
              </section>
            )}

            <footer className="daily-passport-signature">
              <strong className={`${masterSignature.className} notebook-wordmark`}>{t('dayTitle', lingua)}</strong>
              <span>{t('madeWithLove', lingua)}</span>
            </footer>
          </aside>
        </article>
      </div>

      <div className="daily-passport-mobile-actions">
        <button type="button" className="daily-passport-print-button" onClick={() => window.print()}>
          <Printer className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
          <span>{label.print}</span>
        </button>
      </div>
    </div>
  );
}
