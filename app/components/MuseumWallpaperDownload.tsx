'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { toPng } from 'html-to-image';

const MAX_EXPORT_PIXELS = 16_000_000;
const IMAGE_WAIT_TIMEOUT_MS = 8_000;

type Copy = {
  label: string;
  busy: string;
  error: string;
};

type Resolution = {
  cssWidth: number;
  cssHeight: number;
  pixelRatio: number;
  width: number;
  height: number;
};

const COPY: Record<string, Copy> = {
  IT: { label: 'Scarica sfondo', busy: 'Preparazione…', error: 'Non è stato possibile preparare lo sfondo. Riprova tra poco.' },
  EN: { label: 'Download wallpaper', busy: 'Preparing…', error: 'The wallpaper could not be prepared. Please try again.' },
  FR: { label: 'Télécharger le fond', busy: 'Préparation…', error: 'Impossible de préparer le fond. Réessayez dans un instant.' },
  DE: { label: 'Hintergrund laden', busy: 'Wird vorbereitet…', error: 'Der Hintergrund konnte nicht erstellt werden. Bitte versuche es erneut.' },
  ES: { label: 'Descargar fondo', busy: 'Preparando…', error: 'No se ha podido preparar el fondo. Inténtalo de nuevo.' },
  PT: { label: 'Transferir fundo', busy: 'A preparar…', error: 'Não foi possível preparar o fundo. Tente novamente.' },
};

function getLanguage(pathname: string) {
  const segment = pathname.split('/').filter(Boolean)[0]?.toLowerCase();
  if (segment === 'en') return 'EN';
  if (segment === 'fr') return 'FR';
  if (segment === 'de') return 'DE';
  if (segment === 'es') return 'ES';
  if (segment === 'pt') return 'PT';
  return 'IT';
}

function getResolution(): Resolution {
  const cssWidth = Math.max(1, Math.round(window.screen?.width || window.innerWidth));
  const cssHeight = Math.max(1, Math.round(window.screen?.height || window.innerHeight));
  const requestedRatio = Math.max(1, window.devicePixelRatio || 1);
  const safeRatio = Math.sqrt(MAX_EXPORT_PIXELS / (cssWidth * cssHeight));
  const pixelRatio = Math.max(1, Math.min(requestedRatio, safeRatio));

  return {
    cssWidth,
    cssHeight,
    pixelRatio,
    width: Math.round(cssWidth * pixelRatio),
    height: Math.round(cssHeight * pixelRatio),
  };
}

function localDateStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function waitForImage(image: HTMLImageElement) {
  if (image.complete && image.naturalWidth > 0) {
    return typeof image.decode === 'function' ? image.decode().catch(() => undefined) : Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    let timeoutId: number | null = null;
    const cleanup = () => {
      image.removeEventListener('load', handleLoad);
      image.removeEventListener('error', handleError);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
    const handleLoad = () => {
      cleanup();
      if (image.naturalWidth <= 0) {
        reject(new Error('Museum export image has no natural size.'));
        return;
      }
      if (typeof image.decode === 'function') {
        void image.decode().catch(() => undefined).finally(resolve);
      } else {
        resolve();
      }
    };
    const handleError = () => {
      cleanup();
      reject(new Error(`Museum export image failed to load: ${image.currentSrc || image.src}`));
    };

    image.addEventListener('load', handleLoad, { once: true });
    image.addEventListener('error', handleError, { once: true });
    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Museum export image timed out: ${image.currentSrc || image.src}`));
    }, IMAGE_WAIT_TIMEOUT_MS);
  });
}

async function waitForAssets(root: HTMLElement) {
  if (document.fonts?.ready) await document.fonts.ready;
  await Promise.all(Array.from(root.querySelectorAll<HTMLImageElement>('img')).map(waitForImage));
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

function prepareRoomClone(sourceCamera: HTMLElement, resolution: Resolution) {
  const clone = sourceCamera.cloneNode(true) as HTMLElement;
  clone.classList.remove('is-dragging');
  clone.style.transform = 'translate3d(0px, 0px, 0) scale(1)';
  clone.style.transition = 'none';
  clone.style.cursor = 'default';
  clone.style.touchAction = 'auto';
  clone.style.width = '100%';
  clone.style.height = '100%';

  const frame = clone.querySelector<HTMLElement>('.museum-frame-inner');
  if (frame) {
    frame.removeAttribute('role');
    frame.removeAttribute('tabindex');
    frame.removeAttribute('aria-pressed');
    frame.style.cursor = 'default';
  }

  clone.querySelectorAll<HTMLElement>('a, button').forEach((element) => {
    element.style.pointerEvents = 'none';
  });

  const artwork = clone.querySelector<HTMLImageElement>('.museum-frame-image');
  if (artwork) {
    artwork.style.maxWidth = `calc(${Math.round(resolution.cssWidth * 0.68)}px - 2 * var(--museum-frame-rail))`;
    artwork.style.maxHeight = `${Math.max(180, Math.round(resolution.cssHeight * 0.82 - 230))}px`;
  }

  const bench = clone.querySelector<HTMLElement>('.museum-bench-foreground');
  if (bench) {
    const benchWidth = Math.min(470, Math.max(350, resolution.cssWidth * 0.27));
    bench.style.position = 'absolute';
    bench.style.zIndex = '20';
    bench.style.bottom = '-32px';
    bench.style.left = '50%';
    bench.style.display = 'block';
    bench.style.width = `${Math.round(benchWidth)}px`;
    bench.style.pointerEvents = 'none';
    bench.style.transform = 'translateX(-50%)';
  }

  return clone;
}

async function exportMuseumWallpaper(resolution: Resolution) {
  const sourceCamera = document.querySelector<HTMLElement>('.museum-gallery-room .museum-camera');
  if (!sourceCamera) throw new Error('Museum camera not found.');

  const exportRoot = document.createElement('div');
  exportRoot.className = 'museum-gallery-room museum-wallpaper-export-root';
  exportRoot.setAttribute('aria-hidden', 'true');
  Object.assign(exportRoot.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    width: `${resolution.cssWidth}px`,
    height: `${resolution.cssHeight}px`,
    overflow: 'hidden',
    background: '#494b3c',
    pointerEvents: 'none',
    zIndex: '-1',
  });

  const exportStyle = document.createElement('style');
  exportStyle.textContent = `
    .museum-wallpaper-export-root .museum-camera {
      transform: translate3d(0, 0, 0) scale(1) !important;
      transition: none !important;
      cursor: default !important;
    }
    .museum-wallpaper-export-root .museum-bench-foreground::before {
      position: absolute;
      z-index: -1;
      bottom: 16%;
      left: 11%;
      width: 78%;
      height: 14px;
      border-radius: 50%;
      background: rgb(17 13 9 / 0.31);
      box-shadow: 0 8px 16px rgb(12 10 7 / 0.2);
      content: '';
    }
    .museum-wallpaper-export-root .museum-bench-foreground img {
      display: block;
      width: 100%;
      height: auto;
      clip-path: inset(0 2.25% 0 0);
    }
  `;
  exportRoot.appendChild(exportStyle);
  exportRoot.appendChild(prepareRoomClone(sourceCamera, resolution));
  document.body.appendChild(exportRoot);

  try {
    await waitForAssets(exportRoot);
    const dataUrl = await toPng(exportRoot, {
      width: resolution.cssWidth,
      height: resolution.cssHeight,
      pixelRatio: resolution.pixelRatio,
      backgroundColor: '#494b3c',
      cacheBust: true,
    });

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `Day-Atlas-Museum-${localDateStamp()}-${resolution.width}x${resolution.height}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    exportRoot.remove();
  }
}

export default function MuseumWallpaperDownload() {
  const pathname = usePathname();
  const [roomOpen, setRoomOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const language = getLanguage(pathname || '/');
  const copy = COPY[language] || COPY.EN;

  useEffect(() => {
    const updateOpenState = () => setRoomOpen(document.body.classList.contains('museum-room-open'));
    updateOpenState();
    const observer = new MutationObserver(updateOpenState);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!roomOpen) {
      setResolution(null);
      return;
    }
    const updateResolution = () => setResolution(getResolution());
    updateResolution();
    window.addEventListener('resize', updateResolution);
    return () => window.removeEventListener('resize', updateResolution);
  }, [roomOpen]);

  const actionLabel = useMemo(() => {
    if (!resolution) return copy.label;
    return `${copy.label} · ${resolution.width} × ${resolution.height}`;
  }, [copy.label, resolution]);

  if (!roomOpen) return null;

  return (
    <button
      type="button"
      className="fixed right-[max(22px,env(safe-area-inset-right))] z-[70] hidden min-[768px]:inline-flex min-h-11 items-center gap-2 rounded-[11px] border border-[#fff7e224] bg-[#191d1775] px-[13px] py-[9px] font-[Georgia] text-xs tracking-[0.035em] text-[#f6efdcb8] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.10),0_5px_17px_rgb(8_10_7_/_0.14)] backdrop-blur-[6px] transition-all duration-200 hover:border-[#fff7e238] hover:text-[#fff8eff0] focus-visible:outline-2 focus-visible:outline-[#f4ead5] focus-visible:outline-offset-[5px] disabled:cursor-wait disabled:opacity-65"
      style={{ bottom: 'calc(max(22px, env(safe-area-inset-bottom)) + 56px)' }}
      aria-label={actionLabel}
      title={actionLabel}
      disabled={exporting || !resolution}
      data-scene-safe="interactive"
      onClick={async (event) => {
        event.stopPropagation();
        if (exporting || !resolution) return;
        setExporting(true);
        try {
          await exportMuseumWallpaper(resolution);
        } catch (error) {
          console.error('[museum-wallpaper-export]', error);
          window.alert(copy.error);
        } finally {
          setExporting(false);
        }
      }}
    >
      <Download className="h-[15px] w-[15px] opacity-80" strokeWidth={1.45} aria-hidden="true" />
      <span>{exporting ? copy.busy : copy.label}</span>
    </button>
  );
}
