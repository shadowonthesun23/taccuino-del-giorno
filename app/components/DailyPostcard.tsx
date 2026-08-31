'use client';

import { useCallback, useEffect, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Sparkles, Sun, Sunrise, Sunset, X } from 'lucide-react';
import { MoonPhaseGlyph } from '@/components/ui/Doodles';
import type { LanguageCode, MoonPhaseId, SeasonId } from '@/lib/types';
import type { SkyRegion, VisiblePlanet } from '@/lib/visible-planets';
import { SKY_REGION_OPTIONS } from '@/lib/constants';
import { t } from '@/lib/translation';
import { formatBookmarkDate, formatExLibrisDate, formatUtcDate, getDayOfYearInfo, getSeason } from '@/lib/date-utils';
import { getMoonPhase, getNextFullMoonDate } from '@/lib/astronomy';
import { getImageLoadingProps } from '@/lib/browser-utils';
import { getLocalizedSeasonalArtwork, getSeasonalArtwork, type SeasonalArtwork } from '@/lib/seasonal-artwork';

const eagerImageProps = getImageLoadingProps(true);

const SEASON_LABELS: Record<SeasonId, Record<LanguageCode, string>> = {
  spring: { IT: 'Primavera', EN: 'Spring', FR: 'Printemps', DE: 'Frühling', ES: 'Primavera', PT: 'Primavera' },
  summer: { IT: 'Estate', EN: 'Summer', FR: 'Été', DE: 'Sommer', ES: 'Verano', PT: 'Verão' },
  autumn: { IT: 'Autunno', EN: 'Autumn', FR: 'Automne', DE: 'Herbst', ES: 'Otoño', PT: 'Outono' },
  winter: { IT: 'Inverno', EN: 'Winter', FR: 'Hiver', DE: 'Winter', ES: 'Invierno', PT: 'Inverno' },
};

const MOON_LABELS: Record<MoonPhaseId, Record<LanguageCode, string>> = {
  new: { IT: 'Luna nuova', EN: 'New moon', FR: 'Nouvelle lune', DE: 'Neumond', ES: 'Luna nueva', PT: 'Lua nova' },
  'waxing-crescent': { IT: 'Luna crescente', EN: 'Waxing crescent', FR: 'Premier croissant', DE: 'Zunehmende Sichel', ES: 'Luna creciente', PT: 'Lua crescente' },
  'first-quarter': { IT: 'Primo quarto', EN: 'First quarter', FR: 'Premier quartier', DE: 'Erstes Viertel', ES: 'Cuarto creciente', PT: 'Quarto crescente' },
  'waxing-gibbous': { IT: 'Gibbosa crescente', EN: 'Waxing gibbous', FR: 'Lune gibbeuse croissante', DE: 'Zunehmender Dreiviertelmond', ES: 'Gibosa creciente', PT: 'Gibosa crescente' },
  full: { IT: 'Luna piena', EN: 'Full moon', FR: 'Pleine lune', DE: 'Vollmond', ES: 'Luna llena', PT: 'Lua cheia' },
  'waning-gibbous': { IT: 'Gibbosa calante', EN: 'Waning gibbous', FR: 'Lune gibbeuse décroissante', DE: 'Abnehmender Dreiviertelmond', ES: 'Gibosa menguante', PT: 'Gibosa minguante' },
  'last-quarter': { IT: 'Ultimo quarto', EN: 'Last quarter', FR: 'Dernier quartier', DE: 'Letztes Viertel', ES: 'Cuarto menguante', PT: 'Quarto minguante' },
  'waning-crescent': { IT: 'Luna calante', EN: 'Waning crescent', FR: 'Dernier croissant', DE: 'Abnehmende Sichel', ES: 'Luna menguante', PT: 'Lua minguante' },
};

