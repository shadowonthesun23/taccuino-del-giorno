'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Download, Loader2, PenLine, Sparkles, X } from 'lucide-react';
import type { LanguageCode, SeasonId } from '@/lib/types';
import { t } from '@/lib/translation';
import { formatBookmarkDate, formatExLibrisDate, getDayOfYearInfo, getSeason } from '@/lib/date-utils';
import { getImageLoadingProps } from '@/lib/browser-utils';
import { getLocalizedSeasonalArtwork, getSeasonalArtwork, type SeasonalArtwork } from '@/lib/seasonal-artwork';
import { getEditorialMediaCropImageStyle, DEFAULT_EDITORIAL_MEDIA_CROP, type EditorialMediaCrop } from '@/lib/editorial-media';
import { caveat, janeAust } from '@/lib/fonts';
import { SITE_WATERMARK } from '@/lib/constants';
import { downloadDailyPostcardFace, type DailyPostcardFace } from './dailyPostcardExport';

const eagerImageProps = getImageLoadingProps(true);
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const POSTCARD_ADDRESS_LINE_COUNT = 5;
const POSTCARD_ADDRESS_MAX_LENGTH = 240;

function fitPostcardAddressText(value: string, textarea: HTMLTextAreaElement) {
  const maximumHeight = Math.ceil(textarea.clientHeight);
  if (!maximumHeight) return value;

  textarea.value = value;
  if (textarea.scrollHeight <= maximumHeight + 1) return value;

  let fittedValue = value;
  while (fittedValue.length > 0) {
    fittedValue = fittedValue.slice(0, -1);
    textarea.value = fittedValue;
    if (textarea.scrollHeight <= maximumHeight + 1) break;
  }

  textarea.value = fittedValue;
  return fittedValue;
}

const SEASON_LABELS: Record<SeasonId, Record<LanguageCode, string>> = {
  spring: { IT: 'Primavera', EN: 'Spring', FR: 'Printemps', DE: 'Frühling', ES: 'Primavera', PT: 'Primavera' },
  summer: { IT: 'Estate', EN: 'Summer', FR: 'Été', DE: 'Sommer', ES: 'Verano', PT: 'Verão' },
  autumn: { IT: 'Autunno', EN: 'Autumn', FR: 'Automne', DE: 'Herbst', ES: 'Otoño', PT: 'Outono' },
  winter: { IT: 'Inverno', EN: 'Winter', FR: 'Hiver', DE: 'Winter', ES: 'Invierno', PT: 'Inverno' },
};

