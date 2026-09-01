'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Church,
  Download,
  Feather,
  Flower2,
  Image as ImageIcon,
  Images,
  Moon,
  Music,
  Palette,
  Telescope,
  X,
} from 'lucide-react';
import DailyCorrespondences from './DailyCorrespondences';
import {
  downloadSocialStories,
  downloadSocialStory,
  SOCIAL_STORY_HEIGHT,
  SOCIAL_STORY_WIDTH,
} from './socialStoryExport';
import type {
  ApodData,
  DatiTaccuino,
  LanguageCode,
  OperaGiorno,
  ReadingMediaResult,
  SaintArtworkResult,
} from '@/lib/types';
import type { SeasonalArtwork } from '@/lib/seasonal-artwork';
import type { EditorialMediaCrops, EditorialMediaOverrides } from '@/lib/editorial-media';
import { getMoonPhase } from '@/lib/astronomy';
import { formatExLibrisDate, getDayOfYearInfo, getInitials } from '@/lib/date-utils';
import { getImageLoadingProps, proxiedImageUrl } from '@/lib/browser-utils';
import { getVisiblePlanets, type VisiblePlanet } from '@/lib/visible-planets';
import { SITE_WATERMARK } from '@/lib/constants';
import { garamond, janeAust } from '@/lib/fonts';
import { MoonPhaseGlyph } from '@/components/ui/Doodles';
import { t } from '@/lib/translation';

export type SocialStoryVariant = 'all-in-one' | 'things' | 'carry';

export interface SocialStoryProps {
  data: DatiTaccuino;
  opera: OperaGiorno | null;
  dataIso: string;
  lingua: LanguageCode;
  isDark: boolean;
  musicCover: string | null;
  sealColor: string;
  seasonalArtwork: SeasonalArtwork | null;
  apod: ApodData | null;
  saintArtwork: SaintArtworkResult | null;
  readingMedia: ReadingMediaResult;
  editorialMedia: EditorialMediaOverrides;
  editorialMediaCrops: EditorialMediaCrops;
}

const eagerImageProps = getImageLoadingProps(true);

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

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/gu, ' ').trim() ?? '';
}

function getFirstSentence(text: string) {
  return text.match(/^[\s\S]*?[.!?](?=\s|$)/u)?.[0]?.trim() || normalizeText(text);
}

function getSocialExcerpt(text: string, maxChars = 220) {
  const normalized = normalizeText(text);
  if (!normalized || normalized.length <= maxChars) return normalized;

  const firstSentence = getFirstSentence(normalized);
  if (firstSentence !== normalized && firstSentence.length <= maxChars) {
    const remainder = normalized.slice(firstSentence.length).trim();
    const secondSentence = remainder ? getFirstSentence(remainder) : '';
    const withSecond = [firstSentence, secondSentence]
      .filter((sentence) => sentence && sentence !== remainder)
      .join(' ');
    if (withSecond.length <= maxChars) return withSecond;
    return firstSentence;
  }

  const words = normalized.split(/\s+/u);
  let excerpt = '';
  for (const word of words) {
    const next = excerpt ? `${excerpt} ${word}` : word;
    if (next.length > maxChars) break;
    excerpt = next;
  }

  return `${excerpt.replace(/[,:;–—-]+$/u, '').trim()}…`;
}

function getSocialLineExcerpt(text: string, maxChars: number, maxLines: number) {
  const lines = text
    .split(/\r?\n/u)
    .map((line) => normalizeText(line))
    .filter(Boolean);
  if (!lines.length) return '';
  if (lines.length === 1) return getSocialExcerpt(lines[0], maxChars);

  const selected: string[] = [];
  let length = 0;
  for (const line of lines) {
    if (selected.length >= maxLines) break;
    const separatorLength = selected.length > 0 ? 1 : 0;
    if (length + separatorLength + line.length > maxChars) break;
    selected.push(line);
    length += separatorLength + line.length;
  }

  if (!selected.length) return getSocialExcerpt(text, maxChars);
  if (selected.length < lines.length) {
    selected[selected.length - 1] = `${selected[selected.length - 1].replace(/[,:;–—-]+$/u, '').trim()}…`;
  }
  return selected.join('\n');
}

