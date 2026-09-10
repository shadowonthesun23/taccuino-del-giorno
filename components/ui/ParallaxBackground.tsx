'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import './MuseumRoom.css';
import { clampMuseumCamera, getMuseumCameraPose, museumCameraTransform, RESTING_MUSEUM_CAMERA, type MuseumCameraPose } from '@/lib/museum-camera';
import SceneRenderer from '@/components/scene/SceneRenderer';
import type { SceneDraft, SceneViewport } from '@/lib/scene-draft';
import MuseumAmbienceControl from '@/components/ui/MuseumAmbienceControl';
import { getSeasonalArtwork, getLocalizedSeasonalArtwork, type SeasonId } from '@/lib/seasonal-artwork';

const revealSeasons: SeasonId[] = ['spring', 'summer'];
// Keep the line-only variant available for a one-line dark-mode swap.
const darkNotebookBackground = '/images/sfondo-taccuino-dark-paper.webp';

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

const MUSEUM_ROOM_TRANSLATIONS = {
  IT: 'SALA DEL GIORNO',
  EN: 'ROOM OF THE DAY',
  FR: 'SALLE DU JOUR',
  DE: 'SAAL DES TAGES',
  ES: 'SALA DEL DÍA',
  PT: 'SALA DO DIA',
} as const;

const MUSEUM_DATE_LOCALES = {
  IT: 'it-IT',
  EN: 'en-GB',
  FR: 'fr-FR',
  DE: 'de-DE',
  ES: 'es-ES',
  PT: 'pt-PT',
} as const;

