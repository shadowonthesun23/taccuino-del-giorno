'use client';

import React, { useEffect, useRef, useState } from 'react';
import EspressoCorner from '@/components/ui/EspressoCorner';
import { getSeasonalArtwork, type SeasonId } from '@/lib/seasonal-artwork';

const revealSeasons: SeasonId[] = ['spring', 'summer'];
// Keep the line-only variant available for a one-line dark-mode swap.
const darkNotebookBackground = '/images/sfondo-taccuino-dark-paper.webp';

export default function ParallaxBackground({
  children,
  season,
  dataIso,
  showEspresso = false,
  captionClassName = '',
}: {
  children: React.ReactNode;
  season?: SeasonId;
  dataIso?: string;
  showEspresso?: boolean;
  captionClassName?: string;
}) {
  const imageRef = useRef<HTMLDivElement>(null);
  const coffeeLayerRef = useRef<HTMLDivElement>(null);
  const lineArtRef = useRef<HTMLDivElement>(null);
  const seasonalRevealRef = useRef<HTMLDivElement>(null);
  const seasonalCaptionRef = useRef<HTMLElement>(null);
  const [dark, setDark] = useState(false);
  const hasSeasonalReveal = season ? revealSeasons.includes(season) : false;
  const seasonalArtwork = season ? getSeasonalArtwork(season, dataIso) : undefined;

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
    };
  }, [dark, hasSeasonalReveal, season]);

  const bgColor = dark ? '#171614' : '#F8F6F0';
  const imageOpacity = dark ? 0.102 : 0.13;
  const imageFilter = dark
    ? 'brightness(0.52) saturate(0.42) contrast(0.72)'
    : 'saturate(0.72) brightness(1.04) contrast(0.94)';

  return (
    <>
      {/* Sfondo solido che copre tutta la viewport incluse le barre Safari iOS */}
      <div
        className="safe-viewport-backdrop fixed z-0 pointer-events-none"
        style={{ backgroundColor: bgColor, transition: 'background-color 300ms' }}
      />

      {hasSeasonalReveal && (
        <div
          ref={seasonalRevealRef}
          aria-hidden="true"
          className={[
            'seasonal-paint-reveal',
            `season-${season}`,
            seasonalArtwork ? `artwork-${seasonalArtwork.id}` : '',
            'safe-viewport-backdrop fixed z-0 pointer-events-none',
            dark ? 'is-dark' : '',
          ].join(' ')}
          style={seasonalArtwork ? {
            backgroundImage: `url('${seasonalArtwork.imageUrl}')`,
            backgroundPosition: seasonalArtwork.revealPosition,
          } : undefined}
        />
      )}

      {hasSeasonalReveal && seasonalArtwork ? (
        <aside
          ref={seasonalCaptionRef}
          className={`seasonal-artwork-caption ${captionClassName} ${dark ? 'is-dark' : ''}`}
          aria-label="Opera stagionale in trasparenza"
          data-reveal-readability
        >
          <span className="seasonal-artwork-hint">Opera nello sfondo · muovi il cursore</span>
          <cite>{seasonalArtwork.title}</cite>, <time>{seasonalArtwork.year}</time>
          <span className="seasonal-artwork-artist">{seasonalArtwork.artist}</span>
          <span className="seasonal-artwork-collection">{seasonalArtwork.collection}</span>
        </aside>
      ) : null}

      {/* Immagine parallax sovrapposta */}
      <div
        ref={lineArtRef}
        className={`notebook-line-art safe-viewport-backdrop fixed z-0 pointer-events-none overflow-hidden ${
          hasSeasonalReveal ? 'seasonal-line-art' : ''
        }`}
        style={{ filter: imageFilter, opacity: imageOpacity }}
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
          className="safe-viewport-backdrop fixed z-0 pointer-events-none overflow-hidden will-change-transform"
          style={{
            backfaceVisibility: 'hidden',
            contain: 'layout paint style',
            transform: 'translate3d(0, 0, 0)',
          }}
        >
          <EspressoCorner isDark={dark} />
        </div>
      ) : null}

      {/* Contenuto */}
      <div className={`relative z-10 ${hasSeasonalReveal ? 'seasonal-reveal-content' : ''}`}>
        {children}
      </div>
    </>
  );
}
