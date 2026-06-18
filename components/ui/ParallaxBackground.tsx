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
  const seasonalRevealRef = useRef<HTMLCanvasElement>(null);
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
    const canvas = seasonalRevealRef.current;
    if (!canvas || !hasSeasonalReveal || !season) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const pointerQuery = window.matchMedia(
      '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    );
    let frame: number | null = null;
    let hideTimer: number | null = null;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let initialized = false;
    let imageReady = false;
    let targetX = window.innerWidth * 0.5;
    let targetOpacity = 0;
    let targetY = window.innerHeight * 0.5;
    let currentX = targetX;
    let currentY = targetY;
    let currentOpacity = 0;
    let previousTargetX = 0;
    let previousTargetY = 0;
    let velocity = 0;
    const cellSize = 32;
    const maxRadius = 13;
    const revealRange = 260;
    const dots: Array<{ x: number; y: number; jitter: number }> = [];
    const seasonalImage = new Image();
    seasonalImage.src =
      season === 'summer'
        ? '/images/seasonal/van-gogh-summer-evening.webp'
        : '/images/seasonal/botticelli-primavera.webp';
    const readabilityZones = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal-readability]'),
    );

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

    const resizeCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      dots.length = 0;
      const columns = Math.ceil(width / cellSize) + 1;
      const rows = Math.ceil(height / cellSize) + 1;
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const seed = Math.sin((row + 1) * 12.9898 + (column + 1) * 78.233) * 43758.5453;
          dots.push({
            x: column * cellSize + cellSize * 0.5,
            y: row * cellSize + cellSize * 0.5,
            jitter: seed - Math.floor(seed),
          });
        }
      }
    };

    const drawCoverImage = () => {
      const imageRatio = seasonalImage.width / seasonalImage.height;
      const canvasRatio = width / height;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = seasonalImage.width;
      let sourceHeight = seasonalImage.height;

      if (imageRatio > canvasRatio) {
        sourceWidth = seasonalImage.height * canvasRatio;
        sourceX = (seasonalImage.width - sourceWidth) / 2;
      } else {
        sourceHeight = seasonalImage.width / canvasRatio;
        sourceY = (seasonalImage.height - sourceHeight) / 2;
      }

      ctx.drawImage(seasonalImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
    };

    const drawHalftoneMask = () => {
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = '#000';
      ctx.beginPath();

      for (const dot of dots) {
        const distance = Math.hypot(currentX - dot.x, currentY - dot.y);
        const strength = Math.max(0, 1 - distance / revealRange);
        const radius = Math.max(0, (strength * strength * maxRadius + dot.jitter * 1.8) * currentOpacity);
        if (radius > 0.35) {
          ctx.moveTo(dot.x + radius, dot.y);
          ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        }
      }

      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    };

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      if (!imageReady || currentOpacity < 0.01) return;

      ctx.globalAlpha = dark ? 0.72 : 0.86;
      drawCoverImage();
      ctx.globalAlpha = 1;
      drawHalftoneMask();
    };

    const paintFrame = () => {
      currentX += (targetX - currentX) * 0.22;
      currentY += (targetY - currentY) * 0.22;
      currentOpacity += (targetOpacity - currentOpacity) * 0.2;
      velocity *= 0.86;
      drawFrame();

      const distance =
        Math.abs(targetX - currentX) +
        Math.abs(targetY - currentY) +
        Math.abs(targetOpacity - currentOpacity) * 100;

      if (distance > 0.5 || velocity > 0.3) {
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
        previousTargetX = targetX;
        previousTargetY = targetY;
        initialized = true;
      }

      const pointerDistance = Math.hypot(
        targetX - previousTargetX,
        targetY - previousTargetY,
      );
      velocity = Math.min(30, velocity * 0.32 + pointerDistance * 0.28);
      previousTargetX = targetX;
      previousTargetY = targetY;
      const readabilityProtection = getReadabilityProtection(targetX, targetY);
      const regularOpacity = dark ? 0.54 : 0.68;
      const protectedOpacity = dark ? 0.16 : 0.28;
      targetOpacity =
        regularOpacity - (regularOpacity - protectedOpacity) * readabilityProtection;

      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (frame === null) frame = window.requestAnimationFrame(paintFrame);
    };

    const hideReveal = () => {
      targetOpacity = 0;
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        hideTimer = null;
      }, 360);
      if (frame === null) frame = window.requestAnimationFrame(paintFrame);
    };

    const handleResize = () => {
      resizeCanvas();
      drawFrame();
    };

    const handleImageLoad = () => {
      imageReady = true;
      drawFrame();
    };

    seasonalImage.addEventListener('load', handleImageLoad);
    resizeCanvas();
    if (seasonalImage.complete) handleImageLoad();
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('blur', hideReveal);
    document.documentElement.addEventListener('pointerleave', hideReveal);

    return () => {
      seasonalImage.removeEventListener('load', handleImageLoad);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('blur', hideReveal);
      document.documentElement.removeEventListener('pointerleave', hideReveal);
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
    };
  }, [dark, hasSeasonalReveal, season]);

  const bgColor = dark ? '#252422' : '#F8F6F0';
  const imageOpacity = dark ? 0.21 : 0.13;
  const imageFilter = dark
    ? 'grayscale(1) brightness(0.54) contrast(0.96)'
    : 'saturate(0.72) brightness(1.04) contrast(0.94)';

  return (
    <>
      {/* Sfondo solido che copre tutta la viewport incluse le barre Safari iOS */}
      <div
        className="safe-viewport-backdrop fixed z-0 pointer-events-none"
        style={{ backgroundColor: bgColor, transition: 'background-color 300ms' }}
      />

      {hasSeasonalReveal && (
        <canvas
          ref={seasonalRevealRef}
          aria-hidden="true"
          className={[
            'seasonal-paint-reveal',
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
