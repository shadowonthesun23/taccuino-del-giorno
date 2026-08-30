'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, Binoculars, BookOpen, Church, Download, Eye, Feather, Flower2, Images, Moon, Music, Palette, Sparkles, Telescope } from 'lucide-react';
import type { ApodData, DatiTaccuino, LanguageCode, OperaGiorno, ReadingMediaResult, SaintArtworkResult } from '@/lib/types';
import type { SeasonalArtwork } from '@/lib/seasonal-artwork';
import type { SkyRegion, VisiblePlanet } from '@/lib/visible-planets';
import { getMoonPhase } from '@/lib/astronomy';
import { formatExLibrisDate, getDayOfYearInfo, getInitials } from '@/lib/date-utils';
import { getImageLoadingProps, proxiedImageUrl } from '@/lib/browser-utils';
import { OPEN_EPHEMERIS_EVENT, SKY_REGION_STORAGE_KEY } from '@/lib/constants';
import { t } from '@/lib/translation';
import { garamond, janeAust } from '@/lib/fonts';
import { MoonPhaseGlyph } from '@/components/ui/Doodles';
import { TypewriterPhrase } from '@/components/ui/Typography';
import type { EditorialMediaCrops, EditorialMediaOverrides } from '@/lib/editorial-media';
import { DEFAULT_EDITORIAL_MEDIA_CROP, getEditorialMediaCropImageStyle } from '@/lib/editorial-media';

const eagerImageProps = getImageLoadingProps(true);
const CORRESPONDENCE_TYPEWRITER_DELAY = 520;
const CORRESPONDENCE_TYPEWRITER_SPEED = 1.8;
const CORRESPONDENCE_EXPORT_WIDTH = 1080;
const CORRESPONDENCE_EXPORT_HEIGHT = 1920;
const CORRESPONDENCE_EXPORT_SAFE_SIDE = 36;
const CORRESPONDENCE_EXPORT_SAFE_TOP = 79;
const CORRESPONDENCE_EXPORT_SAFE_BOTTOM = 0;
const CORRESPONDENCE_EXPORT_LAYOUT_WIDTH = CORRESPONDENCE_EXPORT_WIDTH - (CORRESPONDENCE_EXPORT_SAFE_SIDE * 2);
const CORRESPONDENCE_EXPORT_CONTENT_HEIGHT = CORRESPONDENCE_EXPORT_HEIGHT - CORRESPONDENCE_EXPORT_SAFE_TOP - CORRESPONDENCE_EXPORT_SAFE_BOTTOM;
const CORRESPONDENCE_EXPORT_BOTTOM_BLEED = 0;

function getRenderableImageUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';
  if (
    trimmed.startsWith('/')
    || trimmed.startsWith('data:image/')
    || trimmed.startsWith('blob:')
    || trimmed.includes('/api/image-proxy?')
  ) return trimmed;
  return proxiedImageUrl(trimmed);
}

function getFirstSentence(text: string) {
  return text.match(/^[\s\S]*?[.!?](?=\s|$)/u)?.[0]?.trim() || text.trim();
}

function getAuthorTeaser(text: string) {
  const firstSentence = getFirstSentence(text)
    .replace(/\s*[([{][^\])}]*[\])}]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (firstSentence.length <= 112) return firstSentence;

  const maxLength = 112;
  const prefix = firstSentence.slice(0, maxLength);
  const boundary = Math.max(
    prefix.lastIndexOf(','),
    prefix.lastIndexOf(';'),
    prefix.lastIndexOf(':'),
    prefix.lastIndexOf(' — '),
    prefix.lastIndexOf(' – '),
  );

  if (boundary >= 48) {
    return `${prefix.slice(0, boundary).replace(/[,:;–—-]+$/u, '').trim()}.`;
  }

  const words = prefix.trim().split(/\s+/u);
  let teaser = words.slice(0, -1).join(' ');
  while (/\b(?:e|ed|di|del|della|dei|degli|delle|il|lo|la|i|gli|le|un|uno|una|che|con|per|in|a|da|nel|nella|è|fu|ha)$/iu.test(teaser)) {
    teaser = teaser.replace(/\s+\S+$/u, '');
  }

  return `${teaser.replace(/[,:;–—-]+$/u, '').trim()}.`;
}

