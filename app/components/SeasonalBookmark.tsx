'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, FileDown, X } from 'lucide-react';
import { MoonDoodle } from '@/components/ui/Doodles';
import { garamond } from '@/lib/fonts';
import type { LanguageCode, SeasonId, MoonPhaseId } from '@/lib/types';
import type { SkyRegion, VisiblePlanet } from '@/lib/visible-planets';
import { SKY_REGION_OPTIONS, SKY_REGION_STORAGE_KEY, TICKET_DOWNLOAD_EVENT } from '@/lib/constants';
import { t } from '@/lib/translation';
import { getSeason, formatBookmarkDate, getBookmarkMonth, getDayOfYearInfo, formatUtcDate } from '@/lib/date-utils';
import { getMoonPhase, getNextFullMoonDate } from '@/lib/astronomy';
import { isMobileChromiumBrowser, blobToDataUrl } from '@/lib/browser-utils';
import { getSeasonalArtwork, getLocalizedSeasonalArtwork } from '@/lib/seasonal-artwork';

export default function SeasonalBookmark({
  dataIso,
  lingua,
  isDark,
}: {
  dataIso: string;
  lingua: LanguageCode;
  isDark: boolean;
}) {
  const ticketRef = useRef<HTMLSpanElement>(null);
  const [skyRegion, setSkyRegion] = useState<SkyRegion>('center');
  const [planetResult, setPlanetResult] = useState<{ key: string; planets: VisiblePlanet[]; daylight: string } | null>(null);
  const [dayPermalink, setDayPermalink] = useState('');
  const [exportingTicket, setExportingTicket] = useState(false);
  const [desktopTicketEnabled, setDesktopTicketEnabled] = useState(false);
  const [preparedTicketDownload, setPreparedTicketDownload] = useState<{ url: string; filename: string } | null>(null);
  const preparedTicketUrlRef = useRef<string | null>(null);
  const season = getSeason(dataIso);
  const seasonLabels: Record<SeasonId, Record<LanguageCode, string>> = {
    spring: { IT: 'Primavera', EN: 'Spring', FR: 'Printemps', DE: 'Frühling', ES: 'Primavera', PT: 'Primavera' },
    summer: { IT: 'Estate', EN: 'Summer', FR: 'Été', DE: 'Sommer', ES: 'Verano', PT: 'Verão' },
    autumn: { IT: 'Autunno', EN: 'Autumn', FR: 'Automne', DE: 'Herbst', ES: 'Otoño', PT: 'Outono' },
    winter: { IT: 'Inverno', EN: 'Winter', FR: 'Hiver', DE: 'Winter', ES: 'Invierno', PT: 'Inverno' },
  };
  const label = seasonLabels[season][lingua];
  const dateLabel = formatBookmarkDate(dataIso, lingua);
  const ticketSerial = dataIso.slice(2).replaceAll('-', '');
  const bookmarkMonth = getBookmarkMonth(dataIso);
  const moon = getMoonPhase(dataIso);
  const moonLabels: Record<MoonPhaseId, Record<LanguageCode, string>> = {
    new: { IT: 'Luna nuova', EN: 'New moon', FR: 'Nouvelle lune', DE: 'Neumond', ES: 'Luna nueva', PT: 'Lua nova' },
    'waxing-crescent': { IT: 'Luna crescente', EN: 'Waxing crescent', FR: 'Premier croissant', DE: 'Zunehmende Sichel', ES: 'Luna crescente', PT: 'Lua crescente' },
    'first-quarter': { IT: 'Primo quarto', EN: 'First quarter', FR: 'Premier quartier', DE: 'Erstes Viertel', ES: 'Cuarto crescente', PT: 'Quarto crescente' },
    'waxing-gibbous': { IT: 'Gibbosa crescente', EN: 'Waxing gibbous', FR: 'Lune gibbeuse croissante', DE: 'Zunehmender Dreiviertelmond', ES: 'Gibosa crescente', PT: 'Gibosa crescente' },
    full: { IT: 'Luna piena', EN: 'Full moon', FR: 'Pleine lune', DE: 'Vollmond', ES: 'Luna llena', PT: 'Lua cheia' },
    'waning-gibbous': { IT: 'Gibbosa calante', EN: 'Waning gibbous', FR: 'Lune gibbeuse décroissante', DE: 'Abnehmender Dreiviertelmond', ES: 'Gibosa menguante', PT: 'Gibosa minguante' },
    'last-quarter': { IT: 'Ultimo quarto', EN: 'Last quarter', FR: 'Dernier quartier', DE: 'Letztes Viertel', ES: 'Cuarto menguante', PT: 'Quarto minguante' },
    'waning-crescent': { IT: 'Luna calante', EN: 'Waning crescent', FR: 'Dernier croissant', DE: 'Abnehmende Sichel', ES: 'Luna menguante', PT: 'Lua minguante' },
  };
  const moonLabel = moonLabels[moon.phase][lingua];
  const nextFullMoonDate = getNextFullMoonDate(dataIso);
  const nextFullMoonLabel = formatUtcDate(nextFullMoonDate, lingua);
  const fullMoonAriaLabel = t('fullMoon', lingua).replace(':', '');
  const almanacLabel = t('almanac', lingua);
  const moonRowLabel = t('moon', lingua);
  const fullMoonRowLabel = t('fullMoon', lingua);
  const daylightRowLabel = t('daylight', lingua);
  const planetsLabel = t('planets', lingua);
  const selectedRegion = SKY_REGION_OPTIONS.find((region) => region.id === skyRegion) ?? SKY_REGION_OPTIONS[1];
  const dayOfYear = getDayOfYearInfo(dataIso);
  const rawSeasonalArtwork = getSeasonalArtwork(season, dataIso);
  const seasonalArtwork = getLocalizedSeasonalArtwork(rawSeasonalArtwork, lingua);
  const artworkSourceUrl = seasonalArtwork?.sourceUrl || dayPermalink;
  const ticketArtworkImageUrl = seasonalArtwork?.imageUrl || '';
  const planetResultKey = `${dataIso}:${skyRegion}:${lingua}`;
  const visiblePlanets = planetResult?.key === planetResultKey ? planetResult.planets : null;
  const daylightValue = planetResult?.key === planetResultKey ? planetResult.daylight : null;
  const planetSummary = visiblePlanets?.length
    ? visiblePlanets.map((planet) => `${planet.name}, ${planet.direction}, ${planet.bestTime}`).join('. ')
    : t('noPlanets', lingua);

  useEffect(() => {
    const savedRegion = window.localStorage.getItem(SKY_REGION_STORAGE_KEY);
    if (savedRegion !== 'north' && savedRegion !== 'center' && savedRegion !== 'south') return;

    const frame = window.requestAnimationFrame(() => setSkyRegion(savedRegion));
    return () => window.cancelAnimationFrame(frame);
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
    const desktopQuery = window.matchMedia('(min-width: 1180px)');
    const updateDesktopTicket = () => setDesktopTicketEnabled(desktopQuery.matches);
    updateDesktopTicket();
    desktopQuery.addEventListener('change', updateDesktopTicket);

    return () => desktopQuery.removeEventListener('change', updateDesktopTicket);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void import('@/lib/visible-planets').then(({ getVisiblePlanets, getDaylightDuration }) => {
      if (!cancelled) {
        setPlanetResult({
          key: planetResultKey,
          planets: getVisiblePlanets(dataIso, skyRegion, lingua),
          daylight: getDaylightDuration(dataIso),
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [dataIso, lingua, planetResultKey, skyRegion]);

  const selectSkyRegion = (region: SkyRegion) => {
    setSkyRegion(region);
    window.localStorage.setItem(SKY_REGION_STORAGE_KEY, region);
  };

  const dismissPreparedTicket = useCallback(() => {
    if (preparedTicketUrlRef.current) URL.revokeObjectURL(preparedTicketUrlRef.current);
    preparedTicketUrlRef.current = null;
    setPreparedTicketDownload(null);
  }, []);

  useEffect(() => () => {
    if (preparedTicketUrlRef.current) URL.revokeObjectURL(preparedTicketUrlRef.current);
  }, []);

  const downloadTicket = useCallback(async () => {
    if (!ticketRef.current || exportingTicket) return;
    setExportingTicket(true);
    let exportFrame: HTMLElement | null = null;
    try {
      await document.fonts.ready;
      const { toBlob, toPng } = await import('html-to-image');

      const exportOptions = {
        width: 588,
        height: 226,
        pixelRatio: 4,
        backgroundColor: 'transparent',
        cacheBust: true,
        style: {
          inset: 'auto',
          position: 'relative',
          transform: 'none',
        },
      } as const;

      if (!window.matchMedia('(max-width: 1179px)').matches) {
        const dataUrl = await toPng(ticketRef.current, {
          ...exportOptions,
          filter: (node) => {
            const exportMarker = node.getAttribute?.('data-ticket-export-ignore');
            return exportMarker === null || exportMarker === undefined;
          },
        });
        const link = document.createElement('a');
        link.download = `effemeridi-${dataIso}-4x.png`;
        link.href = dataUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      const sourceBookmark = ticketRef.current.closest<HTMLElement>('.seasonal-bookmark');
      if (!sourceBookmark) throw new Error('Contenitore del biglietto non trovato.');

      const sourceFontFamily = window.getComputedStyle(sourceBookmark).fontFamily;
      const artworkDataUrl = ticketArtworkImageUrl
        ? await fetch(ticketArtworkImageUrl, { cache: 'force-cache' })
          .then((response) => {
            if (!response.ok) throw new Error(`Immagine del quadro non disponibile (${response.status}).`);
            return response.blob();
          })
          .then(blobToDataUrl)
        : null;

      exportFrame = sourceBookmark.cloneNode(true) as HTMLElement;
      exportFrame.classList.add(garamond.className);
      exportFrame.removeAttribute('aria-hidden');
      exportFrame.removeAttribute('inert');
      exportFrame.querySelectorAll('[data-ticket-export-ignore]').forEach((node) => node.remove());
      if (artworkDataUrl) {
        const artworkImage = exportFrame.querySelector<SVGImageElement>('.seasonal-bookmark-artwork image');
        artworkImage?.setAttribute('href', artworkDataUrl);
        artworkImage?.setAttributeNS('http://www.w3.org/1999/xlink', 'href', artworkDataUrl);
      }
      Object.assign(exportFrame.style, {
        filter: 'none',
        fontFamily: sourceFontFamily,
        left: '0',
        opacity: '1',
        pointerEvents: 'none',
        position: 'fixed',
        right: 'auto',
        top: '0',
        transform: 'none',
        transition: 'none',
        zIndex: '-1',
      });
      document.body.appendChild(exportFrame);

      const imageBlob = await toBlob(exportFrame, exportOptions);
      if (!imageBlob) throw new Error('Impossibile creare il file PNG del biglietto.');

      const filename = `effemeridi-${dataIso}-4x.png`;
      const objectUrl = URL.createObjectURL(imageBlob);
      if (isMobileChromiumBrowser()) {
        if (preparedTicketUrlRef.current) URL.revokeObjectURL(preparedTicketUrlRef.current);
        preparedTicketUrlRef.current = objectUrl;
        setPreparedTicketDownload({ url: objectUrl, filename });
      } else {
        const link = document.createElement('a');
        link.download = filename;
        link.href = objectUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      }
    } catch (error) {
      console.error('Errore durante l’esportazione delle effemeridi:', error);
    } finally {
      exportFrame?.remove();
      setExportingTicket(false);
    }
  }, [dataIso, exportingTicket, ticketArtworkImageUrl]);

  useEffect(() => {
    const handleTicketDownload = () => void downloadTicket();
    window.addEventListener(TICKET_DOWNLOAD_EVENT, handleTicketDownload);
    return () => window.removeEventListener(TICKET_DOWNLOAD_EVENT, handleTicketDownload);
  }, [downloadTicket]);

  const artworkQrLabel = seasonalArtwork?.linkKind === 'source'
    ? ({ IT: 'Apri la fonte', EN: 'View source', FR: 'Ouvrir la source', DE: 'Quelle öffnen', ES: 'Abrir la fuente', PT: 'Abrir a fonte' }[lingua] || 'View source')
    : ({ IT: 'Apri al museo', EN: 'View at museum', FR: 'Voir au musée', DE: 'Im Museum ansehen', ES: 'Ver en el museo', PT: 'Ver no museu' }[lingua] || 'View at museum');

  return (
    <>
      <aside
        id="effemeridi"
        className={`seasonal-bookmark season-${season} month-${bookmarkMonth} ${seasonalArtwork ? `artwork-${seasonalArtwork.id} artwork-tone-${seasonalArtwork.tone}` : ''} ${isDark ? 'is-dark' : ''}`}
        aria-label={`${dateLabel}, ${label}. ${moonLabel}, ${moon.illumination}%. ${fullMoonAriaLabel}: ${nextFullMoonLabel}. ${daylightRowLabel}: ${daylightValue || '…'}. ${planetsLabel}: ${planetSummary}`}
        aria-hidden={!desktopTicketEnabled}
        inert={!desktopTicketEnabled ? true : undefined}
        tabIndex={desktopTicketEnabled ? 0 : -1}
      >
        <span ref={ticketRef} className="seasonal-bookmark-ticket">
          <span className="seasonal-bookmark-stub" aria-hidden="true">
            <span className="seasonal-bookmark-label">{almanacLabel}</span>
            <span className="seasonal-bookmark-motif"><MoonDoodle phase={moon.phase} /></span>
            <span className="seasonal-bookmark-serial">No. {ticketSerial}</span>
          </span>
          <span className="seasonal-bookmark-stitch" aria-hidden="true" />
          <span className={`seasonal-bookmark-copy ${ticketArtworkImageUrl ? 'has-artwork' : ''}`}>
            {ticketArtworkImageUrl ? (
              <svg
                className="seasonal-bookmark-artwork"
                viewBox="0 0 404 226"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <filter id="ticket-ink-edge" x="-12%" y="-18%" width="124%" height="136%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.018 0.055" numOctaves="4" seed="17" result="paperNoise" />
                    <feDisplacementMap in="SourceGraphic" in2="paperNoise" scale="13" xChannelSelector="R" yChannelSelector="B" result="roughEdge" />
                    <feGaussianBlur in="roughEdge" stdDeviation="1.4" />
                  </filter>
                  <mask id="ticket-ink-mask">
                    <rect x="7" y="6" width="390" height="214" rx="5" fill="white" filter="url(#ticket-ink-edge)" />
                  </mask>
                </defs>
                <image
                  href={ticketArtworkImageUrl}
                  width="404"
                  height="226"
                  preserveAspectRatio={`${seasonalArtwork?.ticketAlignment ?? 'xMidYMid'} slice`}
                  mask="url(#ticket-ink-mask)"
                />
              </svg>
            ) : null}
            {ticketArtworkImageUrl ? <span className="seasonal-bookmark-artwork-wash" aria-hidden="true" /> : null}
            <span className="seasonal-bookmark-heading">
              <strong className="seasonal-bookmark-date">{dateLabel}</strong>
              <span className="seasonal-bookmark-season">{label}</span>
            </span>
            <span className="seasonal-bookmark-astronomy">
              <span><em>{moonRowLabel}</em><strong>{moonLabel} · {moon.illumination}%</strong></span>
              <span><em>{fullMoonRowLabel}</em><strong>{nextFullMoonLabel}</strong></span>
              <span><em>{daylightRowLabel}</em><strong>{daylightValue || ({ IT: 'Calcolo…', EN: 'Calculating…', FR: 'Calcul...', DE: 'Berechnung...', ES: 'Calculando...', PT: 'Calculando...' }[lingua] || 'Calculating…')}</strong></span>
            </span>
            <span className="seasonal-bookmark-planets">
              <span className="seasonal-bookmark-planets-heading">
                <strong>{planetsLabel}</strong>
              </span>
              <span className="seasonal-bookmark-planet-list" aria-live="polite">
                {visiblePlanets === null ? (
                  <em>{t('readingSky', lingua)}</em>
                ) : visiblePlanets.length > 0 ? visiblePlanets.map((planet) => (
                  <span key={planet.body} className="seasonal-bookmark-planet-row">
                    <strong>{planet.name}</strong>
                    <span>{planet.direction}</span>
                    <span>{planet.bestTime}</span>
                  </span>
                )) : (
                  <em>{t('noPlanets', lingua)}</em>
                )}
              </span>
            </span>
            <button
              type="button"
              className="seasonal-bookmark-download"
              data-ticket-export-ignore="true"
              disabled={exportingTicket}
              aria-label={t('downloadTicketAria', lingua)}
              title={t('downloadTicket', lingua)}
              onClick={() => void downloadTicket()}
            >
              {exportingTicket
                ? <Loader2 aria-hidden="true" className="animate-spin" strokeWidth={1.7} />
                : <FileDown aria-hidden="true" strokeWidth={1.7} />}
              <span>{t('download', lingua)}</span>
            </button>
          </span>
          <span className="seasonal-bookmark-stitch is-trailing" aria-hidden="true" />
          <span className={`seasonal-bookmark-tail ${seasonalArtwork ? 'has-artwork' : ''}`}>
            {artworkSourceUrl ? (
              <a
                className="seasonal-bookmark-qr-link"
                href={artworkSourceUrl}
                target={seasonalArtwork ? '_blank' : undefined}
                rel={seasonalArtwork ? 'noopener noreferrer' : undefined}
                aria-label={seasonalArtwork
                  ? seasonalArtwork.linkKind === 'museum'
                    ? ({
                        IT: `Apri ${seasonalArtwork.title} sul sito del museo`,
                        EN: `Open ${seasonalArtwork.title} on the museum website`,
                        FR: `Ouvrir ${seasonalArtwork.title} sur le site du musée`,
                        DE: `Öffne ${seasonalArtwork.title} auf der Website des Museums`,
                        ES: `Abrir ${seasonalArtwork.title} en el sitio web del museo`,
                        PT: `Abrir ${seasonalArtwork.title} no site do museu`
                      }[lingua] || `Open ${seasonalArtwork.title} on the museum website`)
                    : ({
                        IT: `Apri la fonte di ${seasonalArtwork.title}`,
                        EN: `Open the source for ${seasonalArtwork.title}`,
                        FR: `Ouvrir la source de ${seasonalArtwork.title}`,
                        DE: `Öffne die Quelle für ${seasonalArtwork.title}`,
                        ES: `Abrir la fuente de ${seasonalArtwork.title}`,
                        PT: `Abrir a fonte de ${seasonalArtwork.title}`
                      }[lingua] || `Open the source for ${seasonalArtwork.title}`)
                  : ({
                      IT: `Apri il giorno ${dateLabel}`,
                      EN: `Open ${dateLabel}`,
                      FR: `Ouvrir le ${dateLabel}`,
                      DE: `Öffne ${dateLabel}`,
                      ES: `Abrir el día ${dateLabel}`,
                      PT: `Abrir o dia ${dateLabel}`
                    }[lingua] || `Open ${dateLabel}`)}
                title={seasonalArtwork ? artworkQrLabel : ({
                  IT: 'Apri il permalink di questo giorno',
                  EN: 'Open this day’s permalink',
                  FR: 'Ouvrir le lien permanent de ce jour',
                  DE: 'Öffne den Permalink für diesen Tag',
                  ES: 'Abrir el enlace permanente de este día',
                  PT: 'Abrir o link permanente deste dia'
                }[lingua] || 'Open this day’s permalink')}
              >
                <span className="seasonal-bookmark-qr">
                  <QRCodeSVG
                    value={artworkSourceUrl}
                    size={68}
                    level="H"
                    marginSize={3}
                    bgColor="transparent"
                    fgColor="currentColor"
                    title={seasonalArtwork
                      ? seasonalArtwork.linkKind === 'museum'
                        ? ({
                            IT: `QR della scheda museale di ${seasonalArtwork.title}`,
                            EN: `Museum page QR for ${seasonalArtwork.title}`,
                            FR: `QR de la page de musée pour ${seasonalArtwork.title}`,
                            DE: `Museums-QR für ${seasonalArtwork.title}`,
                            ES: `QR de la página del museo para ${seasonalArtwork.title}`,
                            PT: `QR da página do museu para ${seasonalArtwork.title}`
                          }[lingua] || `Museum page QR for ${seasonalArtwork.title}`)
                        : ({
                            IT: `QR della fonte di ${seasonalArtwork.title}`,
                            EN: `Source QR for ${seasonalArtwork.title}`,
                            FR: `QR de la source pour ${seasonalArtwork.title}`,
                            DE: `Quellen-QR für ${seasonalArtwork.title}`,
                            ES: `QR de la fonte para ${seasonalArtwork.title}`,
                            PT: `QR da fonte para ${seasonalArtwork.title}`
                          }[lingua] || `Source QR for ${seasonalArtwork.title}`)
                      : ({
                          IT: `QR del ${dateLabel}`,
                          EN: `${dateLabel} QR code`,
                          FR: `Code QR du ${dateLabel}`,
                          DE: `QR-Code für ${dateLabel}`,
                          ES: `QR del ${dateLabel}`,
                          PT: `Código QR do ${dateLabel}`
                        }[lingua] || `${dateLabel} QR code`)}
                  />
                  <span className="seasonal-bookmark-qr-mark" aria-hidden="true">
                    <MoonDoodle phase={moon.phase} />
                  </span>
                </span>
                <small>{seasonalArtwork ? artworkQrLabel : t('openDay', lingua)}</small>
              </a>
            ) : null}
            {seasonalArtwork ? (
              <span className="seasonal-bookmark-artwork-caption">
                <strong title={seasonalArtwork.title}>{seasonalArtwork.title}</strong>
                <span>{seasonalArtwork.artist} · {seasonalArtwork.year}</span>
                <b>{
                  {
                    IT: `Opera ${season === 'spring' ? 'di primavera' : `d’${label.toLocaleLowerCase('it-IT')}`} · selezione del giorno`,
                    EN: `${label} artwork · daily selection`,
                    FR: `Œuvre de ${season === 'spring' ? 'printemps' : label.toLocaleLowerCase('fr-FR')} · sélection du jour`,
                    DE: `${label}-Kunstwerk · tägliche Auswahl`,
                    ES: `Obra de ${season === 'spring' ? 'primavera' : label.toLocaleLowerCase('es-ES')} · selección del día`,
                    PT: `Obra de ${season === 'spring' ? 'primavera' : label.toLocaleLowerCase('pt-PT')} · seleção do dia`
                  }[lingua] || `${label} artwork · daily selection`
                }</b>
                <em>{seasonalArtwork.medium} · {seasonalArtwork.collection}</em>
                <small>{{ IT: 'Edizione', EN: 'Edition', FR: 'Édition', DE: 'Edition', ES: 'Edición', PT: 'Edição' }[lingua] || 'Edition'} {dayOfYear.day}/{dayOfYear.total}</small>
              </span>
            ) : null}
            {!seasonalArtwork ? (
              <span className="seasonal-bookmark-tail-ledger" aria-hidden="true">
                <span><em>{{ IT: 'Foglio', EN: 'Sheet', FR: 'Feuille', DE: 'Blatt', ES: 'Hoja', PT: 'Folha' }[lingua] || 'Sheet'}</em><strong>{dayOfYear.day}/{dayOfYear.total}</strong></span>
                <span><em>{{ IT: 'Valido', EN: 'Valid', FR: 'Valide', DE: 'Gültig', ES: 'Válido', PT: 'Válido' }[lingua] || 'Valid'}</em><strong>{{ IT: '1 giorno', EN: '1 day', FR: '1 jour', DE: '1 Tag', ES: '1 día', PT: '1 dia' }[lingua] || '1 day'}</strong></span>
              </span>
            ) : null}
          </span>
        </span>
      </aside>
      {preparedTicketDownload ? createPortal(
        <div className={`ticket-download-ready ${isDark ? 'is-dark' : ''}`} role="dialog" aria-modal="true" aria-labelledby="ticket-download-ready-title">
          <div className="ticket-download-ready-card">
            <button
              type="button"
              className="ticket-download-ready-close"
              onClick={dismissPreparedTicket}
              aria-label={t('close', lingua)}
            >
              <X aria-hidden="true" />
            </button>
            <FileDown className="ticket-download-ready-icon" aria-hidden="true" />
            <strong id="ticket-download-ready-title">
              {t('ticketReadyTitle', lingua)}
            </strong>
            <span>
              {t('ticketReadySubtitle', lingua)}
            </span>
            <a
              href={preparedTicketDownload.url}
              download={preparedTicketDownload.filename}
              onClick={() => window.setTimeout(dismissPreparedTicket, 2_000)}
            >
              {t('saveTicket', lingua)}
            </a>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
