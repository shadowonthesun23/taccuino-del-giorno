'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, Binoculars, BookOpen, Church, Download, Eye, Feather, Moon, Music, Palette, Sparkles, Telescope, Type } from 'lucide-react';
import type { ApodData, DatiTaccuino, LanguageCode, OperaGiorno } from '@/lib/types';
import type { SeasonalArtwork } from '@/lib/seasonal-artwork';
import type { SkyRegion, VisiblePlanet } from '@/lib/visible-planets';
import { getMoonPhase } from '@/lib/astronomy';
import { formatExLibrisDate, getDayOfYearInfo, getInitials } from '@/lib/date-utils';
import { getImageLoadingProps, proxiedImageUrl } from '@/lib/browser-utils';
import { SKY_REGION_STORAGE_KEY } from '@/lib/constants';
import { t } from '@/lib/translation';
import { garamond, masterSignature } from '@/lib/fonts';

const eagerImageProps = getImageLoadingProps(true);

function getFirstSentence(text: string) {
  return text.match(/^[\s\S]*?[.!?](?=\s|$)/u)?.[0]?.trim() || text.trim();
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
}) {
  const sheetRef = useRef<HTMLElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [failedMedia, setFailedMedia] = useState<Set<string>>(() => new Set());
  const [visiblePlanets, setVisiblePlanets] = useState<VisiblePlanet[] | null>(null);
  const moon = getMoonPhase(dataIso);
  const moonLabel = moonLabels[moon.phase]?.[lingua] ?? moonLabels[moon.phase]?.EN ?? t('moon', lingua);
  const { day: dayOfYear, total: totalDays } = getDayOfYearInfo(dataIso);
  const authorImageUrl = proxiedImageUrl(data.foto_autore_url);
  const artworkImageUrl = proxiedImageUrl(opera?.immagine_url || opera?.immagine_url_hd);
  const authorImageAvailable = Boolean(authorImageUrl) && !failedMedia.has(authorImageUrl);
  const artworkImageAvailable = Boolean(artworkImageUrl) && !failedMedia.has(artworkImageUrl);
  const musicCoverAvailable = musicCover !== null && !failedMedia.has(musicCover);
  const seasonalArtworkImageAvailable = Boolean(seasonalArtwork?.imageUrl && !failedMedia.has(seasonalArtwork.imageUrl));
  const apodImageUrl = proxiedImageUrl(apod?.thumbnail_url || apod?.url);
  const apodImageAvailable = Boolean(apodImageUrl) && !failedMedia.has(apodImageUrl);
  const authorDescription = getFirstSentence(data.breve_descrizione);
  const saintOfTheDay = data.santi[0];

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

  const downloadPlate = useCallback(async () => {
    if (!sheetRef.current || isExporting) return;
    setIsExporting(true);
    let exportFrame: HTMLDivElement | null = null;

    try {
      await document.fonts.ready;
      const { toPng } = await import('html-to-image');
      const clone = sheetRef.current.cloneNode(true) as HTMLElement;
      clone.removeAttribute('id');
      clone.classList.add('daily-correspondences-export');
      clone.querySelectorAll('[data-export-ignore]').forEach((node) => node.remove());

      exportFrame = document.createElement('div');
      exportFrame.className = `${garamond.className} correspondence-export-frame ${isDark ? 'is-dark' : ''}`;
      exportFrame.style.position = 'fixed';
      exportFrame.style.left = '0';
      exportFrame.style.top = '0';
      exportFrame.style.width = '1080px';
      exportFrame.style.height = '1920px';
      exportFrame.style.zIndex = '-1';
      exportFrame.style.pointerEvents = 'none';
      exportFrame.appendChild(clone);
      document.body.appendChild(exportFrame);

      const dataUrl = await toPng(exportFrame, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `corrispondenze-${dataIso}.png`;
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
    <section id="corrispondenze" className={`daily-correspondences ${isDark ? 'is-dark' : ''}`} aria-labelledby="correspondences-title">
      <article ref={sheetRef} className={`daily-correspondences-sheet ${isDark ? 'is-dark' : ''}`}>
        <header className="daily-correspondences-header">
          <span className="daily-correspondences-kicker">{t('correspondencesTitle', lingua)}</span>
          <span className={`${masterSignature.className} daily-correspondences-export-title`}>{t('dayTitle', lingua)}</span>
          <span className="daily-correspondences-edition">{t('edition', lingua)} {dayOfYear}/{totalDays}</span>
        </header>

        <div className="daily-correspondences-intro">
          <p>{t('correspondencesKicker', lingua)}</p>
          <h2 id="correspondences-title">{t('correspondencesLead', lingua)} <span>{data.parola_giorno.parola}</span></h2>
          <p className="daily-correspondences-copy">{t('correspondencesCopy', lingua)}</p>
        </div>

        <div className="daily-correspondences-grid">
          <button type="button" className="correspondence-author" onClick={() => scrollTo('autore')}>
            <span className="correspondence-author-label"><Feather aria-hidden="true" />{t('correspondenceAuthor', lingua)}</span>
            {authorImageAvailable ? (
                /* eslint-disable-next-line @next/next/no-img-element -- dynamic proxied media must remain usable by the DOM export */
              <img draggable={false} src={authorImageUrl} alt="" onError={() => markMediaUnavailable(authorImageUrl)} {...eagerImageProps} />
            ) : (
              <span className="correspondence-author-empty"><Feather aria-hidden="true" /><small>{t('correspondencePortraitUnavailable', lingua)}</small></span>
            )}
            <span className="correspondence-author-caption"><strong>{data.autore_giorno}</strong><em>{authorDescription}</em></span>
          </button>

          <button type="button" className="correspondence-entry correspondence-word" onClick={() => scrollTo('parola')}>
            <span className="correspondence-entry-label"><Type aria-hidden="true" />{t('correspondenceWord', lingua)}</span>
            <strong>{data.parola_giorno.parola}</strong>
            <em>{data.parola_giorno.etimologia}</em>
          </button>

          {saintOfTheDay ? (
            <button type="button" className="correspondence-entry correspondence-saint" onClick={() => scrollTo('santi')}>
              <span className="correspondence-entry-label"><Church aria-hidden="true" />{t('correspondenceSaint', lingua)}</span>
              <span className="correspondence-entry-content">
                <span className="correspondence-saint-mark" aria-hidden="true"><Church /></span>
                <span><strong>{saintOfTheDay.nome}</strong><em>{saintOfTheDay.ruolo}</em></span>
              </span>
            </button>
          ) : null}

          <button type="button" className="correspondence-entry correspondence-artwork" onClick={() => scrollTo('opera')}>
            <span className="correspondence-entry-label"><Palette aria-hidden="true" />{t('correspondenceArtwork', lingua)}</span>
            <span className="correspondence-entry-content">
              {artworkImageAvailable ? (
                /* eslint-disable-next-line @next/next/no-img-element -- dynamic proxied media must remain usable by the DOM export */
                <img draggable={false} src={artworkImageUrl} alt={opera ? `${opera.titolo}, ${opera.artista}` : ''} onError={() => markMediaUnavailable(artworkImageUrl)} {...eagerImageProps} />
              ) : <span className="correspondence-missing-media" title={t('correspondenceArtworkUnavailable', lingua)}><Palette aria-hidden="true" /></span>}
              <span><strong>{opera?.titolo ?? t('correspondenceArtworkUnavailable', lingua)}</strong>{opera ? <em>{opera.artista}{opera.anno ? ` · ${opera.anno}` : ''}</em> : null}</span>
            </span>
          </button>

          <button type="button" className="correspondence-entry correspondence-music" onClick={() => scrollTo('musica')}>
            <span className="correspondence-entry-label"><Music aria-hidden="true" />{t('correspondenceMusic', lingua)}</span>
            <span className="correspondence-entry-content">
              {musicCoverAvailable ? (
                /* eslint-disable-next-line @next/next/no-img-element -- music cover is a runtime URL and is exported from the DOM */
                <img draggable={false} src={musicCover} alt="" onError={() => markMediaUnavailable(musicCover)} {...eagerImageProps} />
              ) : <span className="correspondence-missing-media" title={t('correspondenceMusicCoverUnavailable', lingua)}><Music aria-hidden="true" /></span>}
              <span><strong>{data.musica.brano}</strong><em>{data.musica.autore}</em></span>
            </span>
          </button>

          <button type="button" className="correspondence-entry correspondence-sky" onClick={() => scrollTo(skyTargetId)}>
            <span className="correspondence-entry-label"><Moon aria-hidden="true" />{t('correspondenceSky', lingua)}</span>
            <span className="correspondence-entry-content">
              <span className={`correspondence-moon phase-${moon.phase}`}><Moon aria-hidden="true" /></span>
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
            </button>
          ) : null}
        </div>

        {seasonalArtwork ? (
          <button type="button" className="daily-correspondences-seasonal" onClick={openSeasonalArtwork}>
            <span className="daily-correspondences-seasonal-label">{t('seasonalArtwork', lingua)}</span>
            <span className="daily-correspondences-seasonal-preview" aria-hidden="true">
              {seasonalArtworkImageAvailable ? (
                /* eslint-disable-next-line @next/next/no-img-element -- the seasonal artwork is local editorial media and must remain available to the DOM export */
                <img draggable={false} src={seasonalArtwork.imageUrl} alt="" onError={() => markMediaUnavailable(seasonalArtwork.imageUrl)} {...eagerImageProps} />
              ) : <Palette aria-hidden="true" />}
            </span>
            <span className="daily-correspondences-seasonal-copy"><strong>{seasonalArtwork.title}</strong><em>{seasonalArtwork.artist}{seasonalArtwork.year ? ` · ${seasonalArtwork.year}` : ''}</em></span>
            <small>{t('seasonalArtworkOpen', lingua)} <ArrowDown aria-hidden="true" strokeWidth={1.7} /></small>
          </button>
        ) : null}

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
          </div>
        </div>
      </article>
    </section>
  );
}