function getSocialPoemExcerpt(text: string) {
  const blocks = text
    .split(/\r?\n\s*\r?\n/u)
    .map((block) => block.split(/\r?\n/u).map((line) => normalizeText(line)).filter(Boolean))
    .filter((block) => block.length > 0);
  if (!blocks.length) return '';

  const firstBlock = blocks[0];
  const verseBlocks = blocks.length > 1 && firstBlock.length === 1
    ? blocks.slice(1)
    : [firstBlock.length > 1 && !/[.!?,;:]$/u.test(firstBlock[0]) ? firstBlock.slice(1) : firstBlock];
  return getSocialLineExcerpt(verseBlocks.flat().join('\n'), 1180, 16);
}

function getSocialPoemSource(data: DatiTaccuino) {
  const source = normalizeText(data.poesia.fonte || getFirstSentence(data.poesia.testo));
  if (!source) return '—';
  const author = normalizeText(data.poesia.autore);
  if (!author) return source;
  const escapedAuthor = author.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return source.replace(new RegExp(`^${escapedAuthor},\\s*`, 'iu'), '').trim() || source;
}

function getSocialImageUrl(value: string | null | undefined) {
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

function getSocialMedia(props: SocialStoryProps) {
  const { data, opera, apod, saintArtwork, readingMedia, musicCover, seasonalArtwork, editorialMedia } = props;
  const rawMusic = editorialMedia.musica || musicCover || '';
  return {
    saint: getSocialImageUrl(editorialMedia.santi || saintArtwork?.imageUrl),
    artwork: getSocialImageUrl(editorialMedia.opera || opera?.immagine_url || opera?.immagine_url_hd),
    music: getSocialImageUrl(rawMusic),
    musicFallback: '',
    apod: getSocialImageUrl(editorialMedia.apod || apod?.thumbnail_url || apod?.url),
    poem: getSocialImageUrl(readingMedia.poesia?.imageUrl),
    author: getSocialImageUrl(editorialMedia.autore || data.foto_autore_url),
    seasonal: seasonalArtwork?.imageUrl ?? '',
  };
}

function getTextLengthClass(value: string, thresholds = [22, 38, 56]) {
  const length = normalizeText(value).length;
  if (length > thresholds[2]) return 'is-very-long';
  if (length > thresholds[1]) return 'is-long';
  if (length > thresholds[0]) return 'is-medium';
  return '';
}

function useVisiblePlanetsForStory(dataIso: string, lingua: LanguageCode) {
  const [visiblePlanets, setVisiblePlanets] = useState<VisiblePlanet[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    let region: 'north' | 'center' | 'south' = 'center';
    try {
      const savedRegion = window.localStorage.getItem('taccuino-sky-region-v1');
      if (savedRegion === 'north' || savedRegion === 'south' || savedRegion === 'center') region = savedRegion;
    } catch {
      // Use Rome as the stable default when local storage is unavailable.
    }

    const frame = window.requestAnimationFrame(() => {
      if (!cancelled) setVisiblePlanets(getVisiblePlanets(dataIso, region, lingua));
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [dataIso, lingua]);

  return visiblePlanets;
}

function StorySectionLabel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="social-story-section-label">
      <Icon aria-hidden="true" strokeWidth={1.55} />
      <span>{children}</span>
    </span>
  );
}

function StoryRule() {
  return <span className="social-story-rule" aria-hidden="true" />;
}

function StoryImage({
  src,
  fallbackSrc,
  alt,
  className,
  fallbackLabel,
  fallbackIcon: FallbackIcon = ImageIcon,
}: {
  src: string;
  fallbackSrc?: string;
  alt: string;
  className: string;
  fallbackLabel: string;
  fallbackIcon?: LucideIcon;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const primaryFailed = Boolean(src) && failedSrc === src;
  const fallbackFailed = Boolean(fallbackSrc) && failedSrc === fallbackSrc;
  const activeSrc = primaryFailed ? (fallbackSrc || '') : (src || fallbackSrc || '');

  if (!activeSrc || fallbackFailed) {
    return (
      <span className={`${className} social-story-media-empty`} role="img" aria-label={fallbackLabel}>
        <FallbackIcon aria-hidden="true" strokeWidth={1.2} />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- the image is a proxied runtime asset and must be capturable by html-to-image
    <img
      className={className}
      src={activeSrc}
      alt={alt}
      draggable={false}
      onError={() => setFailedSrc(activeSrc)}
      {...eagerImageProps}
    />
  );
}

function StoryHeader({ dataIso, lingua }: { dataIso: string; lingua: LanguageCode }) {
  const { day, total } = getDayOfYearInfo(dataIso);
  return (
    <header className="social-story-header">
      <span className={`${janeAust.className} social-story-wordmark`}>{t('dayTitle', lingua)}</span>
      <span className="social-story-header-line" aria-hidden="true" />
      <span className="social-story-header-ornament" aria-hidden="true"><Flower2 strokeWidth={1.05} /></span>
      <span className="social-story-date">{formatExLibrisDate(dataIso)}</span>
      <span className="social-story-edition">{t('edition', lingua)} {day}/{total}</span>
    </header>
  );
}

function StorySeal({ data, dataIso, lingua, sealColor }: Pick<SocialStoryProps, 'data' | 'dataIso' | 'lingua' | 'sealColor'>) {
  const { day, total } = getDayOfYearInfo(dataIso);
  return (
    <footer className="social-story-seal-footer">
      <div className={`daily-wax-seal social-story-seal seal-${sealColor}`} aria-label={`${t('waxSealAria', lingua)}: ${data.autore_giorno}`}>
        <div className="daily-wax-seal-inner">
          <span className="seal-initials">{getInitials(data.autore_giorno)}</span>
          <span className="seal-date">{formatExLibrisDate(dataIso)}</span>
          <span className="seal-edition">{t('edition', lingua)}<br />{`${t('number', lingua)} ${day} ${t('of', lingua)} ${total}`}</span>
        </div>
      </div>
    </footer>
  );
}

function StoryWatermark() {
  return <span className="social-story-watermark">{SITE_WATERMARK}</span>;
}

function ThingsStory(props: SocialStoryProps) {
  const { data, opera, dataIso, lingua, isDark, sealColor, saintArtwork, apod } = props;
  const media = getSocialMedia(props);
  const saint = data.santi[0] ?? null;
  const moon = getMoonPhase(dataIso);
  const moonLabel = moonLabels[moon.phase]?.[lingua] ?? moonLabels[moon.phase]?.EN ?? t('moon', lingua);
  const visiblePlanets = useVisiblePlanetsForStory(dataIso, lingua);
  const artworkTitle = opera?.titolo || '—';
  const artworkMeta = opera ? `${opera.artista}${opera.anno ? ` · ${opera.anno}` : ''}` : '—';
  const saintName = saint?.nome || '—';
  const saintRole = saint ? getSocialExcerpt(saint.ruolo, 82) : '—';
  const apodTitle = lingua === 'IT' ? (apod?.title_it || apod?.title_en || '—') : (apod?.title_en || apod?.title_it || '—');
  const apodCredit = apod?.copyright ? `NASA APOD · ${apod.copyright}` : 'NASA APOD';

  return (
    <article
      className={`${garamond.className} social-story-canvas social-story-things${isDark ? ' is-dark' : ''}`}
      data-social-story="things"
      data-social-story-root="true"
      data-seal-color={sealColor}
      aria-label={t('socialStoryThings', lingua)}
    >
      <StoryHeader dataIso={dataIso} lingua={lingua} />
      <main className="social-story-things-main">
        <div className="social-things-grid">
          <section className="social-things-cell social-things-saint">
            <StorySectionLabel icon={Church}>{t('correspondenceSaint', lingua)}</StorySectionLabel>
            <StoryRule />
            <StoryImage
              src={media.saint}
              alt={saintArtwork?.title || saintName}
              className="social-things-media"
              fallbackLabel={t('socialStoryImageUnavailable', lingua)}
              fallbackIcon={Church}
            />
            <h2 className={`social-things-title ${getTextLengthClass(saintName, [18, 28, 42])}`}>{saintName}</h2>
            <p className="social-things-meta">{saintRole}</p>
            <StoryRule />
          </section>

          <section className="social-things-cell social-things-artwork">
            <StorySectionLabel icon={Palette}>{t('correspondenceArtwork', lingua)}</StorySectionLabel>
            <StoryRule />
            <StoryImage
              src={media.artwork}
              alt={artworkTitle}
              className="social-things-media"
              fallbackLabel={t('socialStoryImageUnavailable', lingua)}
              fallbackIcon={Palette}
            />
            <h2 className={`social-things-title ${getTextLengthClass(artworkTitle, [18, 28, 42])}`}>{artworkTitle}</h2>
            <p className="social-things-meta">{artworkMeta}</p>
            <StoryRule />
          </section>

          <section className="social-things-cell social-things-music">
            <StorySectionLabel icon={Music}>{t('socialStoryMusicAdvice', lingua)}</StorySectionLabel>
            <StoryRule />
            <StoryImage
              src={media.music}
              fallbackSrc={media.musicFallback}
              alt={`${data.musica.brano} — ${data.musica.autore}`}
              className="social-things-media"
              fallbackLabel={t('socialStoryImageUnavailable', lingua)}
              fallbackIcon={Music}
            />
            <h2 className={`social-things-title ${getTextLengthClass(data.musica.brano, [18, 28, 42])}`}>{data.musica.brano || '—'}</h2>
            <p className="social-things-meta">{data.musica.autore || '—'}</p>
            <StoryRule />
          </section>

          <section className="social-things-cell social-things-sky">
            <StorySectionLabel icon={Moon}>{t('socialStorySkyOfDay', lingua)}</StorySectionLabel>
            <StoryRule />
            <div className="social-things-media social-things-sky-media" role="img" aria-label={`${moonLabel}, ${moon.illumination}%`}>
              <MoonPhaseGlyph phase={moon.phase} />
            </div>
            <h2 className="social-things-title">{moonLabel}</h2>
            <p className="social-things-illumination">{moon.illumination}%</p>
            {visiblePlanets?.length ? (
              <div className="social-things-planets">
                <span className="social-things-planets-heading">{t('socialStoryPlanets', lingua)}</span>
                <div className="social-things-planets-list">
                  {visiblePlanets.map((planet) => (
                    <span className="social-things-planet" key={planet.body}>
                      <span className={`correspondence-planet-icon planet-${String(planet.body).toLowerCase()}`} aria-hidden="true" />
                      <span>{planet.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="social-things-cell social-things-apod">
            <StorySectionLabel icon={Telescope}>{t('correspondenceApod', lingua)}</StorySectionLabel>
            <div className="social-things-apod-layout">
              <StoryImage
                src={media.apod}
                alt={apodTitle}
                className="social-things-apod-media"
                fallbackLabel={t('socialStoryImageUnavailable', lingua)}
                fallbackIcon={Telescope}
              />
              <div className="social-things-apod-copy">
                <h2 className={`social-things-title ${getTextLengthClass(apodTitle, [24, 38, 56])}`}>{apodTitle}</h2>
                <p className="social-things-meta">{apodCredit}</p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <StorySeal data={data} dataIso={dataIso} lingua={lingua} sealColor={sealColor} />
      <StoryWatermark />
    </article>
  );
}

function CarryStory(props: SocialStoryProps) {
  const { data, dataIso, lingua, isDark, seasonalArtwork } = props;
  const media = getSocialMedia(props);
  const poemSource = getSocialPoemSource(data);
  const poemExcerpt = getSocialPoemExcerpt(data.poesia.testo);
  const seasonalMeta = seasonalArtwork
    ? `${seasonalArtwork.artist}${seasonalArtwork.year ? ` · ${seasonalArtwork.year}` : ''}`
    : '—';

  return (
    <article
      className={`${garamond.className} social-story-canvas social-story-carry${isDark ? ' is-dark' : ''}`}
      data-social-story="carry"
      data-social-story-root="true"
      aria-label={t('socialStoryCarry', lingua)}
    >
      <StoryHeader dataIso={dataIso} lingua={lingua} />
      <div className="social-carry-seasonal-background" aria-hidden="true">
        <StoryImage
          src={media.seasonal}
          alt=""
          className="social-carry-seasonal-background-image"
          fallbackLabel={t('socialStoryImageUnavailable', lingua)}
          fallbackIcon={Palette}
        />
      </div>
      <main className="social-story-carry-main">
        <section className="social-carry-section social-carry-poem">
          <StorySectionLabel icon={Feather}>{t('correspondencePoem', lingua)}</StorySectionLabel>
          <div className="social-carry-poem-layout">
            <StoryImage
              src={media.poem}
              alt={data.poesia.autore}
              className="social-carry-poem-image"
              fallbackLabel={t('socialStoryImageUnavailable', lingua)}
              fallbackIcon={Feather}
            />
            <div className="social-carry-poem-copy">
              <h1 className={`social-carry-author ${getTextLengthClass(data.poesia.autore, [20, 32, 46])}`}>{data.poesia.autore || '—'}</h1>
              <p className="social-carry-poem-source">{poemSource}</p>
              <StoryRule />
            </div>
          </div>
          <div className="social-carry-poem-reading">
            <span className="social-carry-poem-quote" aria-hidden="true">“</span>
            <p className="social-carry-poem-excerpt">{poemExcerpt || '—'}</p>
          </div>
        </section>

        <section className="social-carry-section social-carry-seasonal">
          <div className="social-carry-seasonal-label-highlight">
            <StorySectionLabel icon={ImageIcon}>{t('seasonalArtwork', lingua)}</StorySectionLabel>
          </div>
          <div className="social-carry-seasonal-layout">
            <div className="social-carry-seasonal-copy">
              <div className="social-carry-seasonal-highlight">
                <h2 className={`social-carry-seasonal-title ${getTextLengthClass(seasonalArtwork?.title || '', [24, 38, 56])}`}>{seasonalArtwork?.title || '—'}</h2>
                <p>{seasonalMeta}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <StoryWatermark />
    </article>
  );
}

export function SocialStorySheet({ variant, ...props }: SocialStoryProps & { variant: SocialStoryVariant }) {
  if (variant === 'all-in-one') {
    return (
      <DailyCorrespondences
        {...props}
        skyTargetId="effemeridi"
        presentation="social"
      />
    );
  }

  return variant === 'things' ? <ThingsStory {...props} /> : <CarryStory {...props} />;
}

export function SocialStoryPreview({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  const updateScale = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    setScale(Math.min(rect.width / SOCIAL_STORY_WIDTH, rect.height / SOCIAL_STORY_HEIGHT));
  }, []);

  useLayoutEffect(() => {
    updateScale();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateScale);
    observer?.observe(viewport);
    window.addEventListener('resize', updateScale);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [updateScale]);

  return (
    <div ref={viewportRef} className="social-story-preview-viewport">
      <div
        className="social-story-preview-stage"
        style={{ transform: `scale(${scale})`, width: `${SOCIAL_STORY_WIDTH}px`, height: `${SOCIAL_STORY_HEIGHT}px` }}
      >
        {children}
      </div>
    </div>
  );
}

const STORY_VARIANTS: SocialStoryVariant[] = ['all-in-one', 'things', 'carry'];

function storyLabel(variant: SocialStoryVariant, lingua: LanguageCode) {
  if (variant === 'all-in-one') return t('socialStoryAllInOne', lingua);
  if (variant === 'things') return t('socialStoryThings', lingua);
  return t('socialStoryCarry', lingua);
}

function storyDisplayLabel(variant: SocialStoryVariant, lingua: LanguageCode) {
  return variant === 'things' ? null : storyLabel(variant, lingua);
}

function storyFilename(variant: SocialStoryVariant, dataIso: string) {
  const prefix = variant === 'all-in-one'
    ? 'coordinate-del-giorno'
    : variant === 'things'
      ? 'le-cose-del-giorno'
      : 'da-portare-con-se';
  return `${prefix}-${dataIso}.png`;
}

interface SocialStoriesGalleryProps extends SocialStoryProps {
  className?: string;
}

type ExportingStory = SocialStoryVariant | 'all' | null;

export function SocialStoriesGallery({ className = '', ...props }: SocialStoriesGalleryProps) {
  const [exporting, setExporting] = useState<ExportingStory>(null);
  const { dataIso, isDark, lingua } = props;

  const getStoryNode = (variant: SocialStoryVariant) => document.querySelector<HTMLElement>(
    `[data-social-story="${variant}"][data-social-story-root]`,
  );

  const downloadVariant = useCallback(async (variant: SocialStoryVariant) => {
    const source = getStoryNode(variant);
    if (!source || exporting) return;
    setExporting(variant);
    try {
      await downloadSocialStory(source, storyFilename(variant, dataIso), isDark);
    } catch (error) {
      console.error('Errore export Story:', error);
    } finally {
      setExporting(null);
    }
  }, [dataIso, exporting, isDark]);

  const downloadAll = useCallback(async () => {
    if (exporting) return;
    setExporting('all');
    try {
      const stories = STORY_VARIANTS
        .map((variant) => {
          const source = getStoryNode(variant);
          return source ? { source, filename: storyFilename(variant, dataIso) } : null;
        })
        .filter((story): story is { source: HTMLElement; filename: string } => Boolean(story));
      await downloadSocialStories(stories, isDark);
    } catch (error) {
      console.error('Errore export Stories:', error);
    } finally {
      setExporting(null);
    }
  }, [dataIso, exporting, isDark]);

  return (
    <div className={`social-stories-gallery ${className}`} aria-busy={Boolean(exporting)}>
      <div className="social-stories-gallery-grid">
        {STORY_VARIANTS.map((variant) => {
          const displayLabel = storyDisplayLabel(variant, lingua);
          return (
            <article className="social-story-option" key={variant} aria-label={storyLabel(variant, lingua)}>
              <div className="social-story-option-heading">
                {displayLabel ? <h3>{displayLabel}</h3> : null}
                <span>9:16</span>
              </div>
              <SocialStoryPreview>
                <SocialStorySheet variant={variant} {...props} />
              </SocialStoryPreview>
              <button
                type="button"
                className="social-story-download-button"
                disabled={Boolean(exporting)}
                onClick={() => void downloadVariant(variant)}
              >
                <Download aria-hidden="true" strokeWidth={1.65} />
                <span>{exporting === variant ? t('socialStoryPreparing', lingua) : t('socialStoryDownload', lingua)}</span>
              </button>
            </article>
          );
        })}
      </div>
      <button
        type="button"
        className="social-stories-download-all"
        disabled={Boolean(exporting)}
        onClick={() => void downloadAll()}
      >
        <Images aria-hidden="true" strokeWidth={1.55} />
        <span>{exporting === 'all' ? t('socialStoryPreparing', lingua) : t('socialStoryDownloadAll', lingua)}</span>
      </button>
    </div>
  );
}

export function SocialStoriesModal({
  isOpen,
  onClose,
  ...props
}: SocialStoriesGalleryProps & { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const title = useMemo(() => t('socialStoriesTitle', props.lingua), [props.lingua]);
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className={`social-stories-overlay${props.isDark ? ' is-dark' : ''}`} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className={`${garamond.className} social-stories-dialog`} role="dialog" aria-modal="true" aria-labelledby="social-stories-dialog-title">
        <header className="social-stories-dialog-header">
          <div>
            <p className="social-stories-dialog-kicker">9:16 · PNG</p>
            <h2 id="social-stories-dialog-title">{title}</h2>
          </div>
          <button type="button" className="social-stories-close" aria-label={t('close', props.lingua)} onClick={onClose}>
            <X aria-hidden="true" strokeWidth={1.45} />
          </button>
        </header>
        <SocialStoriesGallery {...props} />
      </div>
    </div>,
    document.body,
  );
}
