'use client';

import React, { useEffect, useRef, useState } from 'react';
import EspressoCorner from '@/components/ui/EspressoCorner';
import { getSeasonalArtwork, getLocalizedSeasonalArtwork, type SeasonId } from '@/lib/seasonal-artwork';

const renderRopeStrands = (
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  steps: number,
  strandHeight: number,
  strandWidth: number,
  twistAngle: number
) => {
  const elements = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
    const y = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
    
    const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    elements.push(
      <ellipse
        key={i}
        cx={0}
        cy={0}
        rx={strandWidth}
        ry={strandHeight}
        transform={`translate(${x}, ${y}) rotate(${angle + twistAngle})`}
        fill="url(#strand-grad)"
        stroke="#120002"
        strokeWidth="0.45"
      />
    );
  }
  return elements;
};

const revealSeasons: SeasonId[] = ['spring', 'summer'];
// Keep the line-only variant available for a one-line dark-mode swap.
const darkNotebookBackground = '/images/sfondo-taccuino-dark-paper.webp';

const getRelativeDateIso = (dateStr: string | undefined, offset: number): string | undefined => {
  if (!dateStr) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return undefined;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  date.setUTCDate(date.getUTCDate() + offset);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getFrameStyleClass = (dateStr: string | undefined): string => {
  if (!dateStr) return 'frame-style-walnut';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return 'frame-style-walnut';
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const utcDay = Math.floor(date.getTime() / 86_400_000);
  const index = ((utcDay + 2) % 5 + 5) % 5;
  const styles = [
    'frame-style-walnut',
    'frame-style-gold',
    'frame-style-ebony',
    'frame-style-ivory',
    'frame-style-oak'
  ];
  return styles[index];
};

const SEAL_HEX_CODES: Record<string, string> = {
  blu: '#11304e',
  rosso: '#7e0814',
  oro: '#86683a',
  'verde-scuro': '#3c6146',
  salvia: '#6c7d60',
  'verde-chiaro': '#7d8e75',
  borgogna: '#54191f',
  rame: '#bb7652',
  terracotta: '#a8480e',
  argento: '#9fa3a6',
  ocra: '#ca8e2d',
  antracite: '#424143',
  ottanio: '#196066',
};

const CAPTION_TRANSLATIONS = {
  badge: {
    IT: 'OPERA STAGIONALE sullo sfondo',
    EN: 'SEASONAL ARTWORK in background',
    FR: 'ŒUVRE SAISONNIÈRE en arrière-plan',
    DE: 'SAISONALES KUNSTWERK im Hintergrund',
    ES: 'OBRA ESTACIONAL en el fondo',
    PT: 'OBRA SAZONAL no fundo',
  },
  hint: {
    IT: '(Muovi il cursore)',
    EN: '(Move cursor)',
    FR: '(Bougez le curseur)',
    DE: '(Maus bewegen)',
    ES: '(Mueve el cursor)',
    PT: '(Mova o cursor)',
  },
  clickToShowText: {
    IT: '← Torna alla Home',
    EN: '← Back to Home',
    FR: '← Retour à l’accueil',
    DE: '← Zurück zur Startseite',
    ES: '← Volver al inicio',
    PT: '← Voltar ao início',
  },
  accessibilityLabel: {
    IT: 'Opera stagionale in trasparenza',
    EN: 'Seasonal artwork revealed in the background',
    FR: 'Œuvre saisonnière révélée en arrière-plan',
    DE: 'Saisonales Kunstwerk im Hintergrund enthüllt',
    ES: 'Obra estacional revelada en el fondo',
    PT: 'Obra sazonal revelada no fundo',
  }
};

export default function ParallaxBackground({
  children,
  season,
  dataIso,
  showEspresso = false,
  captionClassName = '',
  language = 'IT',
  sealColor,
}: {
  children: React.ReactNode;
  season?: SeasonId;
  dataIso?: string;
  showEspresso?: boolean;
  captionClassName?: string;
  language?: string;
  sealColor?: string;
}) {
  const imageRef = useRef<HTMLDivElement>(null);
  const coffeeLayerRef = useRef<HTMLDivElement>(null);
  const lineArtRef = useRef<HTMLDivElement>(null);
  const seasonalRevealRef = useRef<HTMLDivElement>(null);
  const seasonalCaptionRef = useRef<HTMLElement>(null);
  const [dark, setDark] = useState(false);
  const [isArtworkSolo, setIsArtworkSolo] = useState(false);
  const prevSolo = useRef(isArtworkSolo);

  const bgColor = dark ? '#171614' : '#F8F6F0';
  const imageOpacity = dark ? 0.102 : 0.13;
  const imageFilter = dark
    ? 'brightness(0.52) saturate(0.42) contrast(0.72)'
    : 'saturate(0.72) brightness(1.04) contrast(0.94)';
  const hasSeasonalReveal = season ? revealSeasons.includes(season) : false;
  const rawArtwork = season ? getSeasonalArtwork(season, dataIso) : undefined;
  const seasonalArtwork = getLocalizedSeasonalArtwork(rawArtwork, language);

  const yesterdayIso = getRelativeDateIso(dataIso, -1);
  const tomorrowIso = getRelativeDateIso(dataIso, 1);
  const rawYesterdayArtwork = season && yesterdayIso ? getSeasonalArtwork(season, yesterdayIso) : undefined;
  const yesterdayArtwork = getLocalizedSeasonalArtwork(rawYesterdayArtwork, language);
  const rawTomorrowArtwork = season && tomorrowIso ? getSeasonalArtwork(season, tomorrowIso) : undefined;
  const tomorrowArtwork = getLocalizedSeasonalArtwork(rawTomorrowArtwork, language);

  const langKey = (language as 'IT' | 'EN' | 'FR' | 'DE' | 'ES' | 'PT') || 'EN';
  const seasonalCaptionLabel = CAPTION_TRANSLATIONS.accessibilityLabel[langKey] || CAPTION_TRANSLATIONS.accessibilityLabel.EN;
  const seasonalCaptionHint = CAPTION_TRANSLATIONS.hint[langKey] || CAPTION_TRANSLATIONS.hint.EN;
  const seasonalBadgeText = CAPTION_TRANSLATIONS.badge[langKey] || CAPTION_TRANSLATIONS.badge.EN;
  const clickToShowText = CAPTION_TRANSLATIONS.clickToShowText[langKey] || CAPTION_TRANSLATIONS.clickToShowText.EN;

  useEffect(() => {
    // Legge la classe dark dall'elemento html per sincronizzarsi con il tema
    const update = () => setDark(document.documentElement.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let frame: number | null = null;
    let maxScroll = 1;
    let travel = window.innerHeight * 0.5;
    let targetY = 0;
    let currentY = 0;
    let initialized = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const paintParallax = () => {
      const image = imageRef.current;
      if (!image) {
        frame = null;
        return;
      }

      if (reducedMotion.matches) {
        currentY = targetY;
      } else {
        currentY += (targetY - currentY) * 0.24;
      }
      if (Math.abs(targetY - currentY) < 0.12) currentY = targetY;

      const transform = `translate3d(0, ${currentY.toFixed(2)}px, 0)`;
      image.style.transform = transform;
      if (coffeeLayerRef.current) coffeeLayerRef.current.style.transform = transform;
      frame = currentY === targetY ? null : window.requestAnimationFrame(paintParallax);
    };

    const updateTarget = (immediate = false) => {
      const scrollProgress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      targetY = -(scrollProgress * travel);
      if (!initialized || immediate) {
        currentY = targetY;
        initialized = true;
      }
      if (frame === null) frame = window.requestAnimationFrame(paintParallax);
    };

    const updateMetrics = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      travel = window.innerHeight * 0.5;
      updateTarget(!initialized);
    };

    const handleScroll = () => updateTarget();
    const resizeObserver = new ResizeObserver(updateMetrics);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateMetrics);
    resizeObserver.observe(document.documentElement);
    updateMetrics();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateMetrics);
      resizeObserver.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const reveal = seasonalRevealRef.current;
    const lineArt = lineArtRef.current;
    if (!reveal || !lineArt || !hasSeasonalReveal) return;
    const caption = seasonalCaptionRef.current;

    if (isArtworkSolo) {
      reveal.style.opacity = '1';
      caption?.classList.add('is-visible');
      return () => {
        reveal.style.opacity = '';
        caption?.classList.remove('is-visible');
      };
    }

    caption?.classList.remove('is-visible');

    const pointerQuery = window.matchMedia(
      '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    );
    let frame: number | null = null;
    let hideTimer: number | null = null;
    let initialized = false;
    let targetX = 0;
    let targetY = 0;
    let headX = 0;
    let headY = 0;
    let wakeX = 0;
    let wakeY = 0;
    let tailX = 0;
    let tailY = 0;
    let previousTargetX = 0;
    let previousTargetY = 0;
    let velocity = 0;
    const readabilityZones = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal-readability]'),
    );

    const setPaintVariable = (name: string, value: string) => {
      reveal.style.setProperty(name, value);
      lineArt.style.setProperty(name, value);
    };

    const getReadabilityProtection = (x: number, y: number) => {
      return readabilityZones.reduce((strongest, zone) => {
        const rect = zone.getBoundingClientRect();
        const distanceX = Math.max(rect.left - x, 0, x - rect.right);
        const distanceY = Math.max(rect.top - y, 0, y - rect.bottom);
        const distance = Math.hypot(distanceX, distanceY);
        const strength = Math.max(0, Math.min(1, 1 - distance / 150));
        return Math.max(strongest, strength);
      }, 0);
    };

    const paintFrame = (time: number) => {
      headX += (targetX - headX) * 0.3;
      headY += (targetY - headY) * 0.3;
      tailX += (headX - tailX) * 0.085;
      tailY += (headY - tailY) * 0.085;
      wakeX = (headX + tailX) / 2;
      wakeY = (headY + tailY) / 2;
      velocity *= 0.91;

      const pulse = Math.sin(time * 0.006) * 9;
      const trailDistance = Math.hypot(headX - tailX, headY - tailY);
      const headRadiusX = Math.min(215, 128 + velocity * 1.7 + pulse);
      const headRadiusY = Math.min(170, 108 + velocity * 0.72 - pulse * 0.35);
      const wakeRadius = Math.min(228, Math.max(94, trailDistance * 0.54 + 48));
      const tailRadius = Math.min(108, 72 + trailDistance * 0.09);

      setPaintVariable('--paint-head-x', `${headX}px`);
      setPaintVariable('--paint-head-y', `${headY}px`);
      setPaintVariable('--paint-wake-x', `${wakeX}px`);
      setPaintVariable('--paint-wake-y', `${wakeY}px`);
      setPaintVariable('--paint-tail-x', `${tailX}px`);
      setPaintVariable('--paint-tail-y', `${tailY}px`);
      setPaintVariable('--paint-head-rx', `${headRadiusX}px`);
      setPaintVariable('--paint-head-ry', `${headRadiusY}px`);
      setPaintVariable('--paint-wake-r', `${wakeRadius}px`);
      setPaintVariable('--paint-tail-r', `${tailRadius}px`);

      const distance =
        Math.abs(targetX - headX) +
        Math.abs(targetY - headY) +
        Math.abs(headX - wakeX) +
        Math.abs(headY - wakeY);

      if (distance > 0.8 || velocity > 0.3) {
        frame = window.requestAnimationFrame(paintFrame);
      } else {
        frame = null;
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerQuery.matches || event.pointerType === 'touch') return;

      targetX = event.clientX;
      targetY = event.clientY;
      if (!initialized) {
        headX = wakeX = tailX = targetX;
        headY = wakeY = tailY = targetY;
        previousTargetX = targetX;
        previousTargetY = targetY;
        initialized = true;
      }

      const pointerDistance = Math.hypot(
        targetX - previousTargetX,
        targetY - previousTargetY,
      );
      velocity = Math.min(52, velocity * 0.45 + pointerDistance * 0.55);
      previousTargetX = targetX;
      previousTargetY = targetY;
      const readabilityProtection = getReadabilityProtection(targetX, targetY);
      const regularOpacity = dark ? 0.82 : 0.82;
      const protectedOpacity = dark ? 0.44 : 0.36;
      const revealOpacity =
        regularOpacity - (regularOpacity - protectedOpacity) * readabilityProtection;

      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
      reveal.style.opacity = revealOpacity.toFixed(3);
      lineArt.classList.add('is-disturbed');
      caption?.classList.add('is-visible');
      if (frame === null) frame = window.requestAnimationFrame(paintFrame);
    };

    const hideReveal = () => {
      reveal.style.opacity = '0';
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        lineArt.classList.remove('is-disturbed');
        hideTimer = null;
      }, 360);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('blur', hideReveal);
    document.documentElement.addEventListener('pointerleave', hideReveal);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('blur', hideReveal);
      document.documentElement.removeEventListener('pointerleave', hideReveal);
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      caption?.classList.remove('is-visible');
      reveal.style.opacity = '';
    };
  }, [dark, hasSeasonalReveal, season, isArtworkSolo]);

  useEffect(() => {
    if (!hasSeasonalReveal) return;

    if (prevSolo.current === isArtworkSolo) {
      return;
    }
    prevSolo.current = isArtworkSolo;

    const cards = Array.from(document.querySelectorAll('.card-paper-shadow')).map(el => el.parentElement).filter(Boolean) as HTMLElement[];
    const others = Array.from(document.querySelectorAll(
      'header.journal-hero, section.author-feature, footer.journal-footer, .seasonal-bookmark, .top-control-panel, .notebook-quick-nav, .mobile-reading-thread, .mobile-tools'
    )) as HTMLElement[];
    const targets = [...cards, ...others];

    if (isArtworkSolo) {
      const viewportMid = window.innerHeight / 2;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      targets.forEach(el => {
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const goUp = elCenter < viewportMid;
        
        el.classList.add('solo-transition');
        el.classList.add(goUp ? 'solo-go-up' : 'solo-go-down');
      });
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';

      targets.forEach(el => {
        el.classList.remove('solo-go-up', 'solo-go-down');
      });

      const timer = setTimeout(() => {
        targets.forEach(el => {
          el.classList.remove('solo-transition');
        });
      }, 800);

      return () => clearTimeout(timer);
    }

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isArtworkSolo, hasSeasonalReveal]);



  return (
    <>
      {/* Sfondo solido che copre tutta la viewport incluse le barre Safari iOS */}
      <div
        className="safe-viewport-backdrop fixed z-0 pointer-events-none"
        style={{ backgroundColor: bgColor, transition: 'background-color 300ms' }}
      />

      {hasSeasonalReveal && seasonalArtwork && (
        <div
          ref={seasonalRevealRef}
          aria-hidden={!isArtworkSolo}
          className={[
            'seasonal-paint-reveal',
            `season-${season}`,
            `artwork-${seasonalArtwork.id}`,
            'safe-viewport-backdrop fixed z-0',
            isArtworkSolo ? 'is-solo' : 'pointer-events-none',
            dark ? 'is-dark' : '',
          ].join(' ')}
          style={{
            backgroundImage: `url('${seasonalArtwork.imageUrl}')`,
            backgroundPosition: seasonalArtwork.revealPosition,
          }}
          onClick={isArtworkSolo ? () => setIsArtworkSolo(false) : undefined}
        >
          {/* Fading museum wall backdrop */}
          <div
            className={`museum-wall-backdrop absolute inset-0 transition-opacity duration-700 ease-out z-0 ${
              isArtworkSolo ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              backgroundImage: `
                radial-gradient(circle at 50% 50%, color-mix(in srgb, ${sealColor ? (SEAL_HEX_CODES[sealColor] || '#424143') : '#424143'} 38%, #161513 62%) 0%, color-mix(in srgb, ${sealColor ? (SEAL_HEX_CODES[sealColor] || '#424143') : '#424143'} 10%, #060605 90%) 100%),
                url("data:image/svg+xml,%3Csvg width='150' height='150' viewBox='0 0 150 150' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='150' height='150' filter='url(%23noiseFilter)' opacity='0.045'/%3E%3C/svg%3E")
              `,
              backgroundSize: 'cover, 150px 150px',
              backgroundRepeat: 'no-repeat, repeat',
              backgroundBlendMode: 'overlay',
            }}
          />

          <div
            className={`museum-frame-container ${isArtworkSolo ? 'is-visible' : ''}`}
            onClick={isArtworkSolo ? () => setIsArtworkSolo(false) : undefined}
          >
            <div className="museum-artwork-wrapper relative" onClick={(e) => e.stopPropagation()}>
              {/* Paintings row to align side paintings to the exact vertical center of the main painting */}
              <div className="museum-paintings-row relative w-full flex items-center justify-center z-10">
                {/* Yesterday's Artwork (Left, flat on wall, blurred) */}
                {yesterdayArtwork && (
                  <div className="museum-side-painting left-side">
                    <div className={`museum-frame-inner ${getFrameStyleClass(yesterdayIso)}`}>
                      <img
                        src={yesterdayArtwork.imageUrl}
                        alt={yesterdayArtwork.title}
                        className="museum-frame-image"
                        draggable={false}
                      />
                    </div>
                  </div>
                )}

                {/* Today's Main Artwork */}
                {seasonalArtwork.sourceUrl ? (
                  <a
                    href={seasonalArtwork.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="z-10 cursor-pointer"
                  >
                    <div className={`museum-frame-inner relative ${getFrameStyleClass(dataIso)}`}>
                      <div className="museum-spotlight left" />
                      <div className="museum-spotlight right" />
                      <img
                        src={seasonalArtwork.imageUrl}
                        alt={seasonalArtwork.title}
                        className="museum-frame-image"
                        draggable={false}
                      />
                      <div className="museum-light-beams" />
                    </div>
                  </a>
                ) : (
                  <div className={`museum-frame-inner relative z-10 ${getFrameStyleClass(dataIso)}`}>
                    <div className="museum-spotlight left" />
                    <div className="museum-spotlight right" />
                    <img
                      src={seasonalArtwork.imageUrl}
                      alt={seasonalArtwork.title}
                      className="museum-frame-image"
                      draggable={false}
                    />
                    <div className="museum-light-beams" />
                  </div>
                )}

                {/* Tomorrow's Artwork (Right, flat on wall, blurred) */}
                {tomorrowArtwork && (
                  <div className="museum-side-painting right-side">
                    <div className={`museum-frame-inner ${getFrameStyleClass(tomorrowIso)}`}>
                      <img
                        src={tomorrowArtwork.imageUrl}
                        alt={tomorrowArtwork.title}
                        className="museum-frame-image"
                        draggable={false}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="museum-stanchions" aria-hidden="true">
                <svg className="museum-stanchions-svg" viewBox="0 0 1000 80" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="gold-pole-museum" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b2b07" />
                      <stop offset="25%" stopColor="#5c430e" />
                      <stop offset="50%" stopColor="#7a5c1b" />
                      <stop offset="75%" stopColor="#4d3708" />
                      <stop offset="100%" stopColor="#261a03" />
                    </linearGradient>
                    <linearGradient id="gold-base-museum" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#261a03" />
                      <stop offset="30%" stopColor="#5c430e" />
                      <stop offset="60%" stopColor="#7a5c1b" />
                      <stop offset="85%" stopColor="#4d3708" />
                      <stop offset="100%" stopColor="#1a1002" />
                    </linearGradient>
                    <radialGradient id="gold-ball-museum" cx="35%" cy="35%" r="65%">
                      <stop offset="0%" stopColor="#fff2bc" stopOpacity="0.4" />
                      <stop offset="40%" stopColor="#73561a" />
                      <stop offset="80%" stopColor="#423009" />
                      <stop offset="100%" stopColor="#211702" />
                    </radialGradient>

                    {/* Rich velvet burgundy strand gradient with warm 3D cylinder rendering (dimmed for ambient lighting) */}
                    <linearGradient id="strand-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#1c0003" />
                      <stop offset="25%" stopColor="#4a030c" />
                      <stop offset="50%" stopColor="#7a0b18" />
                      <stop offset="75%" stopColor="#4a030c" />
                      <stop offset="100%" stopColor="#1c0003" />
                    </linearGradient>

                    {/* Cylindrical 3D Shading for the entire rope curve (darkened for shadowed foreground look) */}
                    <linearGradient id="rope-3d-shading" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#000000" stopOpacity="0.85" />
                      <stop offset="25%" stopColor="#000000" stopOpacity="0.3" />
                      <stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" />
                      <stop offset="75%" stopColor="#000000" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0.95" />
                    </linearGradient>

                    {/* Depth of Field Gaussian Blur Filters (very light variations) */}
                    {/* Center Rope: Sharp focus (lightly softened for lens look) */}
                    <filter id="blur-sharp-museum" x="-10%" y="-10%" width="120%" height="120%">
                      <feGaussianBlur stdDeviation="0.4" />
                    </filter>
                    {/* Columns: Medium focus */}
                    <filter id="blur-medium-museum" x="-10%" y="-10%" width="120%" height="120%">
                      <feGaussianBlur stdDeviation="0.8" />
                    </filter>
                    {/* Side Ropes: Out of focus (subtle blur) */}
                    <filter id="blur-defocused-museum" x="-10%" y="-10%" width="120%" height="120%">
                      <feGaussianBlur stdDeviation="1.2" />
                    </filter>
                    {/* Gold Cap and Hook Loop for Rope Ends */}
                    <g id="rope-cap-gold">
                      {/* The hook link loop */}
                      <path d="M -1.2,0 C 0.8,-2.4 4.5,-2.4 6.5,0 C 4.5,2.4 1,2.4 -1.2,0" fill="none" stroke="url(#gold-pole-museum)" strokeWidth="1.2" />
                      {/* The collar */}
                      <rect x="5.5" y="-3.8" width="1.5" height="7.6" rx="0.8" fill="url(#gold-base-museum)" stroke="#3a2a07" strokeWidth="0.3" />
                      {/* The cylinder cap wrapping the rope end */}
                      <path d="M 7.0,-3.4 L 14.0,-3.4 A 3.4,3.4 0 0,1 17.4,0 A 3.4,3.4 0 0,1 14.0,3.4 L 7.0,3.4 Z" fill="url(#gold-pole-museum)" stroke="#3a2a07" strokeWidth="0.3" />
                    </g>
                  </defs>

                  {/* 1. Shadows Layer */}
                  <path d="M -50,26 Q 85,55 220,15" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="6.5" strokeLinecap="round" transform="translate(0, 2)" filter="url(#blur-defocused-museum)" />
                  <path d="M 220,15 Q 500,72 780,15" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="6.5" strokeLinecap="round" transform="translate(0, 2)" filter="url(#blur-sharp-museum)" />
                  <path d="M 780,15 Q 915,55 1050,26" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="6.5" strokeLinecap="round" transform="translate(0, 2)" filter="url(#blur-defocused-museum)" />

                  {/* 2. Rope Strands (Braided Structure via dynamic rendering) */}
                  <g filter="url(#blur-defocused-museum)">
                    {renderRopeStrands([-50, 26], [85, 55], [220, 15], 80, 3.2, 1.8, 38)}
                  </g>
                  <g filter="url(#blur-sharp-museum)">
                    {renderRopeStrands([220, 15], [500, 72], [780, 15], 160, 3.2, 1.8, 38)}
                  </g>
                  <g filter="url(#blur-defocused-museum)">
                    {renderRopeStrands([780, 15], [915, 55], [1050, 26], 80, 3.2, 1.8, 38)}
                  </g>

                  {/* 3. 3D Cylindrical Shading Overlay */}
                  <path d="M -50,26 Q 85,55 220,15" fill="none" stroke="url(#rope-3d-shading)" strokeWidth="6.0" strokeLinecap="round" filter="url(#blur-defocused-museum)" opacity="0.22" />
                  <path d="M 220,15 Q 500,72 780,15" fill="none" stroke="url(#rope-3d-shading)" strokeWidth="6.0" strokeLinecap="round" filter="url(#blur-sharp-museum)" opacity="0.22" />
                  <path d="M 780,15 Q 915,55 1050,26" fill="none" stroke="url(#rope-3d-shading)" strokeWidth="6.0" strokeLinecap="round" filter="url(#blur-defocused-museum)" opacity="0.22" />

                  {/* 3.5. Gold Rope Caps & Hooks */}
                  <g filter="url(#blur-defocused-museum)">
                    <use href="#rope-cap-gold" transform="translate(220, 15) rotate(163.5)" />
                    <use href="#rope-cap-gold" transform="translate(780, 15) rotate(16.5)" />
                  </g>
                  <g filter="url(#blur-sharp-museum)">
                    <use href="#rope-cap-gold" transform="translate(220, 15) rotate(11.5)" />
                    <use href="#rope-cap-gold" transform="translate(780, 15) rotate(168.5)" />
                  </g>

                  {/* 4. Columns & Rings (Medium Blur) */}
                  <g filter="url(#blur-medium-museum)">
                    {/* Attachment rings */}
                    <circle cx="220" cy="15" r="1.5" fill="#3a2a07" />
                    <circle cx="780" cy="15" r="1.5" fill="#3a2a07" />

                    {/* Left Column (No base, goes straight down off-screen) */}
                    <rect x="218" y="15" width="4" height="65" fill="url(#gold-pole-museum)" />
                    <rect x="217" y="14" width="6" height="1" fill="url(#gold-base-museum)" />
                    <circle cx="220" cy="11.5" r="3.2" fill="url(#gold-ball-museum)" />

                    {/* Right Column (No base, goes straight down off-screen) */}
                    <rect x="778" y="15" width="4" height="65" fill="url(#gold-pole-museum)" />
                    <rect x="777" y="14" width="6" height="1" fill="url(#gold-base-museum)" />
                    <circle cx="780" cy="11.5" r="3.2" fill="url(#gold-ball-museum)" />
                  </g>
                </svg>
              </div>

              {seasonalArtwork.sourceUrl ? (
                <a
                  href={seasonalArtwork.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="museum-brass-label relative z-20"
                  title={language === 'IT' ? 'Vedi sul sito del museo / fonte' : 'View on museum / source website'}
                >
                  <span className="museum-label-screw left" />
                  <span className="museum-label-screw right" />
                  <h4 className="museum-label-title">{seasonalArtwork.title}</h4>
                  <p className="museum-label-meta">
                    <span className="museum-label-artist">{seasonalArtwork.artist}</span>
                    {seasonalArtwork.year && (
                      <span className="museum-label-year"> · {seasonalArtwork.year}</span>
                    )}
                  </p>
                  <p className="museum-label-collection">{seasonalArtwork.collection}</p>
                </a>
              ) : (
                <div className="museum-brass-label relative z-20">
                  <span className="museum-label-screw left" />
                  <span className="museum-label-screw right" />
                  <h4 className="museum-label-title">{seasonalArtwork.title}</h4>
                  <p className="museum-label-meta">
                    <span className="museum-label-artist">{seasonalArtwork.artist}</span>
                    {seasonalArtwork.year && (
                      <span className="museum-label-year"> · {seasonalArtwork.year}</span>
                    )}
                  </p>
                  <p className="museum-label-collection">{seasonalArtwork.collection}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {hasSeasonalReveal && seasonalArtwork ? (
        <aside
          ref={seasonalCaptionRef}
          className={`seasonal-artwork-caption ${captionClassName} ${dark ? 'is-dark' : ''} ${isArtworkSolo ? 'is-visible is-solo-mode' : ''}`}
          aria-label={seasonalCaptionLabel}
          data-reveal-readability
          onClick={() => setIsArtworkSolo(prev => !prev)}
        >
          {!isArtworkSolo && (
            <span className="seasonal-artwork-badge">{seasonalBadgeText}</span>
          )}
          <span className="seasonal-artwork-hint" style={isArtworkSolo ? { margin: 0 } : undefined}>
            {isArtworkSolo
              ? clickToShowText
              : seasonalCaptionHint}
          </span>
          {!isArtworkSolo && (
            <>
              <cite>{seasonalArtwork.title}</cite>, <time>{seasonalArtwork.year}</time>
              <span className="seasonal-artwork-artist">{seasonalArtwork.artist}</span>
              <span className="seasonal-artwork-collection">{seasonalArtwork.collection}</span>
            </>
          )}
        </aside>
      ) : null}

      {/* Immagine parallax sovrapposta */}
      <div
        ref={lineArtRef}
        className={`notebook-line-art safe-viewport-backdrop fixed z-0 pointer-events-none overflow-hidden ${
          hasSeasonalReveal ? 'seasonal-line-art' : ''
        }`}
        style={{ 
          filter: imageFilter, 
          opacity: isArtworkSolo ? 0 : imageOpacity,
          transition: 'opacity 700ms ease',
        }}
      >
        <div
          ref={imageRef}
          className="absolute top-0 left-0 w-full h-[150vh] will-change-transform"
          style={{
            backgroundImage: `url('${dark ? darkNotebookBackground : '/images/sfondo-taccuino.webp'}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backfaceVisibility: 'hidden',
            contain: 'layout paint style',
            transform: 'translate3d(0, 0, 0)',
          }}
        />
      </div>

      {showEspresso ? (
        <div
          ref={coffeeLayerRef}
          aria-hidden="true"
          className="safe-viewport-backdrop fixed z-0 pointer-events-none overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            contain: 'layout paint style',
            transform: isArtworkSolo ? 'translate3d(-300px, -300px, 0)' : 'translate3d(0, 0, 0)',
            opacity: isArtworkSolo ? 0 : 1,
            transition: 'transform 800ms cubic-bezier(0.16, 1, 0.3, 1), opacity 700ms ease',
          }}
        >
          <EspressoCorner isDark={dark} />
        </div>
      ) : null}

      {/* Contenuto */}
      <div className={`relative z-10 ${hasSeasonalReveal ? 'seasonal-reveal-content' : ''} ${isArtworkSolo ? 'is-artwork-solo' : ''}`}>
        {children}
      </div>
    </>
  );
}
