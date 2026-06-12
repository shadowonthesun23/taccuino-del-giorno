'use client';

import React, { useEffect, useRef, useState } from 'react';

type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

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
    if (!reveal || !lineArt || season !== 'spring') return;

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

    const setPaintVariable = (name: string, value: string) => {
      reveal.style.setProperty(name, value);
      lineArt.style.setProperty(name, value);
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

      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
      reveal.style.opacity = dark ? '0.54' : '0.82';
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
  }, [dark, season]);

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

      {season === 'spring' && (
        <div
          ref={seasonalRevealRef}
          aria-hidden="true"
          className={`seasonal-paint-reveal safe-viewport-backdrop fixed z-0 pointer-events-none ${
            dark ? 'is-dark' : ''
          }`}
        />
      )}

      {/* Immagine parallax sovrapposta */}
      <div
        ref={lineArtRef}
        className={`safe-viewport-backdrop fixed z-0 pointer-events-none overflow-hidden ${
          season === 'spring' ? 'seasonal-line-art' : ''
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
      <div className={`relative z-10 ${season === 'spring' ? 'seasonal-reveal-content' : ''}`}>
        {children}
      </div>
    </>
  );
}
