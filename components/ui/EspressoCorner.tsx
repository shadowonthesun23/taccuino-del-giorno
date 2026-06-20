'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import coffeeDark from '@/public/images/coffee-darkmode.png';
import coffeeWhite from '@/public/images/coffee-white2.png';

type SmokeParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  growth: number;
  age: number;
  life: number;
  opacity: number;
  rotation: number;
  spin: number;
  phase: number;
};

const FRAME_INTERVAL = 1000 / 30;
const SIMULATION_INTERVAL = 1000 / 60;
const MAX_PARTICLES = 72;
const SMOKE_CONFIG = {
  density: 3,
  windForce: 0.6,
  windAngle: 60,
  originX: 0.5,
  originY: 0.5,
} as const;
const CANVAS_EXTENT = {
  left: 0.275,
  top: 0.55,
  width: 1.55,
  height: 1.65,
} as const;

function deterministicNoise(x: number, y: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function makeSmokeTexture(isDark: boolean) {
  const size = 128;
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const context = sprite.getContext('2d');
  if (!context) return sprite;

  const image = context.createImageData(size, size);
  const center = size / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x - center) / center;
      const ny = (y - center) / center;
      const radius = Math.hypot(nx, ny);
      const angle = Math.atan2(ny, nx);
      const edgeWarp = 0.9 + Math.sin(angle * 3.1) * 0.055 + Math.sin(angle * 7.3) * 0.025;
      const falloff = Math.max(0, 1 - radius / edgeWarp);
      const broadNoise = 0.76 + Math.sin(x * 0.13 + y * 0.09) * 0.1;
      const fineNoise = 0.84 + deterministicNoise(x * 0.31, y * 0.31) * 0.16;
      const alpha = Math.round(255 * Math.pow(falloff, 1.85) * broadNoise * fineNoise);
      const index = (y * size + x) * 4;

      image.data[index] = isDark ? 232 : 190;
      image.data[index + 1] = isDark ? 227 : 185;
      image.data[index + 2] = isDark ? 218 : 176;
      image.data[index + 3] = alpha;
    }
  }

  context.putImageData(image, 0, 0);
  return sprite;
}

