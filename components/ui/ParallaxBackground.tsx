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
    if (!reveal || season !== 'spring') return;

    const pointerQuery = window.matchMedia(
      '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    );
    let frame: number | null = null;
    let initialized = false;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const paintFrame = () => {
      currentX += (targetX - currentX) * 0.16;
      currentY += (targetY - currentY) * 0.16;
      reveal.style.setProperty('--paint-x', `${currentX}px`);
      reveal.style.setProperty('--paint-y', `${currentY}px`);

      if (Math.abs(targetX - currentX) > 0.2 || Math.abs(targetY - currentY) > 0.2) {
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
        currentX = targetX;
        currentY = targetY;
        initialized = true;
      }

      reveal.style.opacity = dark ? '0.2' : '0.42';
      if (frame === null) frame = window.requestAnimationFrame(paintFrame);
    };

    const hideReveal = () => {
      reveal.style.opacity = '0';
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('blur', hideReveal);
    document.documentElement.addEventListener('pointerleave', hideReveal);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('blur', hideReveal);
      document.documentElement.removeEventListener('pointerleave', hideReveal);
      if (frame !== null) window.cancelAnimationFrame(frame);
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
      <div className="safe-viewport-backdrop fixed z-0 pointer-events-none overflow-hidden">
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
      <div className="relative z-10">
        {children}
      </div>
    </>
  );
}
