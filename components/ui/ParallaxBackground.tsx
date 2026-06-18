'use client';

import React, { useEffect, useRef, useState } from 'react';

type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
const revealSeasons: SeasonId[] = ['spring', 'summer'];

export default function ParallaxBackground({
  children,
  season,
}: {
  children: React.ReactNode;
  season?: SeasonId;
}) {
  const imageRef = useRef<HTMLDivElement>(null);
  const lineArtRef = useRef<HTMLDivElement>(null);
  const seasonalRevealRef = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState(false);
  const hasSeasonalReveal = season ? revealSeasons.includes(season) : false;

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

    const updateParallax = () => {
      const image = imageRef.current;
      if (!image) {
        frame = null;
        return;
      }

      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const maxScroll = docHeight - winHeight;
      const scrollProgress = maxScroll > 0 ? scrollTop / maxScroll : 0;

      image.style.transform = `translate3d(0, -${scrollProgress * 33.33}%, 0)`;
      frame = null;
    };

    const handleScroll = () => {
      if (frame === null) frame = window.requestAnimationFrame(updateParallax);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    updateParallax();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const reveal = seasonalRevealRef.current;
    const lineArt = lineArtRef.current;
    if (!reveal || !lineArt || !hasSeasonalReveal) return;

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
      headX += (targetX - headX) * 0.22;
      headY += (targetY - headY) * 0.22;
      tailX += (headX - tailX) * 0.2;
      tailY += (headY - tailY) * 0.2;
      wakeX = headX * 0.68 + tailX * 0.32;
      wakeY = headY * 0.68 + tailY * 0.32;
      velocity *= 0.86;

      const pulse = Math.sin(time * 0.0038) * 4;
      const trailDistance = Math.hypot(headX - tailX, headY - tailY);
      const headRadiusX = Math.min(188, 132 + velocity * 0.9 + pulse);
      const headRadiusY = Math.min(152, 112 + velocity * 0.42 - pulse * 0.25);
      const wakeRadius = Math.min(154, Math.max(88, trailDistance * 0.24 + 70));
      const tailRadius = Math.min(84, 58 + trailDistance * 0.045);

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
      velocity = Math.min(34, velocity * 0.35 + pointerDistance * 0.34);
      previousTargetX = targetX;
      previousTargetY = targetY;
      const readabilityProtection = getReadabilityProtection(targetX, targetY);
      const regularOpacity = dark ? 0.54 : 0.82;
      const protectedOpacity = dark ? 0.2 : 0.36;
      const revealOpacity =
        regularOpacity - (regularOpacity - protectedOpacity) * readabilityProtection;

      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
      reveal.style.opacity = revealOpacity.toFixed(3);
      lineArt.classList.add('is-disturbed');
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
    };
  }, [dark, hasSeasonalReveal, season]);

  const bgColor = dark ? '#252422' : '#F8F6F0';
  const imageOpacity = dark ? 0.29 : 0.13;
  const imageFilter = dark
    ? 'grayscale(1) brightness(0.68) contrast(1.02)'
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
            'safe-viewport-backdrop fixed z-0 pointer-events-none',
            dark ? 'is-dark' : '',
          ].join(' ')}
        />
      )}

      {/* Immagine parallax sovrapposta */}
      <div
        ref={lineArtRef}
        className={`safe-viewport-backdrop fixed z-0 pointer-events-none overflow-hidden ${
          hasSeasonalReveal ? 'seasonal-line-art' : ''
        }`}
      >
        <div
          ref={imageRef}
          className="absolute top-0 left-0 w-full h-[150vh] will-change-transform"
          style={{
            backgroundImage: `url('/images/sfondo-taccuino.webp')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backfaceVisibility: 'hidden',
            contain: 'layout paint style',
            transform: 'translate3d(0, 0, 0)',
            filter: imageFilter,
            opacity: imageOpacity,
          }}
        />
      </div>

      {/* Contenuto */}
      <div className={`relative z-10 ${hasSeasonalReveal ? 'seasonal-reveal-content' : ''}`}>
        {children}
      </div>
    </>
  );
}