export default function ParallaxBackground({
  children,
  season,
  dataIso,
  showEspresso = false,
  captionClassName = '',
  language = 'IT',
  sceneDraft,
  sceneViewport,
}: {
  children: React.ReactNode;
  season?: SeasonId;
  dataIso?: string;
  showEspresso?: boolean;
  captionClassName?: string;
  language?: string;
  sealColor?: string;
  sceneDraft?: SceneDraft;
  sceneViewport?: SceneViewport;
}) {
  const imageRef = useRef<HTMLDivElement>(null);
  const deskLayerRef = useRef<HTMLDivElement>(null);
  const lineArtRef = useRef<HTMLDivElement>(null);
  const seasonalRevealRef = useRef<HTMLDivElement>(null);
  const seasonalCaptionRef = useRef<HTMLElement>(null);
  const mainArtworkRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const roomExitRef = useRef<HTMLButtonElement>(null);
  const roomTriggerRef = useRef<HTMLElement | null>(null);
  const [dark, setDark] = useState(false);
  const [isArtworkSolo, setIsArtworkSolo] = useState(false);
  const [isExitingSolo, setIsExitingSolo] = useState(false);
  const [isArtworkZoomed, setIsArtworkZoomed] = useState(false);
  const [cameraPose, setCameraPose] = useState<MuseumCameraPose>(RESTING_MUSEUM_CAMERA);
  const [isDraggingCamera, setIsDraggingCamera] = useState(false);
  const cameraDragRef = useRef<{ pointerId: number; startX: number; startY: number; pose: MuseumCameraPose; moved: boolean } | null>(null);
  const suppressCameraClickRef = useRef(false);
  const prevSolo = useRef(isArtworkSolo);
  const prevSoloForTransition = useRef(isArtworkSolo);

  useEffect(() => {
    if (!isArtworkSolo) return;
    roomTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    roomExitRef.current?.focus({ preventScroll: true });
    return () => roomTriggerRef.current?.focus({ preventScroll: true });
  }, [isArtworkSolo]);

  const closeArtworkZoom = useCallback(() => {
    suppressCameraClickRef.current = false;
    setIsArtworkZoomed(false);
    setIsDraggingCamera(false);
    cameraDragRef.current = null;
    setCameraPose(RESTING_MUSEUM_CAMERA);
  }, []);

  useEffect(() => {
    if (!isArtworkSolo && prevSoloForTransition.current) {
      setIsExitingSolo(true);
      const timer = setTimeout(() => {
        setIsExitingSolo(false);
      }, 500);
      return () => clearTimeout(timer);
    }
    prevSoloForTransition.current = isArtworkSolo;
  }, [isArtworkSolo]);

  // Escape steps back before leaving the room.
  useEffect(() => {
    if (!isArtworkSolo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isArtworkZoomed) closeArtworkZoom();
        else setIsArtworkSolo(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeArtworkZoom, isArtworkSolo, isArtworkZoomed]);

  // Resize close zoom
  useEffect(() => {
    if (!isArtworkZoomed) return;

    const handleResize = () => closeArtworkZoom();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [closeArtworkZoom, isArtworkZoomed]);

  const toggleZoom = () => {
    if (!isArtworkSolo || suppressCameraClickRef.current) return;
    if (isArtworkZoomed) {
      closeArtworkZoom();
      return;
    }
    const frame = mainArtworkRef.current;
    const camera = cameraRef.current;
    if (!frame || !camera) return;
    const frameRect = frame.getBoundingClientRect();
    const cameraRect = camera.getBoundingClientRect();
    // Recover wall coordinates even if a previous approach is still reversing.
    const currentScale = cameraRect.width / camera.offsetWidth;
    setCameraPose(getMuseumCameraPose(camera.offsetWidth, camera.offsetHeight, {
      x: (frameRect.left - cameraRect.left) / currentScale,
      y: (frameRect.top - cameraRect.top) / currentScale,
      width: frameRect.width / currentScale,
      height: frameRect.height / currentScale,
    }));
    setIsArtworkZoomed(true);
  };

  const startCameraDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isArtworkZoomed || event.button !== 0 || (event.target as HTMLElement).closest('a, button')) return;
    const camera = event.currentTarget;
    const matrix = new DOMMatrixReadOnly(getComputedStyle(camera).transform);
    const pose = { scale: matrix.a, x: matrix.m41, y: matrix.m42 };
    suppressCameraClickRef.current = false;
    cameraDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, pose, moved: false };
  };

  const moveCamera = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = cameraDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    suppressCameraClickRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingCamera(true);
    setCameraPose(clampMuseumCamera({
      scale: drag.pose.scale, x: drag.pose.x + dx, y: drag.pose.y + dy,
    }, event.currentTarget.offsetWidth, event.currentTarget.offsetHeight));
  };

  const endCameraDrag = () => {
    cameraDragRef.current = null;
    setIsDraggingCamera(false);
  };

  const bgColor = dark ? '#171614' : '#F8F6F0';
  const imageOpacity = dark ? 0.102 : 0.13;
  const imageFilter = dark
    ? 'brightness(0.52) saturate(0.42) contrast(0.72)'
    : 'saturate(0.72) brightness(1.04) contrast(0.94)';
  const hasSeasonalReveal = season ? revealSeasons.includes(season) : false;
  const rawArtwork = season ? getSeasonalArtwork(season, dataIso) : undefined;
  const seasonalArtwork = getLocalizedSeasonalArtwork(rawArtwork, language);

  const langKey = (language as 'IT' | 'EN' | 'FR' | 'DE' | 'ES' | 'PT') || 'EN';
  const seasonalCaptionLabel = CAPTION_TRANSLATIONS.accessibilityLabel[langKey] || CAPTION_TRANSLATIONS.accessibilityLabel.EN;
  const seasonalCaptionHint = CAPTION_TRANSLATIONS.hint[langKey] || CAPTION_TRANSLATIONS.hint.EN;
  const seasonalBadgeText = CAPTION_TRANSLATIONS.badge[langKey] || CAPTION_TRANSLATIONS.badge.EN;
  const clickToShowText = CAPTION_TRANSLATIONS.clickToShowText[langKey] || CAPTION_TRANSLATIONS.clickToShowText.EN;
  const museumRoomTitle = MUSEUM_ROOM_TRANSLATIONS[langKey] || MUSEUM_ROOM_TRANSLATIONS.EN;
  const museumDate = dataIso
    ? new Intl.DateTimeFormat(MUSEUM_DATE_LOCALES[langKey] || MUSEUM_DATE_LOCALES.EN, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${dataIso}T12:00:00`))
    : null;

  useEffect(() => {
    // Legge la classe dark dall'elemento html per sincronizzarsi con il tema
    const update = () => {
      const root = document.documentElement;
      setDark(root.classList.contains('dark') || root.dataset.theme === 'dark');
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleToggle = () => setIsArtworkSolo((previous) => {
      if (previous) closeArtworkZoom();
      return !previous;
    });
    const handleOpen = () => setIsArtworkSolo(true);
    const handleClose = () => {
      closeArtworkZoom();
      setIsArtworkSolo(false);
    };

    window.addEventListener('toggle-artwork-solo', handleToggle);
    window.addEventListener('open-artwork-solo', handleOpen);
    window.addEventListener('close-artwork-solo', handleClose);

    return () => {
      window.removeEventListener('toggle-artwork-solo', handleToggle);
      window.removeEventListener('open-artwork-solo', handleOpen);
      window.removeEventListener('close-artwork-solo', handleClose);
    };
  }, [closeArtworkZoom]);

  useEffect(() => {
    document.body.classList.toggle('museum-room-open', isArtworkSolo);
    return () => document.body.classList.remove('museum-room-open');
  }, [isArtworkSolo]);

  useEffect(() => {
    let frame: number | null = null;
    let scrollIdleTimer: number | null = null;
    let maxScroll = 1;
    let travel = window.innerHeight * 0.5;
    let targetY = 0;
    let currentY = 0;
    let initialized = false;

    const paintParallax = () => {
      const image = imageRef.current;
      if (!image) {
        frame = null;
        return;
      }

      // Track the scroll position in one paint instead of chasing it with a
      // long-lived animation loop. The latter kept the page busy during fast
      // wheel/trackpad gestures and made sections appear late.
      currentY = targetY;

      const transform = `translate3d(0, ${currentY.toFixed(2)}px, 0)`;
      image.style.transform = transform;
      if (deskLayerRef.current) deskLayerRef.current.style.transform = transform;
      frame = null;
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

    const handleScroll = () => {
      // The page has a handful of editorial entrance animations. If a wheel
      // gesture starts while one of them is still delayed, the card surface
      // can be painted before its text, which reads as a blank beige block.
      // Mark the document immediately so CSS can finish those animations in
      // the same frame as the first scroll event.
      const root = document.documentElement;
      root.classList.add('has-scrolled');
      root.classList.add('is-scrolling');
      if (scrollIdleTimer !== null) window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => {
        scrollIdleTimer = null;
        root.classList.remove('is-scrolling');
      }, 180);
      updateTarget();
    };
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
      if (scrollIdleTimer !== null) window.clearTimeout(scrollIdleTimer);
      document.documentElement.classList.remove('is-scrolling');
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

    if (isArtworkSolo) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
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
          aria-hidden={true}
          className={[
            'seasonal-paint-reveal',
            `season-${season}`,
            `artwork-${seasonalArtwork.id}`,
            'safe-viewport-backdrop fixed z-0 pointer-events-none',
            dark ? 'is-dark' : '',
          ].join(' ')}
          style={{
            backgroundImage: `url('${seasonalArtwork.imageUrl}')`,
            backgroundPosition: seasonalArtwork.revealPosition,
            opacity: isArtworkSolo ? 0 : undefined,
            transition: 'opacity 400ms ease-in-out',
          }}
        />
      )}

      {hasSeasonalReveal && seasonalArtwork && (
        <div
          aria-hidden={!isArtworkSolo}
          className={`museum-gallery-room safe-viewport-backdrop fixed inset-0 z-20 overflow-hidden ${
            isArtworkSolo ? 'is-open pointer-events-auto' : 'pointer-events-none'
          } ${isArtworkZoomed ? 'is-close' : ''}`}
          style={{
            opacity: isArtworkSolo ? 1 : 0,
            transform: isArtworkSolo ? 'none' : 'scale(0.97)',
            visibility: (isArtworkSolo || isExitingSolo) ? 'visible' : 'hidden',
            // On entry the room is already a complete, static backdrop: only the
            // notebook moves away from it. The established fade-out/scale is preserved.
            transition: isArtworkSolo
              ? 'none'
              : 'opacity 400ms ease-out, transform 400ms ease-out, visibility 400ms 400ms',
            zIndex: isArtworkSolo ? 5 : isExitingSolo ? 20 : 5,
          }}
          inert={!isArtworkSolo}
          onClick={isArtworkSolo ? () => {
            closeArtworkZoom();
            setIsArtworkSolo(false);
          } : undefined}
        >
          <button
            ref={roomExitRef}
            type="button"
            className="museum-room-exit"
            onClick={(event) => {
              event.stopPropagation();
              closeArtworkZoom();
              setIsArtworkSolo(false);
            }}
          >
            {clickToShowText}
          </button>

          <MuseumAmbienceControl active={isArtworkSolo} language={langKey} />

          {/* The wall, floor, frame and label share exactly one camera transform. */}
          <div
            ref={cameraRef}
            className={`museum-camera ${isDraggingCamera ? 'is-dragging' : ''}`}
            style={{ transform: museumCameraTransform(cameraPose) }}
            onPointerDown={startCameraDrag}
            onPointerMove={moveCamera}
            onPointerUp={endCameraDrag}
            onPointerCancel={endCameraDrag}
            onClick={(event) => {
              event.stopPropagation();
              if (suppressCameraClickRef.current) {
                suppressCameraClickRef.current = false;
                return;
              }
              if (isArtworkZoomed) closeArtworkZoom();
            }}
          >
            <div className="museum-wall-backdrop absolute inset-0 z-0 pointer-events-none" aria-hidden="true" />
            {museumDate && (
              <aside className="museum-room-signage" aria-label={`${museumRoomTitle}, ${museumDate}`}>
                <span className="museum-room-signage-title">{museumRoomTitle}</span>
                <time dateTime={dataIso}>{museumDate}</time>
              </aside>
            )}
            <div className="museum-frame-container">
              <div className="museum-artwork-wrapper relative">
                {/* Middle Column Wrapper: main painting + label */}
                <div className="museum-main-exhibit flex flex-col items-center relative z-10">
                  {/* Today's Main Artwork */}
                  <div
                    ref={mainArtworkRef}
                    onClick={(event) => { event.stopPropagation(); if (suppressCameraClickRef.current) { suppressCameraClickRef.current = false; return; } toggleZoom(); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleZoom();
                      }
                    }}
                    role="button"
                    tabIndex={isArtworkSolo ? 0 : -1}
                    aria-label={`${seasonalArtwork.title} — ${language === 'IT' ? (isArtworkZoomed ? 'Riduci' : 'Osserva da vicino') : (isArtworkZoomed ? 'Zoom out' : 'Look closer')}`}
                    aria-pressed={isArtworkZoomed}
                    className={`museum-frame-inner relative outline-none focus-visible:ring-2 focus-visible:ring-[#DE6B58] frame-style-photographic`}
                  >
                    <img
                      src={seasonalArtwork.imageUrl}
                      alt={seasonalArtwork.title}
                      className="museum-frame-image"
                      draggable={false}
                    />
                  </div>

                  {/* A small, flush-mounted museum label remains on the wall during approach. */}
                  {seasonalArtwork.sourceUrl ? (
                    <a
                      onClick={(event) => event.stopPropagation()}
                      href={seasonalArtwork.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="museum-wall-label relative z-20"
                      title={language === 'IT' ? 'Vedi sul sito del museo / fonte' : 'View on museum / source website'}
                    >
                      <span className="museum-label-mount left" aria-hidden="true" />
                      <span className="museum-label-mount right" aria-hidden="true" />
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
                    <div className="museum-wall-label relative z-20">
                      <span className="museum-label-mount left" aria-hidden="true" />
                      <span className="museum-label-mount right" aria-hidden="true" />
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

            <div className="museum-bench-foreground" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element -- static decorative foreground asset */}
              <img
                src="/museum/day-atlas-museum-bench.webp"
                alt=""
                aria-hidden="true"
                draggable={false}
              />
            </div>
          </div>
        </div>
      )}

      {hasSeasonalReveal && seasonalArtwork ? (
        <aside
          ref={seasonalCaptionRef}
          className={`seasonal-artwork-caption ${captionClassName} ${dark ? 'is-dark' : ''} ${isArtworkSolo ? 'is-visible is-solo-mode' : ''} ${isArtworkZoomed ? 'is-zoomed-hidden' : ''}`}
          aria-label={seasonalCaptionLabel}
          data-reveal-readability
          onClick={() => setIsArtworkSolo((previous) => {
            if (previous) closeArtworkZoom();
            return !previous;
          })}
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
            willChange: 'transform',
          }}
        />
      </div>

      {showEspresso ? (
        <div
          ref={deskLayerRef}
          aria-hidden="true"
          className="safe-viewport-backdrop fixed z-0 pointer-events-none overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            contain: 'layout paint style',
            willChange: 'transform',
          }}
        >
          <div
            className="desk-still-life-layer"
            style={{
              opacity: isArtworkSolo ? 0 : 1,
              transform: isArtworkSolo ? 'translate3d(-18px, -14px, 0) scale(0.985)' : 'translate3d(0, 0, 0) scale(1)',
              transition: isArtworkSolo
                ? 'opacity 300ms ease-out, transform 460ms cubic-bezier(0.22, 1, 0.36, 1)'
                : 'opacity 360ms ease-out 220ms, transform 500ms cubic-bezier(0.22, 1, 0.36, 1) 220ms',
              willChange: 'transform, opacity',
            }}
          >
            <SceneRenderer season={season} isDark={dark} draft={sceneDraft} viewport={sceneViewport} />
          </div>
        </div>
      ) : null}

      {/* Contenuto */}
      <div 
        inert={isArtworkSolo}
        className={`relative z-10 ${hasSeasonalReveal ? 'seasonal-reveal-content' : ''} ${isArtworkSolo ? 'is-artwork-solo' : ''}`}
        style={{
          opacity: isArtworkSolo ? 0 : 1,
          pointerEvents: isArtworkSolo ? 'none' : 'auto',
          transition: isArtworkSolo
            ? 'opacity 1350ms cubic-bezier(0.22, 1, 0.36, 1)'
            : 'opacity 500ms ease-out 350ms',
        }}
      >
        {children}
      </div>

      {hasSeasonalReveal && seasonalArtwork ? (
        <div
          aria-hidden="true"
          className={`museum-dissolve-veil safe-viewport-backdrop fixed inset-0 z-30 pointer-events-none ${
            isArtworkSolo ? 'is-active' : ''
          }`}
        />
      ) : null}
    </>
  );
}
