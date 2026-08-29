'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  ApodData,
  DatiTaccuino,
  LanguageCode,
  OperaGiorno,
  ReadingMediaResult,
  SaintArtworkResult,
} from '@/lib/types';
import type { SaintArtwork } from '@/lib/saint-artwork';
import type { SeasonalArtwork } from '@/lib/seasonal-artwork';
import type { EditorialMediaCrops, EditorialMediaOverrides } from '@/lib/editorial-media';
import {
  getEditorialMediaDocument,
  sanitizeEditorialMediaCrops,
  sanitizeEditorialMediaOverrides,
} from '@/lib/editorial-media';
import { getDayOfYearInfo, getRomeDateIso, getSeason, isSeasonId } from '@/lib/date-utils';
import { proxiedImageUrl } from '@/lib/browser-utils';
import { getLocalizedSeasonalArtwork, getSeasonalArtwork } from '@/lib/seasonal-artwork';
import { DAILY_SEAL_COLORS } from '@/lib/constants';
import { garamond } from '@/lib/fonts';
import { SocialStoryPreview, SocialStorySheet, type SocialStoryVariant } from '@/app/components/SocialStories';

interface PreviewPayload {
  data: DatiTaccuino;
  opera: OperaGiorno | null;
  apod: ApodData | null;
  saintArtwork: SaintArtworkResult | null;
  readingMedia: ReadingMediaResult;
  musicCover: string | null;
  editorialMedia: EditorialMediaOverrides;
  editorialMediaCrops: EditorialMediaCrops;
  dataIso: string;
  lingua: LanguageCode;
  isDark: boolean;
  seasonalArtwork: SeasonalArtwork | null;
  sealColor: string;
}

const VARIANTS: SocialStoryVariant[] = ['all-in-one', 'things', 'carry'];

function isLanguageCode(value: string | null): value is LanguageCode {
  return value === 'IT' || value === 'EN' || value === 'FR' || value === 'DE' || value === 'ES' || value === 'PT';
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { cache: 'no-store' });
  if (response.status === 204) return null;
  if (!response.ok) throw new Error(`Impossibile caricare ${url}`);
  return response.json() as Promise<T>;
}

function resolveEditorialMedia(
  dataIso: string,
  data: DatiTaccuino & { editorial_media?: unknown; editorial_media_crops?: unknown },
) {
  const remoteOverrides = sanitizeEditorialMediaOverrides(data.editorial_media);
  const remoteCrops = sanitizeEditorialMediaCrops(data.editorial_media_crops);
  const localDocument = getEditorialMediaDocument(dataIso);
  const hasRemoteMedia = Object.keys(remoteOverrides).length > 0 || Object.keys(remoteCrops).length > 0;
  return {
    overrides: hasRemoteMedia ? remoteOverrides : localDocument.overrides,
    crops: hasRemoteMedia ? remoteCrops : localDocument.crops,
  };
}

function syntheticSaintArtwork(data: DatiTaccuino, imageUrl: string): SaintArtworkResult | null {
  const saintName = data.santi[0]?.nome?.trim() ?? '';
  if (!saintName || !imageUrl) return null;
  return {
    imageUrl,
    sourceUrl: imageUrl,
    title: `Immagine di ${saintName}`,
    author: '',
    license: 'Inserita manualmente',
    licenseUrl: imageUrl,
    source: 'manual',
    saintName,
  };
}