const POSTCARD_COPY: Record<LanguageCode, {
  open: string;
  close: string;
  flipForward: string;
  flipBack: string;
  sunrise: string;
  sunset: string;
  daylight: string;
  address: string;
  openSource: string;
  skyOfDay: string;
  dayToKeep: string;
  postcardFrom: string;
  dayWord: string;
  dailyPostcard: string;
  city: string;
}> = {
  IT: {
    open: 'Apri la cartolina del giorno',
    close: 'Chiudi la cartolina',
    flipForward: 'Clicca sulla cartolina per girarla',
    flipBack: 'Clicca per tornare al fronte',
    sunrise: 'Alba',
    sunset: 'Tramonto',
    daylight: 'Luce del giorno',
    address: 'A:',
    openSource: 'Apri la scheda dell’opera',
    skyOfDay: 'Cielo del giorno',
    dayToKeep: 'Il giorno da custodire',
    postcardFrom: 'Una cartolina dal',
    dayWord: 'giorno',
    dailyPostcard: 'Cartolina del giorno',
    city: 'Roma',
  },
  EN: {
    open: 'Open the postcard of the day',
    close: 'Close postcard',
    flipForward: 'Click the postcard to turn it over',
    flipBack: 'Click to return to the front',
    sunrise: 'Sunrise',
    sunset: 'Sunset',
    daylight: 'Daylight',
    address: 'To:',
    openSource: 'Open the artwork record',
    skyOfDay: 'Sky of the day',
    dayToKeep: 'A day to keep',
    postcardFrom: 'A postcard from',
    dayWord: 'day',
    dailyPostcard: 'Postcard of the day',
    city: 'Rome',
  },
  FR: {
    open: 'Ouvrir la carte du jour',
    close: 'Fermer la carte',
    flipForward: 'Cliquer sur la carte pour la retourner',
    flipBack: 'Cliquer pour revenir au recto',
    sunrise: 'Lever du soleil',
    sunset: 'Coucher du soleil',
    daylight: 'Lumière du jour',
    address: 'À:',
    openSource: 'Ouvrir la fiche de l’œuvre',
    skyOfDay: 'Ciel du jour',
    dayToKeep: 'Un jour à garder',
    postcardFrom: 'Une carte du',
    dayWord: 'jour',
    dailyPostcard: 'Carte du jour',
    city: 'Rome',
  },
  DE: {
    open: 'Tagespostkarte öffnen',
    close: 'Postkarte schließen',
    flipForward: 'Klicken, um die Karte umzudrehen',
    flipBack: 'Klicken, um zur Vorderseite zurückzukehren',
    sunrise: 'Sonnenaufgang',
    sunset: 'Sonnenuntergang',
    daylight: 'Tageslicht',
    address: 'An:',
    openSource: 'Werkdatensatz öffnen',
    skyOfDay: 'Himmel des Tages',
    dayToKeep: 'Ein Tag zum Bewahren',
    postcardFrom: 'Eine Postkarte vom',
    dayWord: 'Tag',
    dailyPostcard: 'Postkarte des Tages',
    city: 'Rom',
  },
  ES: {
    open: 'Abrir la postal del día',
    close: 'Cerrar postal',
    flipForward: 'Haz clic en la postal para darle la vuelta',
    flipBack: 'Haz clic para volver al frente',
    sunrise: 'Amanecer',
    sunset: 'Atardecer',
    daylight: 'Luz del día',
    address: 'A:',
    openSource: 'Abrir la ficha de la obra',
    skyOfDay: 'Cielo del día',
    dayToKeep: 'Un día para guardar',
    postcardFrom: 'Una postal del',
    dayWord: 'día',
    dailyPostcard: 'Postal del día',
    city: 'Roma',
  },
  PT: {
    open: 'Abrir o postal do dia',
    close: 'Fechar postal',
    flipForward: 'Clique no postal para o virar',
    flipBack: 'Clique para voltar à frente',
    sunrise: 'Nascer do sol',
    sunset: 'Pôr do sol',
    daylight: 'Luz do dia',
    address: 'Para:',
    openSource: 'Abrir a ficha da obra',
    skyOfDay: 'Céu do dia',
    dayToKeep: 'Um dia para guardar',
    postcardFrom: 'Um postal do',
    dayWord: 'dia',
    dailyPostcard: 'Postal do dia',
    city: 'Roma',
  },
};

function withoutColon(value: string): string {
  return value.replace(/:\s*$/, '');
}

function getCity(region: SkyRegion, lingua: LanguageCode): string {
  const selected = SKY_REGION_OPTIONS.find((option) => option.id === region);
  if (!selected) return POSTCARD_COPY[lingua].city;
  return lingua === 'IT' ? selected.cityIT : selected.cityEN;
}