const POSTCARD_COPY: Record<LanguageCode, {
  open: string;
  close: string;
  flipForward: string;
  flipBack: string;
  address: string;
  quoteOfDay: string;
  dayToKeep: string;
  postcardFrom: string;
  dayWord: string;
  dailyPostcard: string;
  downloadFront: string;
  downloadBack: string;
  preparingFront: string;
  preparingBack: string;
  editAddress: string;
  finishEditing: string;
  editingHint: string;
  addressMessage: string;
}> = {
  IT: {
    open: 'Apri la cartolina del giorno',
    close: 'Chiudi la cartolina',
    flipForward: 'Clicca sulla cartolina per girarla',
    flipBack: 'Clicca per tornare al fronte',
    address: 'A:',
    quoteOfDay: 'Citazione del giorno',
    dayToKeep: 'Il giorno da custodire',
    postcardFrom: 'Una cartolina dal',
    dayWord: 'giorno',
    dailyPostcard: 'Cartolina del giorno',
    downloadFront: 'Scarica fronte · JPEG',
    downloadBack: 'Scarica retro · JPEG',
    preparingFront: 'Preparo il fronte…',
    preparingBack: 'Preparo il retro…',
    editAddress: 'Compila la cartolina',
    finishEditing: 'Termina compilazione',
    editingHint: 'Scrivi sulle cinque righe',
    addressMessage: 'Messaggio della cartolina',
  },
  EN: {
    open: 'Open the postcard of the day',
    close: 'Close postcard',
    flipForward: 'Click the postcard to turn it over',
    flipBack: 'Click to return to the front',
    address: 'To:',
    quoteOfDay: 'Quote of the day',
    dayToKeep: 'A day to keep',
    postcardFrom: 'A postcard from',
    dayWord: 'day',
    dailyPostcard: 'Postcard of the day',
    downloadFront: 'Download front · JPEG',
    downloadBack: 'Download back · JPEG',
    preparingFront: 'Preparing front…',
    preparingBack: 'Preparing back…',
    editAddress: 'Write on the postcard',
    finishEditing: 'Finish writing',
    editingHint: 'Write on the five lines',
    addressMessage: 'Postcard message',
  },
  FR: {
    open: 'Ouvrir la carte du jour',
    close: 'Fermer la carte',
    flipForward: 'Cliquer sur la carte pour la retourner',
    flipBack: 'Cliquer pour revenir au recto',
    address: 'À:',
    quoteOfDay: 'Citation du jour',
    dayToKeep: 'Un jour à garder',
    postcardFrom: 'Une carte du',
    dayWord: 'jour',
    dailyPostcard: 'Carte du jour',
    downloadFront: 'Télécharger le recto · JPEG',
    downloadBack: 'Télécharger le verso · JPEG',
    preparingFront: 'Préparation du recto…',
    preparingBack: 'Préparation du verso…',
    editAddress: 'Remplir la carte',
    finishEditing: 'Terminer la saisie',
    editingHint: 'Écrivez sur les cinq lignes',
    addressMessage: 'Message de la carte',
  },
  DE: {
    open: 'Tagespostkarte öffnen',
    close: 'Postkarte schließen',
    flipForward: 'Klicken, um die Karte umzudrehen',
    flipBack: 'Klicken, um zur Vorderseite zurückzukehren',
    address: 'An:',
    quoteOfDay: 'Zitat des Tages',
    dayToKeep: 'Ein Tag zum Bewahren',
    postcardFrom: 'Eine Postkarte vom',
    dayWord: 'Tag',
    dailyPostcard: 'Postkarte des Tages',
    downloadFront: 'Vorderseite laden · JPEG',
    downloadBack: 'Rückseite laden · JPEG',
    preparingFront: 'Vorderseite wird vorbereitet…',
    preparingBack: 'Rückseite wird vorbereitet…',
    editAddress: 'Postkarte ausfüllen',
    finishEditing: 'Eingabe beenden',
    editingHint: 'Auf die fünf Linien schreiben',
    addressMessage: 'Nachricht auf der Postkarte',
  },
  ES: {
    open: 'Abrir la postal del día',
    close: 'Cerrar postal',
    flipForward: 'Haz clic en la postal para darle la vuelta',
    flipBack: 'Haz clic para volver al frente',
    address: 'A:',
    quoteOfDay: 'Cita del día',
    dayToKeep: 'Un día para guardar',
    postcardFrom: 'Una postal del',
    dayWord: 'día',
    dailyPostcard: 'Postal del día',
    downloadFront: 'Descargar anverso · JPEG',
    downloadBack: 'Descargar reverso · JPEG',
    preparingFront: 'Preparando anverso…',
    preparingBack: 'Preparando reverso…',
    editAddress: 'Rellena la postal',
    finishEditing: 'Terminar edición',
    editingHint: 'Escribe en las cinco líneas',
    addressMessage: 'Mensaje de la postal',
  },
  PT: {
    open: 'Abrir o postal do dia',
    close: 'Fechar postal',
    flipForward: 'Clique no postal para o virar',
    flipBack: 'Clique para voltar à frente',
    address: 'Para:',
    quoteOfDay: 'Citação do dia',
    dayToKeep: 'Um dia para guardar',
    postcardFrom: 'Um postal do',
    dayWord: 'dia',
    dailyPostcard: 'Postal do dia',
    downloadFront: 'Descarregar frente · JPEG',
    downloadBack: 'Descarregar verso · JPEG',
    preparingFront: 'A preparar a frente…',
    preparingBack: 'A preparar o verso…',
    editAddress: 'Preencher o postal',
    finishEditing: 'Terminar preenchimento',
    editingHint: 'Escreva nas cinco linhas',
    addressMessage: 'Mensagem do postal',
  },
};

const AUTHOR_DATE_LOCALES: Record<LanguageCode, string> = {
  IT: 'it-IT',
  EN: 'en-GB',
  FR: 'fr-FR',
  DE: 'de-DE',
  ES: 'es-ES',
  PT: 'pt-PT',
};