export default function SocialPreviewClient() {
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const requestedDate = params.get('data');
    const dataIso = requestedDate && /^\d{4}-\d{2}-\d{2}$/u.test(requestedDate)
      ? requestedDate
      : getRomeDateIso();
    const requestedLanguage = params.get('lang')?.toUpperCase() ?? null;
    const lingua: LanguageCode = isLanguageCode(requestedLanguage) ? requestedLanguage : 'IT';
    const requestedTheme = params.get('theme');
    const isDark = requestedTheme === 'dark'
      ? true
      : requestedTheme === 'light'
        ? false
        : document.documentElement.dataset.theme === 'dark';
    const seasonOverride = params.get('season');

    async function load() {
      try {
        const [rawData, opera] = await Promise.all([
          fetchJson<DatiTaccuino & { editorial_media?: unknown; editorial_media_crops?: unknown }>(`/api/oggi?data=${encodeURIComponent(dataIso)}`),
          fetchJson<OperaGiorno>(`/api/opera?data=${encodeURIComponent(dataIso)}`),
        ]);
        if (!rawData) throw new Error('Nessun contenuto per questa data.');

        const editorial = resolveEditorialMedia(dataIso, rawData);
        const data = editorial.overrides.autore
          ? { ...rawData, foto_autore_url: editorial.overrides.autore }
          : rawData;
        const resolvedOpera = opera && editorial.overrides.opera
          ? { ...opera, immagine_url: editorial.overrides.opera, immagine_url_hd: editorial.overrides.opera }
          : opera;
        const saintName = data.santi[0]?.nome?.trim() ?? '';

        const [apod, fetchedSaint, readingMedia, musicCoverResponse] = await Promise.all([
          fetchJson<ApodData>(`/api/apod?data=${encodeURIComponent(dataIso)}`).catch(() => null),
          editorial.overrides.santi
            ? Promise.resolve(syntheticSaintArtwork(data, editorial.overrides.santi))
            : saintName
              ? fetchJson<SaintArtwork>(`/api/santo-immagine?nome=${encodeURIComponent(saintName)}`)
                .then((artwork) => artwork ? { ...artwork, saintName } : null)
                .catch(() => null)
              : Promise.resolve(null),
          fetchJson<ReadingMediaResult>(`/api/reading-media?autore=${encodeURIComponent(data.poesia.autore.trim())}`).catch(() => null),
          editorial.overrides.musica
            ? Promise.resolve({ imageUrl: editorial.overrides.musica })
            : fetchJson<{ imageUrl?: string }>(`/api/music-cover?title=${encodeURIComponent(data.musica.brano)}&artist=${encodeURIComponent(data.musica.autore)}${data.musica.chiave_ricerca ? `&query=${encodeURIComponent(data.musica.chiave_ricerca)}` : ''}`).catch(() => null),
        ]);

        if (cancelled) return;
        const season = isSeasonId(seasonOverride) ? seasonOverride : getSeason(dataIso);
        const seasonalArtwork = getLocalizedSeasonalArtwork(getSeasonalArtwork(season, dataIso), lingua) ?? null;
        const { day } = getDayOfYearInfo(dataIso);
        setPayload({
          data,
          opera: resolvedOpera,
          apod,
          saintArtwork: fetchedSaint,
          readingMedia: readingMedia ?? { poesia: null, bibbia: null },
          musicCover: editorial.overrides.musica || proxiedImageUrl(musicCoverResponse?.imageUrl).trim() || null,
          editorialMedia: editorial.overrides,
          editorialMediaCrops: editorial.crops,
          dataIso,
          lingua,
          isDark,
          seasonalArtwork,
          sealColor: DAILY_SEAL_COLORS[(day - 1) % DAILY_SEAL_COLORS.length],
        });
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Errore inatteso');
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const title = useMemo(() => 'Social Stories Preview', []);
  if (error) {
    return <main className={`${garamond.className} social-preview-page`}><p>{error}</p></main>;
  }
  if (!payload) {
    return <main className={`${garamond.className} social-preview-page`}><p>Caricamento delle tavole…</p></main>;
  }

  return (
    <main className={`${garamond.className} social-preview-page`}>
      <header className="social-preview-page-header">
        <p>ROUTE TECNICA · {payload.dataIso}</p>
        <h1>{title}</h1>
        <p>Tre tavole 9:16 alimentate dai contenuti reali del giorno. Aggiungi <code>?data=YYYY-MM-DD</code> per confrontare un’altra data.</p>
      </header>
      <div className="social-preview-page-grid">
        {VARIANTS.map((variant) => (
          <section className="social-preview-page-option" key={variant}>
            <h2>{variant === 'all-in-one' ? 'Story 1 · All-in-one' : variant === 'things' ? 'Story 2 · Le cose del giorno' : 'Story 3 · Da portare con sé'}</h2>
            <SocialStoryPreview>
              <SocialStorySheet variant={variant} {...payload} />
            </SocialStoryPreview>
          </section>
        ))}
      </div>
    </main>
  );
}