function PostcardFront({
  artwork,
  dateLabel,
  seasonLabel,
  day,
  total,
  hint,
  showHint,
  ariaHidden,
}: {
  artwork?: SeasonalArtwork;
  dateLabel: string;
  seasonLabel: string;
  day: number;
  total: number;
  hint: string;
  showHint: boolean;
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
          <strong>{artwork?.title || 'Day Atlas'}</strong>
          <em>{artwork ? `${artwork.artist} · ${artwork.year}` : 'Il giorno da custodire'}</em>
        </span>
        <span className="daily-postcard-front-brand">
          <strong>DAY ATLAS</strong>
          <em>Il giorno da custodire</em>
        </span>
      </span>
      {showHint ? <span className="daily-postcard-front-hint"><Sparkles aria-hidden="true" strokeWidth={1.5} />{hint}</span> : null}
    </div>
  );
}

function PostcardBack({
  dataIso,
  lingua,
  artwork,
  sourceUrl,
  dateLabel,
  day,
  total,
  moonPhase,
  moonIllumination,
  moonLabel,
  nextFullMoonLabel,
  solarTimes,
  daylight,
  planets,
  skyRegion,
  onSelectSkyRegion,
  ariaHidden,
}: {
  dataIso: string;
  lingua: LanguageCode;
  artwork?: SeasonalArtwork;
  sourceUrl: string;
  dateLabel: string;
  day: number;
  total: number;
  moonPhase: MoonPhaseId;
  moonIllumination: number;
  moonLabel: string;
  nextFullMoonLabel: string;
  solarTimes: { sunrise: string; sunset: string } | null;
  daylight: string | null;
  planets: VisiblePlanet[] | null;
  skyRegion: SkyRegion;
  onSelectSkyRegion: (region: SkyRegion) => void;
  ariaHidden?: boolean;
}) {
  const copy = POSTCARD_COPY[lingua];
  const astronomyLabel = withoutColon(t('almanac', lingua));
  const moonRowLabel = withoutColon(t('moon', lingua));
  const fullMoonRowLabel = withoutColon(t('fullMoon', lingua));
  const daylightRowLabel = withoutColon(t('daylight', lingua));
  const planetsLabel = t('planets', lingua);
  const romanDate = formatExLibrisDate(dataIso).replaceAll(' · ', ' ');
  const qrFallback = 'https://dayatlas.vercel.app/';

  return (
    <div className="daily-postcard-face daily-postcard-back" aria-hidden={ariaHidden}>
      <span className="daily-postcard-back-grain" aria-hidden="true" />
      <header className="daily-postcard-back-header">
        <strong>{astronomyLabel} · {romanDate}</strong>
        <span>DAY ATLAS · {day}/{total}</span>
      </header>

      <div className="daily-postcard-back-body">
        <section className="daily-postcard-astronomy" aria-label={copy.skyOfDay}>
          <div className="daily-postcard-section-heading">
            <span>{copy.skyOfDay}</span>
            <span className="daily-postcard-heading-rule" aria-hidden="true" />
          </div>
          <div className="daily-postcard-astronomy-rows">
            <div className="daily-postcard-astro-row">
              <span className="daily-postcard-astro-icon daily-postcard-moon-icon"><MoonPhaseGlyph phase={moonPhase} /></span>
              <span><em>{moonRowLabel}</em><strong>{moonLabel} · {moonIllumination}%</strong></span>
            </div>
            <div className="daily-postcard-astro-row">
              <span className="daily-postcard-astro-icon daily-postcard-full-moon-icon" aria-hidden="true" />
              <span><em>{fullMoonRowLabel}</em><strong>{nextFullMoonLabel}</strong></span>
            </div>
            <div className="daily-postcard-astro-row">
              <span className="daily-postcard-astro-icon"><Sunrise aria-hidden="true" strokeWidth={1.5} /></span>
              <span><em>{copy.sunrise}</em><strong>{solarTimes?.sunrise || '…'}</strong></span>
            </div>
            <div className="daily-postcard-astro-row">
              <span className="daily-postcard-astro-icon"><Sunset aria-hidden="true" strokeWidth={1.5} /></span>
              <span><em>{copy.sunset}</em><strong>{solarTimes?.sunset || '…'}</strong></span>
            </div>
            <div className="daily-postcard-astro-row">
              <span className="daily-postcard-astro-icon"><Sun aria-hidden="true" strokeWidth={1.5} /></span>
              <span><em>{daylightRowLabel}</em><strong>{daylight || '…'}</strong></span>
            </div>
          </div>

          <div className="daily-postcard-planets">
            <div className="daily-postcard-planets-heading">
              <span><Sparkles aria-hidden="true" strokeWidth={1.35} />{planetsLabel}</span>
              <span className="daily-postcard-region-switcher" role="group" aria-label={copy.skyOfDay}>
                {SKY_REGION_OPTIONS.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    className={region.id === skyRegion ? 'is-active' : ''}
                    onClick={() => onSelectSkyRegion(region.id)}
                  >
                    {region.id === 'north' ? 'N' : region.id === 'south' ? 'S' : 'C'}
                  </button>
                ))}
              </span>
            </div>
            <span className="daily-postcard-region-city">{getCity(skyRegion, lingua)}</span>
            <div className="daily-postcard-planet-list" aria-live="polite">
              {planets === null ? (
                <em>{t('readingSky', lingua)}</em>
              ) : planets.length > 0 ? planets.map((planet) => (
                <span key={planet.body} className="daily-postcard-planet-row">
                  <strong>{planet.name}</strong>
                  <span>{planet.direction}</span>
                  <span>{planet.bestTime}</span>
                </span>
              )) : (
                <em>{t('noPlanets', lingua)}</em>
              )}
            </div>
          </div>
        </section>

        <span className="daily-postcard-back-divider" aria-hidden="true"><Sparkles strokeWidth={1.25} /></span>

        <section className="daily-postcard-postal" aria-label={copy.dailyPostcard}>
          <div className="daily-postcard-postal-top">
            <div className="daily-postcard-stamp" aria-label={`DAY ATLAS ${day}/${total}`}>
              <span>DAY ATLAS</span>
              <strong>{day}/{total}</strong>
            </div>
            <a className="daily-postcard-qr-link" href={sourceUrl || qrFallback} target="_blank" rel="noopener noreferrer">
              <span className="daily-postcard-qr">
                <QRCodeSVG value={sourceUrl || qrFallback} size={76} level="H" marginSize={2} bgColor="#f2eadb" fgColor="#2a241d" title={`${t('openDay', lingua)}: ${dateLabel}`} />
              </span>
              <small>{t('openDay', lingua)}</small>
            </a>
          </div>
          <div className="daily-postcard-postmark" aria-hidden="true">
            <span>DAY ATLAS</span>
            <strong>{copy.dayToKeep}</strong>
          </div>
          <div className="daily-postcard-address">
            <span>{copy.address}</span>
            <span className="daily-postcard-address-lines" aria-hidden="true"><i /><i /><i /></span>
          </div>
          <a className="daily-postcard-artwork-source" href={artwork?.sourceUrl || sourceUrl || qrFallback} target="_blank" rel="noopener noreferrer">
            {artwork ? `${artwork.title} · ${artwork.collection}` : dateLabel}
          </a>
        </section>
      </div>

      <footer className="daily-postcard-back-footer">
        <span>{lingua === 'IT' ? 'Ogni giorno è un luogo da esplorare.' : lingua === 'EN' ? 'Every day is a place to explore.' : copy.dayToKeep}</span>
        <strong>DAY ATLAS<em>{copy.dayToKeep}</em></strong>
        <span>{copy.postcardFrom} {day}° {copy.dayWord}.<em>{dateLabel}</em></span>
      </footer>
    </div>
  );
}