function formatAuthorDate(value: string | null | undefined, lingua: LanguageCode): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(AUTHOR_DATE_LOCALES[lingua], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date).replaceAll('.', '');
}

function PostcardFront({
  artwork,
  dateLabel,
  seasonLabel,
  day,
  total,
  dayToKeep,
  ariaHidden,
}: {
  artwork?: SeasonalArtwork;
  dateLabel: string;
  seasonLabel: string;
  day: number;
  total: number;
  dayToKeep: string;
  ariaHidden?: boolean;
}) {
  return (
    <div className="daily-postcard-face daily-postcard-front" aria-hidden={ariaHidden}>
      <span className="daily-postcard-front-border" aria-hidden="true" />
      {artwork?.imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element -- local editorial artwork must remain available to the card DOM */
        <img
          className="daily-postcard-image"
          src={artwork.imageUrl}
          alt=""
          draggable={false}
          loading="eager"
          decoding="async"
          fetchPriority={eagerImageProps.fetchPriority}
          style={{ objectPosition: artwork.revealPosition }}
        />
      ) : null}
      <span className="daily-postcard-front-vignette" aria-hidden="true" />
      <span className="daily-postcard-front-top">
        <strong>{dateLabel}</strong>
        <span>{seasonLabel} · {day}/{total}</span>
      </span>
      <span className="daily-postcard-front-bottom">
        <span className="daily-postcard-front-artwork-copy">
          <strong>{artwork?.title || dayToKeep}</strong>
          <em>{artwork ? `${artwork.artist} · ${artwork.year}` : dayToKeep}</em>
        </span>
        <span className="daily-postcard-front-brand">
          <strong className={`${janeAust.className} notebook-wordmark`}>{dayToKeep}</strong>
          <span className="daily-postcard-front-site-url">{SITE_WATERMARK}</span>
        </span>
      </span>
    </div>
  );
}