export default function EspressoCorner({ isDark }: { isDark: boolean }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = isDark ? 'dark' : 'light';
  const [loadedTheme, setLoadedTheme] = useState<'light' | 'dark' | null>(null);
  const imageReady = loadedTheme === theme;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    const desktopQuery = window.matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)');
    if (!imageReady || !wrapper || !canvas || !desktopQuery.matches) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const smokeTexture = makeSmokeTexture(isDark);
    const particles: SmokeParticle[] = [];
    const pointer = { x: 0, y: 0, activeUntil: 0 };
    const windRadians = SMOKE_CONFIG.windAngle * (Math.PI / 180);
    const windX = Math.cos(windRadians) * SMOKE_CONFIG.windForce * 0.03;
    const windY = Math.sin(windRadians) * SMOKE_CONFIG.windForce * 0.03;
    let cssWidth = 1;
    let cssHeight = 1;
    let scale = 1;
    let frame = 0;
    let lastFrame = 0;
    let spawnCarry = 0;
    let visible = true;
    let pageVisible = !document.hidden;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cssWidth = Math.max(1, rect.width);
      cssHeight = Math.max(1, rect.height);
      scale = wrapper.getBoundingClientRect().width / 300;
      canvas.width = Math.round(cssWidth * dpr);
      canvas.height = Math.round(cssHeight * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawnParticle = (prewarm = false) => {
      if (particles.length >= MAX_PARTICLES) return;
      const originX = cssWidth * ((CANVAS_EXTENT.left + SMOKE_CONFIG.originX) / CANVAS_EXTENT.width);
      const originY = cssHeight * ((CANVAS_EXTENT.top + SMOKE_CONFIG.originY) / CANVAS_EXTENT.height);
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * 45 * scale;
      const life = 70 + Math.random() * 90;
      const age = prewarm ? Math.random() * life * 0.72 : 0;
      const upwardSpeed = (0.52 + Math.random() * 0.34) * scale;

      particles.push({
        x: originX + Math.cos(angle) * distance,
        y: originY + Math.sin(angle) * distance - age * upwardSpeed * 0.5,
        vx: (Math.random() - 0.5) * 0.2 * scale,
        vy: -upwardSpeed,
        width: (19 + Math.random() * 17) * scale,
        height: (31 + Math.random() * 25) * scale,
        growth: (0.42 + Math.random() * 0.32) * scale,
        age,
        life,
        opacity: isDark
          ? 0.13 + Math.random() * 0.08
          : 0.2 + Math.random() * 0.1,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.008,
        phase: Math.random() * Math.PI * 2,
      });
    };

    const paint = (time: number) => {
      if (!visible || !pageVisible) {
        frame = 0;
        return;
      }
      frame = window.requestAnimationFrame(paint);
      if (time - lastFrame < FRAME_INTERVAL) return;

      const elapsed = Math.min(3, (time - lastFrame) / SIMULATION_INTERVAL || 1);
      lastFrame = time;
      context.clearRect(0, 0, cssWidth, cssHeight);

      spawnCarry += SMOKE_CONFIG.density * 0.25 * elapsed;
      while (spawnCarry >= 1) {
        spawnParticle();
        spawnCarry -= 1;
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.age += elapsed;
        const progress = particle.age / particle.life;
        if (progress >= 1 || particle.y < -particle.height) {
          particles.splice(index, 1);
          continue;
        }

        const drift = Math.sin(time * 0.00125 + particle.phase + progress * 4.2);
        particle.vx += (drift * 0.014 + windX) * scale * elapsed;
        particle.vy += windY * scale * elapsed;
        particle.vx *= Math.pow(0.985, elapsed);
        particle.vy *= Math.pow(0.992, elapsed);

        if (pointer.activeUntil > time) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          const reach = 60 * scale;
          if (distance > 0.01 && distance < reach) {
            const force = ((reach - distance) / reach) * scale * elapsed;
            particle.vx += (dx / distance) * force * 0.25;
            particle.vy += (dy / distance) * force * 0.15;
          }
        }

        particle.x += particle.vx * elapsed;
        particle.y += particle.vy * elapsed;
        particle.width += particle.growth * elapsed;
        particle.height += particle.growth * 1.18 * elapsed;
        particle.rotation += particle.spin * elapsed;

        const fadeIn = Math.min(1, progress / 0.16);
        const fadeOut = Math.min(1, (1 - progress) / 0.42);
        const alpha = particle.opacity * fadeIn * fadeOut;

        context.save();
        context.globalAlpha = alpha;
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.drawImage(
          smokeTexture,
          -particle.width / 2,
          -particle.height / 2,
          particle.width,
          particle.height,
        );
        context.restore();
      }
    };

    const ensureAnimation = () => {
      if (frame === 0 && visible && pageVisible) {
        lastFrame = performance.now();
        frame = window.requestAnimationFrame(paint);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      if (event.clientX > 520 || event.clientY > 620) return;
      const rect = canvas.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        return;
      }
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.activeUntil = performance.now() + 760;
    };

    const handleVisibility = () => {
      pageVisible = !document.hidden;
      if (!pageVisible && frame !== 0) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      ensureAnimation();
    };

    const resizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible && frame !== 0) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      ensureAnimation();
    });

    resizeObserver.observe(wrapper);
    visibilityObserver.observe(wrapper);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);
    resize();
    for (let index = 0; index < 30; index += 1) spawnParticle(true);
    ensureAnimation();

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [imageReady, isDark]);

  return (
    <div
      ref={wrapperRef}
      className={`espresso-corner ${isDark ? 'is-dark' : ''} ${imageReady ? 'is-ready' : ''}`}
      aria-hidden="true"
    >
      <Image
        key={theme}
        className="espresso-corner-image"
        src={isDark ? coffeeDark : coffeeWhite}
        alt=""
        draggable={false}
        decoding="async"
        loading="eager"
        onLoad={() => setLoadedTheme(theme)}
        sizes="(min-width: 2084px) 500px, (min-width: 1584px) 24vw, 380px"
      />
      <canvas ref={canvasRef} className="espresso-corner-smoke" />
    </div>
  );
}