function getExportAuthorDescription(text: string, author: string, lingua: LanguageCode) {
  const teaser = getFirstSentence(text).replace(/\s{2,}/g, ' ').trim();
  if (lingua !== 'IT') return getAuthorTeaser(teaser);

  const dateLead = teaser.match(/^(.+?\bnel\s+\d{3,4})[,.]/iu)?.[1]?.trim();
  if (!dateLead) return getAuthorTeaser(teaser);

  const escapedAuthor = author.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const rest = teaser
    .slice(dateLead.length)
    .replace(/^[,\s]+/u, '')
    .replace(new RegExp(`^${escapedAuthor}\\s+è\\s+stato\\s+`, 'iu'), '')
    .replace(/^un\s+/iu, '')
    .trim();

  if (!rest) return `${dateLead}.`;
  const exportRest = `${rest.charAt(0).toUpperCase()}${rest.slice(1)}`
    .replace(/^(Matematico,\s+fisico,)\s+/u, '$1\n');
  return `${dateLead}.\n${exportRest}`;
}

function getExportWordEtymology(text: string, lingua: LanguageCode) {
  const normalized = text.replace(/\s{2,}/g, ' ').trim();
  if (lingua !== 'IT') return getFirstSentence(normalized);

  const origin = normalized.match(/^(dal(?:la|le|lo|l'|l)?\s+[^,;]+?)(?:,|;)/iu)?.[1]
    ?.replace(/\s*\([^)]*\)/gu, '')
    .trim();
  const meaning = normalized.match(/(?:che\s+)?significa\s+["“]([^"”]+)["”]/iu)?.[1]?.trim();

  if (origin && meaning) {
    const conciseMeaning = /^senza\s+passaggio$/iu.test(meaning) ? 'assenza di passaggio' : meaning;
    return `${origin.charAt(0).toLowerCase()}${origin.slice(1)} — ${conciseMeaning}`;
  }

  return getFirstSentence(normalized);
}

function getExportSaintRole(text: string, lingua: LanguageCode) {
  if (lingua !== 'IT') return text;
  return text.replace(/,\s*martire\b/iu, '').trim();
}

function getExportArtworkCredit(artist: string, lingua: LanguageCode) {
  if (lingua !== 'IT') return artist;
  return artist.replace(/^Joos\b/iu, 'J.').trim();
}

function getExportPoemSource(text: string, author: string, lingua: LanguageCode) {
  if (lingua !== 'IT') return text;

  const escapedAuthor = author.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return text
    .replace(new RegExp(`^${escapedAuthor},\\s*`, 'iu'), '')
    .replace(/(\d{4})[–-](\d{4})/u, (_, start: string, end: string) => `${start}–${end.slice(-2)}`)
    .trim();
}

function ContinueReadingHint() {
  return (
    <span className="correspondence-read-more" aria-hidden="true">
      <BookOpen strokeWidth={1.45} />
    </span>
  );
}

const moonLabels: Record<string, Record<LanguageCode, string>> = {
  new: { IT: 'Luna nuova', EN: 'New moon', FR: 'Nouvelle lune', DE: 'Neumond', ES: 'Luna nueva', PT: 'Lua nova' },
  'waxing-crescent': { IT: 'Luna crescente', EN: 'Waxing crescent', FR: 'Premier croissant', DE: 'Zunehmende Sichel', ES: 'Luna creciente', PT: 'Lua crescente' },
  'first-quarter': { IT: 'Primo quarto', EN: 'First quarter', FR: 'Premier quartier', DE: 'Erstes Viertel', ES: 'Cuarto creciente', PT: 'Quarto crescente' },
  'waxing-gibbous': { IT: 'Gibbosa crescente', EN: 'Waxing gibbous', FR: 'Gibbeuse croissante', DE: 'Zunehmender Mond', ES: 'Gibosa creciente', PT: 'Gibosa crescente' },
  full: { IT: 'Luna piena', EN: 'Full moon', FR: 'Pleine lune', DE: 'Vollmond', ES: 'Luna llena', PT: 'Lua cheia' },
  'waning-gibbous': { IT: 'Gibbosa calante', EN: 'Waning gibbous', FR: 'Gibbeuse décroissante', DE: 'Abnehmender Mond', ES: 'Gibosa menguante', PT: 'Gibosa minguante' },
  'last-quarter': { IT: 'Ultimo quarto', EN: 'Last quarter', FR: 'Dernier quartier', DE: 'Letztes Viertel', ES: 'Cuarto menguante', PT: 'Quarto minguante' },
  'waning-crescent': { IT: 'Luna calante', EN: 'Waning crescent', FR: 'Dernier croissant', DE: 'Abnehmende Sichel', ES: 'Luna menguante', PT: 'Lua minguante' },
};

export default function DailyCorrespondences({
  data,
  opera,
  dataIso,
  lingua,
  isDark,
  musicCover,
  sealColor,
  skyTargetId,
  seasonalArtwork,
  apod,
  saintArtwork,
  readingMedia,
  editorialMedia,
  editorialMediaCrops,
  presentation = 'home',
  onOpenStories,
}: {
  data: DatiTaccuino;
  opera: OperaGiorno | null;
  dataIso: string;
  lingua: LanguageCode;
  isDark: boolean;
  musicCover: string | null;
  sealColor: string;
  skyTargetId: string;
  seasonalArtwork: SeasonalArtwork | null;
  apod: ApodData | null;
  saintArtwork: SaintArtworkResult | null;
  readingMedia: ReadingMediaResult;
  editorialMedia: EditorialMediaOverrides;
  editorialMediaCrops: EditorialMediaCrops;
  presentation?: 'home' | 'social';
  onOpenStories?: () => void;
}) {
  const sheetRef = useRef<HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [failedMedia, setFailedMedia] = useState<Set<string>>(() => new Set());
  const [visiblePlanets, setVisiblePlanets] = useState<VisiblePlanet[] | null>(null);
  const isSocialPresentation = presentation === 'social';
  const moon = getMoonPhase(dataIso);
  const moonLabel = moonLabels[moon.phase]?.[lingua] ?? moonLabels[moon.phase]?.EN ?? t('moon', lingua);
  const { day: dayOfYear, total: totalDays } = getDayOfYearInfo(dataIso);
  const authorImageUrl = getRenderableImageUrl(editorialMedia.autore) || getRenderableImageUrl(data.foto_autore_url);
  const artworkImageUrl = getRenderableImageUrl(editorialMedia.opera) || getRenderableImageUrl(opera?.immagine_url || opera?.immagine_url_hd);
  const authorImageAvailable = Boolean(authorImageUrl) && !failedMedia.has(authorImageUrl);
  const artworkImageAvailable = Boolean(artworkImageUrl) && !failedMedia.has(artworkImageUrl);
  const musicCoverUrl = getRenderableImageUrl(editorialMedia.musica || musicCover) || null;
  const availableMusicCover = musicCoverUrl && !failedMedia.has(musicCoverUrl)
    ? musicCoverUrl
    : null;
  const seasonalArtworkImageAvailable = Boolean(seasonalArtwork?.imageUrl && !failedMedia.has(seasonalArtwork.imageUrl));
  const apodImageUrl = getRenderableImageUrl(editorialMedia.apod) || getRenderableImageUrl(apod?.thumbnail_url || apod?.url);
  const saintArtworkImageUrl = getRenderableImageUrl(editorialMedia.santi) || getRenderableImageUrl(saintArtwork?.imageUrl);
  const poemImageUrl = getRenderableImageUrl(readingMedia.poesia?.imageUrl);
  const bibleImageUrl = getRenderableImageUrl(readingMedia.bibbia?.imageUrl);
  const authorImageCrop = editorialMediaCrops.autore ?? DEFAULT_EDITORIAL_MEDIA_CROP;
  const apodImageAvailable = Boolean(apodImageUrl) && !failedMedia.has(apodImageUrl);
  const saintArtworkImageAvailable = Boolean(saintArtworkImageUrl) && !failedMedia.has(saintArtworkImageUrl);
  const poemImageAvailable = Boolean(poemImageUrl) && !failedMedia.has(poemImageUrl);
  const bibleImageAvailable = Boolean(bibleImageUrl) && !failedMedia.has(bibleImageUrl);
  const saintOfTheDay = data.santi[0];
  const authorDescription = getAuthorTeaser(data.breve_descrizione);
  const exportAuthorDescription = getExportAuthorDescription(data.breve_descrizione, data.autore_giorno, lingua);
  const exportWordEtymology = getExportWordEtymology(data.parola_giorno.etimologia, lingua);
  const exportSaintRole = saintOfTheDay ? getExportSaintRole(saintOfTheDay.ruolo, lingua) : '';
  const exportArtworkCredit = opera ? getExportArtworkCredit(opera.artista, lingua) : '';
  const exportPoemSource = getExportPoemSource(data.poesia.fonte || getFirstSentence(data.poesia.testo), data.poesia.autore, lingua);
  const wordLength = data.parola_giorno.parola.trim().length;
  const wordTypographyClass = wordLength > 24
    ? 'is-extra-long-word'
    : wordLength > 16
      ? 'is-long-word'
      : wordLength > 11
        ? 'is-wide-word'
        : '';

  useEffect(() => {
    let cancelled = false;
    const savedRegion = window.localStorage.getItem(SKY_REGION_STORAGE_KEY);
    const skyRegion: SkyRegion = savedRegion === 'north' || savedRegion === 'south' || savedRegion === 'center'
      ? savedRegion
      : 'center';

    void import('@/lib/visible-planets').then(({ getVisiblePlanets }) => {
      if (!cancelled) setVisiblePlanets(getVisiblePlanets(dataIso, skyRegion, lingua));
    });

    return () => {
      cancelled = true;
    };
  }, [dataIso, lingua]);

  const markMediaUnavailable = (url: string | null) => {
    if (!url) return;
    setFailedMedia((current) => {
      if (current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
    });
  };

  const scrollTo = useCallback((sectionId: string) => {
    const target = document.getElementById(sectionId);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const openSeasonalArtwork = useCallback(() => {
    window.dispatchEvent(new Event('open-artwork-solo'));
  }, []);

  const openEphemeris = useCallback(() => {
    if (window.matchMedia('(min-width: 1180px)').matches) {
      window.dispatchEvent(new Event(OPEN_EPHEMERIS_EVENT));
      return;
    }
    scrollTo(skyTargetId);
  }, [scrollTo, skyTargetId]);

  const downloadPlate = useCallback(async () => {
    if (!sheetRef.current || isExporting) return;
    setIsExporting(true);
    let exportFrame: HTMLDivElement | null = null;

    try {
      await document.fonts.ready;
      const { toPng } = await import('html-to-image');
      const clone = sheetRef.current.cloneNode(true) as HTMLElement;
      clone.removeAttribute('id');
      clone.classList.add('daily-correspondences-export', 'correspondence-complete-folio');
      clone.style.boxSizing = 'border-box';
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.maxWidth = 'none';
      clone.style.margin = '0';
      clone.style.width = `${CORRESPONDENCE_EXPORT_LAYOUT_WIDTH}px`;
      clone.querySelectorAll('[data-export-ignore]').forEach((node) => node.remove());

      exportFrame = document.createElement('div');
      exportFrame.className = `${garamond.className} correspondence-export-frame ${isDark ? 'is-dark' : ''}`;
      exportFrame.style.position = 'fixed';
      exportFrame.style.left = '0';
      exportFrame.style.top = '0';
      exportFrame.style.width = `${CORRESPONDENCE_EXPORT_WIDTH}px`;
      exportFrame.style.height = `${CORRESPONDENCE_EXPORT_HEIGHT}px`;
      exportFrame.style.boxSizing = 'border-box';
      exportFrame.style.display = 'flex';
      exportFrame.style.alignItems = 'center';
      exportFrame.style.justifyContent = 'center';
      exportFrame.style.padding = `${CORRESPONDENCE_EXPORT_SAFE_TOP}px ${CORRESPONDENCE_EXPORT_SAFE_SIDE}px ${CORRESPONDENCE_EXPORT_SAFE_BOTTOM}px`;
      exportFrame.style.zIndex = '-1';
      exportFrame.style.pointerEvents = 'none';
      exportFrame.style.overflow = 'hidden';

      const measureWrap = document.createElement('div');
      measureWrap.style.position = 'absolute';
      measureWrap.style.left = '0';
      measureWrap.style.top = '0';
      measureWrap.style.width = `${CORRESPONDENCE_EXPORT_LAYOUT_WIDTH}px`;
      measureWrap.style.visibility = 'hidden';
      measureWrap.style.pointerEvents = 'none';
      measureWrap.appendChild(clone);
      exportFrame.appendChild(measureWrap);
      document.body.appendChild(exportFrame);

      await Promise.all(Array.from(clone.querySelectorAll('img')).map(async (image) => {
        if (image.complete && image.naturalWidth > 0) {
          await image.decode().catch(() => undefined);
          return;
        }

        await new Promise<void>((resolve) => {
          const finish = () => {
            image.removeEventListener('load', finish);
            image.removeEventListener('error', finish);
            resolve();
          };
          image.addEventListener('load', finish, { once: true });
          image.addEventListener('error', finish, { once: true });
        });
      }));

      const exportLayoutHeight = Math.max(clone.getBoundingClientRect().height, 1);
      // La griglia resta fissa, ma le giornate con testi o media più ingombranti
      // rientrano automaticamente nella safe area, incluso il sigillo finale.
      const scale = Math.min(1, (CORRESPONDENCE_EXPORT_CONTENT_HEIGHT + CORRESPONDENCE_EXPORT_BOTTOM_BLEED) / exportLayoutHeight);

      const contentWrap = document.createElement('div');
      contentWrap.style.width = `${CORRESPONDENCE_EXPORT_LAYOUT_WIDTH}px`;
      contentWrap.style.height = `${CORRESPONDENCE_EXPORT_CONTENT_HEIGHT}px`;
      contentWrap.style.display = 'flex';
      contentWrap.style.alignItems = 'flex-start';
      contentWrap.style.justifyContent = 'center';
      contentWrap.style.overflow = 'hidden';
      contentWrap.style.position = 'relative';
      contentWrap.style.zIndex = '1';

      const scaledFolio = document.createElement('div');
      scaledFolio.style.width = `${CORRESPONDENCE_EXPORT_LAYOUT_WIDTH * scale}px`;
      scaledFolio.style.height = `${exportLayoutHeight * scale}px`;
      scaledFolio.style.flex = '0 0 auto';
      scaledFolio.style.position = 'relative';

      clone.style.transform = `scale(${scale})`;
      clone.style.transformOrigin = 'top left';
      scaledFolio.appendChild(clone);
      contentWrap.appendChild(scaledFolio);
      measureWrap.remove();
      exportFrame.appendChild(contentWrap);

      const dataUrl = await toPng(exportFrame, {
        width: CORRESPONDENCE_EXPORT_WIDTH,
        height: CORRESPONDENCE_EXPORT_HEIGHT,
        pixelRatio: 1,
        cacheBust: true,
        includeQueryParams: true,
      });
      const link = document.createElement('a');
      link.download = `coordinate-del-giorno-${dataIso}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Errore export corrispondenze:', error);
    } finally {
      exportFrame?.remove();
      setIsExporting(false);
    }
  }, [dataIso, isDark, isExporting]);

  return (
    <section
      id={isSocialPresentation ? undefined : 'corrispondenze'}
      className={`daily-correspondences ${isDark ? 'is-dark' : ''}${isSocialPresentation ? ' correspondence-export-frame social-story-export-root' : ''}`}
      data-social-story={isSocialPresentation ? 'all-in-one' : undefined}
      data-social-story-root={isSocialPresentation ? 'true' : undefined}
      aria-labelledby={isSocialPresentation ? 'social-correspondences-title' : 'correspondences-title'}
    >
      <article
        ref={sheetRef}
        className={`daily-correspondences-sheet ${isDark ? 'is-dark' : ''}${isSocialPresentation ? ' daily-correspondences-export correspondence-complete-folio' : ''}`}
        data-seal-color={sealColor}
      >
        <header className="daily-correspondences-header">
          <span className="daily-correspondences-kicker">{t('correspondencesTitle', lingua)}</span>
          <span className={`${janeAust.className} jane-aust-wordmark daily-correspondences-export-title`}>{t('dayTitle', lingua)}</span>
          <span className="daily-correspondences-export-ornament" aria-hidden="true"><Flower2 strokeWidth={1.1} /></span>
          <span className="daily-correspondences-export-date">{formatExLibrisDate(dataIso)}</span>
          <span className="daily-correspondences-edition">{t('edition', lingua)} {dayOfYear}/{totalDays}</span>
        </header>

        <div className="daily-correspondences-intro">
          <p>{t('correspondencesKicker', lingua)}</p>
          <h2 id={isSocialPresentation ? 'social-correspondences-title' : 'correspondences-title'}>
            <TypewriterPhrase
              prefix={t('correspondencesLead', lingua)}
              word={data.parola_giorno.parola}
              wordClass={wordTypographyClass}
              className="correspondence-lead-typewriter"
              startDelay={CORRESPONDENCE_TYPEWRITER_DELAY}
              speed={CORRESPONDENCE_TYPEWRITER_SPEED}
            />
          </h2>
          <p className="daily-correspondences-copy">{t('correspondencesCopy', lingua)}</p>
        </div>

        <div className="daily-correspondences-complete-body">
          <div className="daily-correspondences-grid">
          <button type="button" className="correspondence-author" onClick={() => scrollTo('autore')}>
            <span className="correspondence-author-label"><Feather aria-hidden="true" />{t('correspondenceAuthor', lingua)}</span>
            {authorImageAvailable ? (
              <span className="correspondence-author-image-frame">
                {/* eslint-disable-next-line @next/next/no-img-element -- dynamic proxied media must remain usable by the DOM export */}
                <img
                  draggable={false}
                  src={authorImageUrl}
                  alt=""
                  onError={() => markMediaUnavailable(authorImageUrl)}
                  {...eagerImageProps}
                  style={getEditorialMediaCropImageStyle(authorImageCrop)}
                />
              </span>
            ) : (
              <span className="correspondence-author-image-frame correspondence-author-empty"><Feather aria-hidden="true" /><small>{t('correspondencePortraitUnavailable', lingua)}</small></span>
            )}
            <span className="correspondence-author-caption">
              <strong>{data.autore_giorno}</strong>
              <em className="correspondence-author-full-description">{authorDescription}</em>
              <em className="correspondence-author-export-description">{exportAuthorDescription}</em>
            </span>
            <ContinueReadingHint />
          </button>

          <button type="button" className="correspondence-entry correspondence-word" onClick={() => scrollTo('parola')}>
            <span className="correspondence-entry-label correspondence-word-label-full"><Feather aria-hidden="true" />{t('correspondenceWord', lingua)}</span>
            <span className="correspondence-entry-label correspondence-word-label-export"><Feather aria-hidden="true" />{lingua === 'IT' ? 'Parola del giorno' : t('correspondenceWord', lingua)}</span>
            <span className="correspondence-word-content">
              <span>
                <strong className={wordTypographyClass}>{data.parola_giorno.parola}</strong>
                <em className="correspondence-word-full-etymology">{data.parola_giorno.etimologia}</em>
                <em className="correspondence-word-export-etymology">{exportWordEtymology}</em>
              </span>
            </span>
            <ContinueReadingHint />
          </button>

          {saintOfTheDay ? (
            <button type="button" className="correspondence-entry correspondence-saint" onClick={() => scrollTo('santi')}>
              <span className="correspondence-entry-label"><Church aria-hidden="true" />{t('correspondenceSaint', lingua)}</span>
              <span className="correspondence-entry-content">
                {saintArtworkImageAvailable ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- dynamic proxied media must remain usable by the DOM export */
                  <img draggable={false} src={saintArtworkImageUrl} alt="" onError={() => markMediaUnavailable(saintArtworkImageUrl)} {...eagerImageProps} />
                ) : <span className="correspondence-saint-mark" aria-hidden="true"><Church /></span>}
                <span><strong>{saintOfTheDay.nome}</strong><em className="correspondence-entry-full-copy">{saintOfTheDay.ruolo}</em><em className="correspondence-entry-export-copy">{exportSaintRole}</em></span>
              </span>
              <ContinueReadingHint />
            </button>
          ) : null}

          {opera ? (
            <button type="button" className="correspondence-entry correspondence-artwork" onClick={() => scrollTo('opera')}>
              <span className="correspondence-entry-label"><Palette aria-hidden="true" />{t('correspondenceArtwork', lingua)}</span>
              <span className="correspondence-entry-content">
                {artworkImageAvailable ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- dynamic proxied media must remain usable by the DOM export */
                  <img draggable={false} src={artworkImageUrl} alt={`${opera.titolo}, ${opera.artista}`} onError={() => markMediaUnavailable(artworkImageUrl)} {...eagerImageProps} />
                ) : <span className="correspondence-missing-media" title={t('correspondenceArtworkUnavailable', lingua)}><Palette aria-hidden="true" /></span>}
                <span><strong>{opera.titolo}</strong><em className="correspondence-entry-full-copy">{opera.artista}{opera.anno ? ` · ${opera.anno}` : ''}</em><em className="correspondence-entry-export-copy">{exportArtworkCredit}{opera.anno ? ` · ${opera.anno}` : ''}</em></span>
              </span>
              <ContinueReadingHint />
            </button>
          ) : null}

          <button type="button" className="correspondence-entry correspondence-music" onClick={() => scrollTo('musica')}>
            <span className="correspondence-entry-label"><Music aria-hidden="true" />{t('correspondenceMusic', lingua)}</span>
            <span className="correspondence-entry-content">
              {availableMusicCover ? (
                /* eslint-disable-next-line @next/next/no-img-element -- music cover is a runtime URL and is exported from the DOM */
                <img draggable={false} src={availableMusicCover} alt="" onError={() => markMediaUnavailable(availableMusicCover)} {...eagerImageProps} />
              ) : <span className="correspondence-missing-media" title={t('correspondenceMusicCoverUnavailable', lingua)}><Music aria-hidden="true" /></span>}
              <span><strong>{data.musica.brano}</strong><em>{data.musica.autore}</em></span>
            </span>
            <ContinueReadingHint />
          </button>

          <button type="button" className="correspondence-entry correspondence-sky" onClick={openEphemeris}>
            <span className="correspondence-entry-label"><Moon aria-hidden="true" />{t('correspondenceSky', lingua)}</span>
            <span className="correspondence-entry-content">
              <span className={`correspondence-moon phase-${moon.phase}`}><MoonPhaseGlyph phase={moon.phase} /></span>
              <span><strong>{moonLabel}</strong><em>{moon.illumination}%</em></span>
            </span>
            {visiblePlanets?.length ? (
              <span className="correspondence-planets" aria-label={t('planets', lingua)}>
                <span className="correspondence-planets-heading"><Eye aria-hidden="true" />{t('visiblePlanetsInSky', lingua)}</span>
                {visiblePlanets.map((planet) => (
                  <span key={planet.body} className="correspondence-planet-chip" title={`${planet.name} · ${planet.direction} · ${planet.bestTime} · ${t(planet.viewingAid === 'binoculars-recommended' ? 'binocularsRecommended' : 'nakedEye', lingua)}`}>
                    <span className={`correspondence-planet-icon planet-${planet.body.toLowerCase()}`} aria-hidden="true" />
                    <span className="correspondence-planet-aid" aria-label={t(planet.viewingAid === 'binoculars-recommended' ? 'binocularsRecommended' : 'nakedEye', lingua)}>
                      {planet.viewingAid === 'binoculars-recommended' ? <Binoculars aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    </span>
                    <span><strong>{planet.name}</strong><em>{planet.direction} · {planet.bestTime}</em></span>
                  </span>
                ))}
              </span>
            ) : null}
          </button>

          {apod ? (
            <button type="button" className="correspondence-entry correspondence-apod" onClick={() => scrollTo('apod')}>
              <span className="correspondence-entry-label"><Telescope aria-hidden="true" />{t('correspondenceApod', lingua)}</span>
              <span className="correspondence-entry-content">
                {apodImageAvailable ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- APOD is proxied dynamic editorial media and must remain available to the DOM export */
                  <img draggable={false} src={apodImageUrl} alt="" onError={() => markMediaUnavailable(apodImageUrl)} {...eagerImageProps} />
                ) : <span className="correspondence-missing-media" aria-hidden="true"><Telescope /></span>}
                <span><strong>{lingua === 'IT' ? apod.title_it : apod.title_en}</strong><em>NASA APOD</em></span>
              </span>
              <ContinueReadingHint />
            </button>
          ) : null}
          </div>

          <div className="daily-correspondences-readings">
          <button type="button" className="correspondence-reading correspondence-poem" onClick={() => scrollTo('poesia')}>
            <span className="correspondence-reading-label"><Feather aria-hidden="true" />{t('correspondencePoem', lingua)}</span>
            <span className={`correspondence-reading-content${poemImageAvailable ? ' has-image' : ''}`}>
              {poemImageAvailable ? (
                /* eslint-disable-next-line @next/next/no-img-element -- dynamic proxied media must remain usable by the DOM export */
                <img draggable={false} src={poemImageUrl} alt="" onError={() => markMediaUnavailable(poemImageUrl)} {...eagerImageProps} />
              ) : null}
              <span><strong>{data.poesia.autore}</strong><em className="correspondence-entry-full-copy">{data.poesia.fonte || getFirstSentence(data.poesia.testo)}</em><em className="correspondence-entry-export-copy">{exportPoemSource}</em></span>
            </span>
            <ContinueReadingHint />
          </button>
          <button type="button" className="correspondence-reading correspondence-bible" onClick={() => scrollTo('bibbia')}>
            <span className="correspondence-reading-label"><BookOpen aria-hidden="true" />{t('correspondenceBible', lingua)}</span>
            <span className={`correspondence-reading-content${bibleImageAvailable ? ' has-image' : ''}`}>
              {bibleImageAvailable ? (
                /* eslint-disable-next-line @next/next/no-img-element -- dynamic proxied media must remain usable by the DOM export */
                <img draggable={false} src={bibleImageUrl} alt="" onError={() => markMediaUnavailable(bibleImageUrl)} {...eagerImageProps} />
              ) : null}
              <span><strong>{data.bibbia.fonte}</strong><em>{getFirstSentence(data.bibbia.testo)}</em></span>
            </span>
            <ContinueReadingHint />
          </button>
          </div>

          {seasonalArtwork ? (
          <button type="button" className="daily-correspondences-seasonal" onClick={openSeasonalArtwork}>
            <span className="daily-correspondences-seasonal-label daily-correspondences-seasonal-full-label">{t('seasonalArtwork', lingua)}</span>
            <span className="daily-correspondences-seasonal-label daily-correspondences-seasonal-export-label">{lingua === 'IT' ? 'L’opera stagionale' : t('seasonalArtwork', lingua)}</span>
            <span className="daily-correspondences-seasonal-preview" aria-hidden="true">
              {seasonalArtworkImageAvailable ? (
                /* eslint-disable-next-line @next/next/no-img-element -- the seasonal artwork is local editorial media and must remain available to the DOM export */
                <img draggable={false} src={seasonalArtwork.imageUrl} alt="" onError={() => markMediaUnavailable(seasonalArtwork.imageUrl)} {...eagerImageProps} />
              ) : <Palette aria-hidden="true" />}
            </span>
            <span className="daily-correspondences-seasonal-copy"><strong>{seasonalArtwork.title}</strong><em>{seasonalArtwork.artist}{seasonalArtwork.year ? ` · ${seasonalArtwork.year}` : ''}</em></span>
            <small>{t('seasonalArtworkOpen', lingua)} <ArrowDown aria-hidden="true" strokeWidth={1.7} /></small>
            <ContinueReadingHint />
          </button>
          ) : null}
        </div>

        <div className="daily-correspondences-closure">
          <footer className="daily-correspondences-footer">
            <div className={`daily-wax-seal daily-correspondences-wax-seal seal-${sealColor}`} aria-label={`${t('waxSealAria', lingua)}: ${data.autore_giorno}`}>
              <div className="daily-wax-seal-inner">
                <span className="seal-initials">{getInitials(data.autore_giorno)}</span>
                <span className="seal-date">{formatExLibrisDate(dataIso)}</span>
                <span className="seal-edition">{t('edition', lingua)}<br />{`${t('number', lingua)} ${dayOfYear} ${t('of', lingua)} ${totalDays}`}</span>
              </div>
            </div>
          </footer>
          <div className="daily-correspondences-actions" data-export-ignore>
            <button type="button" className="daily-correspondences-follow" onClick={() => scrollTo('autore')}>
              <span>{t('correspondencesFollow', lingua)}</span>
              <BookOpen aria-hidden="true" strokeWidth={1.7} />
            </button>
            <button type="button" className="daily-correspondences-download" onClick={() => void downloadPlate()} disabled={isExporting} aria-label={t('correspondencesDownloadAria', lingua)}>
              <span className={`daily-correspondences-download-icon ${isExporting ? 'is-preparing' : ''}`} aria-hidden="true">
                <Download className="daily-correspondences-download-default" strokeWidth={1.7} />
                <Sparkles className="daily-correspondences-download-preparing" strokeWidth={1.7} />
              </span>
              <span aria-live="polite">{isExporting ? t('correspondencesPreparing', lingua) : t('correspondencesDownload', lingua)}</span>
            </button>
            {onOpenStories ? (
              <button type="button" className="daily-correspondences-download daily-correspondences-stories" onClick={onOpenStories}>
                <Images aria-hidden="true" strokeWidth={1.65} />
                <span>{t('socialStories', lingua)}</span>
              </button>
            ) : null}
          </div>
        </div>
      </article>
    </section>
  );
}