function PostcardBack({
  dataIso,
  lingua,
  sourceUrl,
  dateLabel,
  day,
  total,
  quote,
  authorName,
  authorBirthDate,
  authorDeathDate,
  authorImageUrl,
  authorImageCrop,
  addressText,
  isEditing,
  onAddressTextChange,
  setAddressInputRef,
  ariaHidden,
}: {
  dataIso: string;
  lingua: LanguageCode;
  sourceUrl: string;
  dateLabel: string;
  day: number;
  total: number;
  quote: { testo: string; autore: string; fonte: string };
  authorName: string;
  authorBirthDate?: string | null;
  authorDeathDate?: string | null;
  authorImageUrl?: string | null;
  authorImageCrop?: EditorialMediaCrop;
  addressText: string;
  isEditing: boolean;
  onAddressTextChange: (value: string, textarea: HTMLTextAreaElement) => void;
  setAddressInputRef: (element: HTMLTextAreaElement | null) => void;
  ariaHidden?: boolean;
}) {
  const copy = POSTCARD_COPY[lingua];
  const romanDate = formatExLibrisDate(dataIso).replaceAll(' · ', ' ');
  const authorDisplayName = quote.autore || authorName;
  const formattedBirthDate = formatAuthorDate(authorBirthDate, lingua);
  const formattedDeathDate = formatAuthorDate(authorDeathDate, lingua);
  const authorDates = formattedBirthDate && formattedDeathDate
    ? `${formattedBirthDate} — ${formattedDeathDate}`
    : null;

  return (
    <div className="daily-postcard-face daily-postcard-back" aria-hidden={ariaHidden}>
      <span className="daily-postcard-back-grain" aria-hidden="true" />
      <header className="daily-postcard-back-header">
        <strong>{romanDate}</strong>
        <span className={`${janeAust.className} notebook-wordmark`}>{copy.dayToKeep} · {day}/{total}</span>
      </header>

      <div className="daily-postcard-back-body">
        <section className="daily-postcard-quote" aria-label={copy.quoteOfDay}>
          <div className="daily-postcard-section-heading">
            <span>{copy.quoteOfDay}</span>
          </div>
          <div className="daily-postcard-quote-body">
            <div className="daily-postcard-quote-author-frame">
              {authorImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element -- the postcard needs the same editorial author image as the home */
                <img
                  className="daily-postcard-quote-author-image"
                  src={authorImageUrl}
                  alt={authorDisplayName}
                  draggable={false}
                  loading="eager"
                  decoding="async"
                  fetchPriority={eagerImageProps.fetchPriority}
                  style={getEditorialMediaCropImageStyle(authorImageCrop ?? DEFAULT_EDITORIAL_MEDIA_CROP)}
                />
              ) : <span className="daily-postcard-quote-author-fallback">{authorDisplayName.slice(0, 1)}</span>}
            </div>
            <figure className="daily-postcard-quote-copy">
              <blockquote>“{quote.testo}”</blockquote>
              {quote.fonte ? <span className="daily-postcard-quote-source">· {quote.fonte}</span> : null}
              <figcaption>
                <strong>{authorDisplayName}</strong>
                {authorDates ? <small>{authorDates}</small> : null}
              </figcaption>
            </figure>
          </div>
        </section>

        <span className="daily-postcard-back-divider" aria-hidden="true"><Sparkles strokeWidth={1.25} /></span>

        <section className="daily-postcard-postal" aria-label={copy.dailyPostcard}>
          <div className="daily-postcard-postal-top">
            <a className="daily-postcard-qr-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">
              <span className="daily-postcard-qr">
                <QRCodeSVG value={sourceUrl} size={76} level="H" marginSize={2} bgColor="#f2eadb" fgColor="#2a241d" title={`${t('openDay', lingua)}: ${dateLabel}`} />
              </span>
              <small>{t('openDay', lingua)}</small>
            </a>
            <div className="daily-postcard-stamp" aria-label={`${copy.dayToKeep} ${day}/${total}`}>
              <span className={`${janeAust.className} notebook-wordmark`}>{copy.dayToKeep}</span>
              <strong>{day}/{total}</strong>
            </div>
          </div>
          <div className="daily-postcard-postmark" aria-hidden="true">
            {/* Generated as a transparent raster to keep the cancellation mark irregular and tactile. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- generated stamp asset is intentionally layered over the paper */}
            <img className="daily-postcard-postmark-art" src="/images/day-keep-postmark.png" alt="" draggable={false} />
            <strong className={`${janeAust.className} notebook-wordmark`}>{copy.dayToKeep}</strong>
          </div>
          <div className={`daily-postcard-address ${isEditing ? 'is-editing' : ''}`}>
            <span>{copy.address}</span>
            <div className="daily-postcard-address-writing">
              <span className="daily-postcard-address-lines" aria-hidden="true">
                {Array.from({ length: POSTCARD_ADDRESS_LINE_COUNT }, (_, index) => <i key={`postcard-address-rule-${index}`} />)}
              </span>
              {isEditing ? (
                <textarea
                  ref={setAddressInputRef}
                  className={`${caveat.className} daily-postcard-address-input`}
                  value={addressText}
                  maxLength={POSTCARD_ADDRESS_MAX_LENGTH}
                  rows={POSTCARD_ADDRESS_LINE_COUNT}
                  wrap="soft"
                  lang={lingua.toLowerCase()}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label={copy.addressMessage}
                  onChange={(event) => onAddressTextChange(event.target.value, event.currentTarget)}
                />
              ) : addressText ? (
                <span className={`${caveat.className} daily-postcard-address-written`}>{addressText}</span>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <footer className="daily-postcard-back-footer">
        <span className="daily-postcard-back-footer-exploration">
          <span>{lingua === 'IT' ? 'Ogni giorno è un luogo da esplorare.' : lingua === 'EN' ? 'Every day is a place to explore.' : copy.dayToKeep}</span>
          <a className="daily-postcard-site-url" href={`https://${SITE_WATERMARK}`} target="_blank" rel="noopener noreferrer">{SITE_WATERMARK}</a>
        </span>
        <strong className={`${janeAust.className} notebook-wordmark`}>{copy.dayToKeep}</strong>
        <span>{copy.postcardFrom} {day}° {copy.dayWord}.<em>{dateLabel}</em></span>
      </footer>
    </div>
  );
}

export default function DailyPostcard({
  dataIso,
  lingua,
  authorName,
  authorImageUrl,
  authorImageCrop,
  quote,
  authorBirthDate,
  authorDeathDate,
  isActive,
}: {
  dataIso: string;
  lingua: LanguageCode;
  authorName: string;
  authorImageUrl?: string | null;
  authorImageCrop?: EditorialMediaCrop;
  quote: { testo: string; autore: string; fonte: string };
  authorBirthDate?: string | null;
  authorDeathDate?: string | null;
  isActive: boolean;
}) {
  const [desktopEnabled, setDesktopEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [dayPermalink, setDayPermalink] = useState('');
  const [exportingPostcard, setExportingPostcard] = useState<DailyPostcardFace | null>(null);
  const [addressText, setAddressText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const postcardCardRef = useRef<HTMLDivElement>(null);
  const postcardMotionRef = useRef<HTMLDivElement>(null);
  const postcardMotionFrameRef = useRef<number | null>(null);
  const postcardMotionTargetRef = useRef({ x: 0, y: 0 });
  const postcardMotionCurrentRef = useRef({ x: 0, y: 0 });
  const addressInputRef = useRef<HTMLTextAreaElement | null>(null);
  const editingRequiresFlipRef = useRef(false);

  const season = getSeason(dataIso);
  const seasonLabel = SEASON_LABELS[season][lingua];
  const seasonalArtwork = getLocalizedSeasonalArtwork(getSeasonalArtwork(season, dataIso), lingua);
  const dateLabel = formatBookmarkDate(dataIso, lingua);
  const { day, total } = getDayOfYearInfo(dataIso);
  const sourceUrl = dayPermalink || seasonalArtwork?.sourceUrl || '/';
  const copy = POSTCARD_COPY[lingua];

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1180px)');
    const updateDesktopState = () => {
      const enabled = desktopQuery.matches;
      setDesktopEnabled(enabled);
      if (!enabled || !isActive) {
        setIsOpen(false);
        setIsFlipped(false);
        setIsEditing(false);
      }
    };

    updateDesktopState();
    desktopQuery.addEventListener('change', updateDesktopState);
    return () => desktopQuery.removeEventListener('change', updateDesktopState);
  }, [isActive]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      url.searchParams.set('data', dataIso);
      setDayPermalink(url.toString());
    });
    return () => window.cancelAnimationFrame(frame);
  }, [dataIso]);

  const closePostcard = useCallback(() => {
    setIsOpen(false);
    setIsFlipped(false);
    setIsEditing(false);
  }, []);

  useEffect(() => {
    if (!isOpen || !isActive) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePostcard();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePostcard, isActive, isOpen]);

  const handleCardClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isActive || isEditing) return;
    const target = event.target;
    if (target instanceof Element && target.closest('a, button, input, textarea, select, [contenteditable="true"]')) return;
    setIsFlipped((current) => !current);
  }, [isActive, isEditing]);

  const handleCardKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isActive || isEditing) return;
    const target = event.target;
    if (target instanceof Element && target.closest('a, button, input, textarea, select, [contenteditable="true"]')) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setIsFlipped((current) => !current);
  }, [isActive, isEditing]);

  const handleAddressTextChange = useCallback((value: string, textarea: HTMLTextAreaElement) => {
    setAddressText(fitPostcardAddressText(value, textarea));
  }, []);

  const setAddressInputRef = useCallback((element: HTMLTextAreaElement | null) => {
    addressInputRef.current = element;
  }, []);

  const startPostcardEditing = useCallback(() => {
    editingRequiresFlipRef.current = !isFlipped;
    setIsFlipped(true);
    setIsEditing(true);
  }, [isFlipped]);

  useEffect(() => {
    if (!isEditing) return;

    const focusDelay = editingRequiresFlipRef.current ? 720 : 120;
    editingRequiresFlipRef.current = false;
    const focusTimer = window.setTimeout(() => addressInputRef.current?.focus(), focusDelay);
    return () => window.clearTimeout(focusTimer);
  }, [isEditing]);

  const postcardOpen = desktopEnabled && isActive && isOpen;

  const downloadPostcard = useCallback(async (face: DailyPostcardFace) => {
    if (!postcardOpen || !postcardCardRef.current || exportingPostcard) return;

    setExportingPostcard(face);
    try {
      await downloadDailyPostcardFace(postcardCardRef.current, dataIso, face);
    } catch (error) {
      console.error('Errore durante il download della cartolina:', error);
    } finally {
      setExportingPostcard(null);
    }
  }, [dataIso, exportingPostcard, postcardOpen]);

  const applyPostcardMotion = useCallback((x: number, y: number) => {
    const motionLayer = postcardMotionRef.current;
    if (!motionLayer) return;

    motionLayer.style.setProperty('--postcard-tilt-x', `${(-y * 2.4).toFixed(3)}deg`);
    motionLayer.style.setProperty('--postcard-tilt-y', `${(x * 3.1).toFixed(3)}deg`);
    motionLayer.style.setProperty('--postcard-tilt-z', `${(x * 0.22 - y * 0.08).toFixed(3)}deg`);
    motionLayer.style.setProperty('--postcard-shift-x', `${(x * 1.8).toFixed(2)}px`);
    motionLayer.style.setProperty('--postcard-shift-y', `${(y * 1.25).toFixed(2)}px`);
    motionLayer.style.setProperty('--postcard-glow-x', `${((x + 1) * 50).toFixed(2)}%`);
    motionLayer.style.setProperty('--postcard-glow-y', `${((y + 1) * 50).toFixed(2)}%`);
  }, []);

  useEffect(() => {
    if (!isEditing) return;

    postcardMotionTargetRef.current = { x: 0, y: 0 };
    postcardMotionCurrentRef.current = { x: 0, y: 0 };
    if (postcardMotionFrameRef.current !== null) {
      window.cancelAnimationFrame(postcardMotionFrameRef.current);
      postcardMotionFrameRef.current = null;
    }
    applyPostcardMotion(0, 0);
  }, [applyPostcardMotion, isEditing]);

  const schedulePostcardMotion = useCallback(() => {
    if (postcardMotionFrameRef.current !== null) return;

    function tick() {
      const target = postcardMotionTargetRef.current;
      const current = postcardMotionCurrentRef.current;
      current.x += (target.x - current.x) * 0.16;
      current.y += (target.y - current.y) * 0.16;
      applyPostcardMotion(current.x, current.y);

      const settled = Math.abs(target.x - current.x) < 0.001 && Math.abs(target.y - current.y) < 0.001;
      if (settled) {
        current.x = target.x;
        current.y = target.y;
        applyPostcardMotion(current.x, current.y);
        postcardMotionFrameRef.current = null;
        return;
      }

      postcardMotionFrameRef.current = window.requestAnimationFrame(tick);
    }

    postcardMotionFrameRef.current = window.requestAnimationFrame(tick);
  }, [applyPostcardMotion]);

  const resetPostcardMotion = useCallback(() => {
    postcardMotionTargetRef.current = { x: 0, y: 0 };
    schedulePostcardMotion();
  }, [schedulePostcardMotion]);

  const handlePostcardPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!postcardOpen || isEditing || (event.pointerType && event.pointerType !== 'mouse')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    postcardMotionTargetRef.current = {
      x: clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
      y: clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
    };
    schedulePostcardMotion();
  }, [isEditing, postcardOpen, schedulePostcardMotion]);

  const handlePostcardPointerLeave = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    resetPostcardMotion();
  }, [resetPostcardMotion]);

  useEffect(() => () => {
    if (postcardMotionFrameRef.current !== null) window.cancelAnimationFrame(postcardMotionFrameRef.current);
  }, []);

  return (
    <aside
      className={`daily-postcard ${!isActive ? 'is-inactive' : ''} ${postcardOpen ? 'is-open' : ''}`}
      aria-hidden={!desktopEnabled || !isActive}
      inert={!desktopEnabled || !isActive ? true : undefined}
      aria-label={copy.dailyPostcard}
    >
      {!postcardOpen ? (
        <button type="button" className="daily-postcard-peek" onClick={() => setIsOpen(true)} aria-label={copy.open}>
          <PostcardFront
            artwork={seasonalArtwork}
            dateLabel={dateLabel}
            seasonLabel={seasonLabel}
            day={day}
            total={total}
            dayToKeep={copy.dayToKeep}
            ariaHidden
          />
        </button>
      ) : null}

      {postcardOpen ? (
        <>
          <button type="button" className="daily-postcard-modal-backdrop" aria-label={copy.close} onClick={closePostcard} />
          <section className="daily-postcard-dialog" role="dialog" aria-modal="true" aria-labelledby="daily-postcard-title">
            <h2 id="daily-postcard-title" className="sr-only">{copy.dailyPostcard}: {dateLabel}</h2>
            <button type="button" className="daily-postcard-close notebook-action notebook-action-icon" onClick={closePostcard} aria-label={copy.close}>
              <X aria-hidden="true" strokeWidth={1.5} />
            </button>
            <div className={`daily-postcard-stage ${isEditing ? 'is-editing' : ''}`} onPointerMove={handlePostcardPointerMove} onPointerLeave={handlePostcardPointerLeave}>
              <div ref={postcardMotionRef} className="daily-postcard-card-motion">
                <div
                  ref={postcardCardRef}
                  className={`daily-postcard-card ${isFlipped ? 'is-flipped' : ''}`}
                  role={isEditing ? undefined : 'button'}
                  tabIndex={isEditing ? undefined : 0}
                  aria-pressed={isEditing ? undefined : isFlipped}
                  aria-label={isEditing ? undefined : (isFlipped ? copy.flipBack : copy.flipForward)}
                  onClick={isEditing ? undefined : handleCardClick}
                  onKeyDown={isEditing ? undefined : handleCardKeyDown}
                >
                  <PostcardFront
                    artwork={seasonalArtwork}
                    dateLabel={dateLabel}
                    seasonLabel={seasonLabel}
                    day={day}
                    total={total}
                    dayToKeep={copy.dayToKeep}
                    ariaHidden={isFlipped}
                  />
                  <PostcardBack
                    dataIso={dataIso}
                    lingua={lingua}
                    sourceUrl={sourceUrl}
                    dateLabel={dateLabel}
                    day={day}
                    total={total}
                    quote={quote}
                    authorName={authorName}
                    authorBirthDate={authorBirthDate}
                    authorDeathDate={authorDeathDate}
                    authorImageUrl={authorImageUrl}
                    authorImageCrop={authorImageCrop}
                    addressText={addressText}
                    isEditing={isEditing}
                    onAddressTextChange={handleAddressTextChange}
                    setAddressInputRef={setAddressInputRef}
                    ariaHidden={!isFlipped}
                  />
                </div>
              </div>
            </div>
            <p className="daily-postcard-turn-hint"><Sparkles aria-hidden="true" strokeWidth={1.5} />{isEditing ? copy.editingHint : (isFlipped ? copy.flipBack : copy.flipForward)}</p>
            <button
              type="button"
              className={`daily-postcard-edit notebook-action notebook-action-compact notebook-action-secondary ${isEditing ? 'is-active' : ''}`}
              disabled={Boolean(exportingPostcard)}
              aria-label={isEditing ? copy.finishEditing : copy.editAddress}
              aria-pressed={isEditing}
              onClick={isEditing ? () => setIsEditing(false) : startPostcardEditing}
            >
              {isEditing ? <Check aria-hidden="true" strokeWidth={1.7} /> : <PenLine aria-hidden="true" strokeWidth={1.7} />}
              <span>{isEditing ? copy.finishEditing : copy.editAddress}</span>
            </button>
            <button
              type="button"
              className="daily-postcard-download notebook-action notebook-action-compact notebook-action-secondary"
              disabled={Boolean(exportingPostcard)}
              aria-label={isFlipped ? copy.downloadBack : copy.downloadFront}
              title={isFlipped ? copy.downloadBack : copy.downloadFront}
              onClick={() => void downloadPostcard(isFlipped ? 'back' : 'front')}
            >
              {exportingPostcard ? <Loader2 aria-hidden="true" strokeWidth={1.7} /> : <Download aria-hidden="true" strokeWidth={1.7} />}
              <span>{exportingPostcard
                ? (exportingPostcard === 'back' ? copy.preparingBack : copy.preparingFront)
                : (isFlipped ? copy.downloadBack : copy.downloadFront)}</span>
            </button>
          </section>
        </>
      ) : null}
    </aside>
  );
}
