import type { CSSProperties } from 'react';
import { THEME_SURFACE } from './constants';

export function isMobileChromiumBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent;
  return window.matchMedia('(max-width: 1179px)').matches
    && /Chrome|Chromium|CriOS|EdgA|EdgiOS/i.test(userAgent);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Impossibile incorporare l’immagine del quadro.'));
    reader.readAsDataURL(blob);
  });
}

export function proxiedImageUrl(url: string | null | undefined): string {
  return url ? `/api/image-proxy?url=${encodeURIComponent(url)}` : '';
}

export function uniqueImageCandidates(...urls: Array<string | null | undefined>): string[] {
  return Array.from(new Set(urls.filter((url): url is string => Boolean(url))));
}

export function applyBrowserTheme(nextDark: boolean) {
  if (typeof document === 'undefined') return;

  const scheme = nextDark ? 'dark' : 'light';
  const color = THEME_SURFACE[scheme];
  const root = document.documentElement;

  root.classList.toggle('dark', nextDark);
  root.dataset.theme = scheme;
  root.style.backgroundColor = color;
  root.style.colorScheme = scheme;

  if (document.body) {
    document.body.style.backgroundColor = color;
    document.body.style.colorScheme = scheme;
  }

  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => {
      meta.content = color;
    });

  let appThemeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-app-theme="true"]');
  if (!appThemeMeta) {
    appThemeMeta = document.createElement('meta');
    appThemeMeta.name = 'theme-color';
    appThemeMeta.dataset.appTheme = 'true';
    document.head.appendChild(appThemeMeta);
  }
  appThemeMeta.content = color;
}

export function runWhenIdle(callback: () => void) {
  if (typeof window === 'undefined') {
    callback();
    return;
  }
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback);
  } else {
    setTimeout(callback, 200);
  }
}

export function getImageLoadingProps(priority = false) {
  return priority
    ? { priority: true, fetchPriority: 'high' as const }
    : { loading: 'lazy' as const, fetchPriority: 'low' as const };
}

export function sampleArtworkAccent(image: HTMLImageElement): { color: string; rgb: string } | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 30;
    canvas.height = 30;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, 30, 30);
    const data = ctx.getImageData(0, 0, 30, 30).data;
    let red = 0, green = 0, blue = 0, totalWeight = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3] / 255;
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (brightness > 28 && brightness < 225) {
        const weight = a * (1 - Math.abs(brightness - 128) / 128);
        red += r * weight;
        green += g * weight;
        blue += b * weight;
        totalWeight += weight;
      }
    }
    if (totalWeight === 0) return null;
    const raw = [red, green, blue].map((channel) => channel / totalWeight);
    const paper = [181, 149, 106];
    const muted = raw.map((channel, index) => Math.round(channel * 0.68 + paper[index] * 0.32));
    const [r, g, b] = muted;
    return {
      color: `#${muted.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`,
      rgb: `${r}, ${g}, ${b}`,
    };
  } catch {
    return null;
  }
}

export function getAmbientLightStyle(now: Date, isDark: boolean): CSSProperties {
  const minute = now.getHours() * 60 + now.getMinutes();
  const stops = [
    { minute: 0, x: 47, y: 6, color: [193, 205, 218], alpha: 0.1 },
    { minute: 360, x: 24, y: 10, color: [255, 219, 168], alpha: 0.22 },
    { minute: 600, x: 39, y: 7, color: [255, 237, 199], alpha: 0.27 },
    { minute: 780, x: 52, y: 5, color: [255, 243, 211], alpha: 0.24 },
    { minute: 1020, x: 68, y: 9, color: [255, 220, 159], alpha: 0.24 },
    { minute: 1230, x: 78, y: 12, color: [235, 174, 125], alpha: 0.18 },
    { minute: 1320, x: 63, y: 8, color: [193, 205, 218], alpha: 0.11 },
    { minute: 1440, x: 47, y: 6, color: [193, 205, 218], alpha: 0.1 },
  ];
  const upperIndex = stops.findIndex((stop) => stop.minute >= minute);
  const upper = stops[Math.max(1, upperIndex)];
  const lower = stops[Math.max(0, upperIndex - 1)];
  const progress = Math.max(0, Math.min(1, (minute - lower.minute) / (upper.minute - lower.minute)));

  const x = Math.round(lower.x + (upper.x - lower.x) * progress);
  const y = Math.round(lower.y + (upper.y - lower.y) * progress);
  const [r, g, b] = lower.color.map((channel, i) => Math.round(channel + (upper.color[i] - channel) * progress));
  const alpha = lower.alpha + (upper.alpha - lower.alpha) * progress;

  const radialGradient = isDark
    ? `radial-gradient(circle at ${x}% ${y}%, rgba(26,24,22,0.92) 0%, rgba(20,19,17,0.98) 60%, rgba(13,12,11,1) 100%)`
    : `radial-gradient(circle at ${x}% ${y}%, rgba(${r},${g},${b},${alpha}) 0%, rgba(248,246,240,0) 80%)`;

  return {
    backgroundImage: radialGradient,
    '--ambient-indicator-x': `${x}%`,
    '--ambient-indicator-y': `${y}%`,
    '--ambient-indicator-color': `rgb(${r}, ${g}, ${b})`,
    '--journal-material-opacity': isDark ? 0.56 : 0.9,
  } as CSSProperties;
}