interface PlanetReading {
  key: string;
  planets: VisiblePlanet[];
  daylight: string;
  solarTimes: { sunrise: string; sunset: string };
}

export default function DailyPostcard({
  dataIso,
  lingua,
  isDark,
}: {
  dataIso: string;
  lingua: LanguageCode;
  isDark: boolean;
}) {
  const [desktopEnabled, setDesktopEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [skyRegion, setSkyRegion] = useState<SkyRegion>('center');
  const [dayPermalink, setDayPermalink] = useState('');
  const [planetReading, setPlanetReading] = useState<PlanetReading | null>(null);

  const season = getSeason(dataIso);
  const seasonLabel = SEASON_LABELS[season][lingua];
  const seasonalArtwork = getLocalizedSeasonalArtwork(getSeasonalArtwork(season, dataIso), lingua);
  const dateLabel = formatBookmarkDate(dataIso, lingua);
  const { day, total } = getDayOfYearInfo(dataIso);
  const moon = getMoonPhase(dataIso);
  const moonLabel = MOON_LABELS[moon.phase][lingua];
  const nextFullMoonLabel = formatUtcDate(getNextFullMoonDate(dataIso), lingua);
  const readingKey = `${dataIso}:${skyRegion}:${lingua}`;
  const reading = planetReading?.key === readingKey ? planetReading : null;
  const sourceUrl = dayPermalink || seasonalArtwork?.sourceUrl || 'https://dayatlas.vercel.app/';
  const copy = POSTCARD_COPY[lingua];

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1180px)');
    const updateDesktopState = () => {
      const enabled = desktopQuery.matches;
      setDesktopEnabled(enabled);
      if (!enabled) {
        setIsOpen(false);
        setIsFlipped(false);
      }
    };

    updateDesktopState();
    desktopQuery.addEventListener('change', updateDesktopState);
    return () => desktopQuery.removeEventListener('change', updateDesktopState);
  }, []);

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

  useEffect(() => {
    let cancelled = false;

    void import('@/lib/visible-planets').then(({ getDaylightDuration, getSolarDayTimes, getVisiblePlanets }) => {
      if (cancelled) return;
      setPlanetReading({
        key: readingKey,
        planets: getVisiblePlanets(dataIso, skyRegion, lingua),
        daylight: getDaylightDuration(dataIso),
        solarTimes: getSolarDayTimes(dataIso, lingua),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [dataIso, lingua, readingKey, skyRegion]);

  const closePostcard = useCallback(() => {
    setIsOpen(false);
    setIsFlipped(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePostcard();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePostcard, isOpen]);

  const handleCardClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest('a, button')) return;
    setIsFlipped((current) => !current);
  }, []);

  const handleCardKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest('a, button')) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setIsFlipped((current) => !current);
  }, []);

  const handleSelectSkyRegion = useCallback((region: SkyRegion) => {
    setSkyRegion(region);
  }, []);

  return (
    <aside
      className={`daily-postcard ${isDark ? 'is-dark' : ''} ${isOpen ? 'is-open' : ''}`}
      aria-hidden={!desktopEnabled}
      inert={!desktopEnabled ? true : undefined}
      aria-label={copy.dailyPostcard}
    >
      {!isOpen ? (
        <button type="button" className="daily-postcard-peek" onClick={() => setIsOpen(true)} aria-label={copy.open}>
          <PostcardFront
            artwork={seasonalArtwork}
            dateLabel={dateLabel}
            seasonLabel={seasonLabel}
            day={day}
            total={total}
            hint={copy.flipForward}
            showHint={false}
            ariaHidden
          />
        </button>
      ) : null}

      {isOpen ? (
        <>
          <button type="button" className="daily-postcard-modal-backdrop" aria-label={copy.close} onClick={closePostcard} />
          <section className="daily-postcard-dialog" role="dialog" aria-modal="true" aria-labelledby="daily-postcard-title">
            <h2 id="daily-postcard-title" className="sr-only">{copy.dailyPostcard}: {dateLabel}</h2>
            <button type="button" className="daily-postcard-close" onClick={closePostcard} aria-label={copy.close}>
              <X aria-hidden="true" strokeWidth={1.5} />
            </button>
            <div className="daily-postcard-stage">
              <div
                className={`daily-postcard-card ${isFlipped ? 'is-flipped' : ''}`}
                role="button"
                tabIndex={0}
                aria-pressed={isFlipped}
                aria-label={isFlipped ? copy.flipBack : copy.flipForward}
                onClick={handleCardClick}
                onKeyDown={handleCardKeyDown}
              >
                <PostcardFront
                  artwork={seasonalArtwork}
                  dateLabel={dateLabel}
                  seasonLabel={seasonLabel}
                  day={day}
                  total={total}
                  hint={copy.flipForward}
                  showHint
                  ariaHidden={isFlipped}
                />
                <PostcardBack
                  dataIso={dataIso}
                  lingua={lingua}
                  artwork={seasonalArtwork}
                  sourceUrl={sourceUrl}
                  dateLabel={dateLabel}
                  day={day}
                  total={total}
                  moonPhase={moon.phase}
                  moonIllumination={moon.illumination}
                  moonLabel={moonLabel}
                  nextFullMoonLabel={nextFullMoonLabel}
                  solarTimes={reading?.solarTimes || null}
                  daylight={reading?.daylight || null}
                  planets={reading?.planets || null}
                  skyRegion={skyRegion}
                  onSelectSkyRegion={handleSelectSkyRegion}
                  ariaHidden={!isFlipped}
                />
              </div>
            </div>
            <p className="daily-postcard-turn-hint"><Sparkles aria-hidden="true" strokeWidth={1.5} />{isFlipped ? copy.flipBack : copy.flipForward}</p>
          </section>
        </>
      ) : null}
    </aside>
  );
}
