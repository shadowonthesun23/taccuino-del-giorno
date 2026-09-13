'use client';

const MAX_EXPORT_PIXELS = 18_000_000;
const IMAGE_WAIT_TIMEOUT_MS = 8_000;

export interface MuseumWallpaperSize {
  cssWidth: number;
  cssHeight: number;
  outputWidth: number;
  outputHeight: number;
  pixelRatio: number;
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function waitForImage(image: HTMLImageElement) {
  return new Promise<void>((resolve, reject) => {
    let timeoutId: number | null = null;
    let settled = false;

    const cleanup = () => {
      image.removeEventListener('load', handleLoad);
      image.removeEventListener('error', handleError);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        reject(new Error('Una risorsa della sala non è disponibile.'));
        return;
      }
      if (typeof image.decode === 'function') {
        void image.decode().then(() => resolve()).catch(() => resolve());
      } else {
        resolve();
      }
    };
    const handleLoad = () => finish();
    const handleError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Impossibile caricare una risorsa della sala.'));
    };

    if (image.complete) {
      finish();
      return;
    }

    image.addEventListener('load', handleLoad, { once: true });
    image.addEventListener('error', handleError, { once: true });
    timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Timeout durante il caricamento delle risorse della sala.'));
    }, IMAGE_WAIT_TIMEOUT_MS);
  });
}

async function waitForImages(root: HTMLElement) {
  await Promise.all(Array.from(root.querySelectorAll<HTMLImageElement>('img')).map(waitForImage));
}

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function getMuseumWallpaperSize(): MuseumWallpaperSize {
  const cssWidth = Math.max(1, Math.round(window.screen?.width || window.innerWidth));
  const cssHeight = Math.max(1, Math.round(window.screen?.height || window.innerHeight));
  const nativePixelRatio = Math.max(1, window.devicePixelRatio || 1);
  const nativePixels = cssWidth * cssHeight * nativePixelRatio * nativePixelRatio;
  const pixelRatio = nativePixels > MAX_EXPORT_PIXELS
    ? nativePixelRatio * Math.sqrt(MAX_EXPORT_PIXELS / nativePixels)
    : nativePixelRatio;

  return {
    cssWidth,
    cssHeight,
    pixelRatio,
    outputWidth: Math.round(cssWidth * pixelRatio),
    outputHeight: Math.round(cssHeight * pixelRatio),
  };
}

function prepareBench(clone: HTMLElement) {
  const bench = clone.querySelector<HTMLElement>('.museum-bench-foreground');
  if (!bench) return;

  Object.assign(bench.style, {
    position: 'absolute',
    zIndex: '20',
    bottom: '-32px',
    left: '50%',
    display: 'block',
    width: 'clamp(350px, 27vw, 470px)',
    pointerEvents: 'none',
    transform: 'translateX(-50%)',
  });
}

function createExportRoom(sourceCamera: HTMLElement, size: MuseumWallpaperSize) {
  const room = document.createElement('div');
  room.className = 'museum-gallery-room museum-wallpaper-export';
  Object.assign(room.style, {
    background: '#494b3c',
    boxSizing: 'border-box',
    height: `${size.cssHeight}px`,
    left: '-200vw',
    opacity: '0.001',
    overflow: 'hidden',
    pointerEvents: 'none',
    position: 'fixed',
    top: '0',
    width: `${size.cssWidth}px`,
    zIndex: '-1',
  });

  const camera = sourceCamera.cloneNode(true) as HTMLElement;
  camera.classList.remove('is-dragging');
  camera.removeAttribute('style');
  Object.assign(camera.style, {
    height: '100%',
    inset: '0',
    position: 'absolute',
    transform: 'translate3d(0, 0, 0) scale(1)',
    transition: 'none',
    width: '100%',
    willChange: 'auto',
  });

  camera.querySelectorAll<HTMLElement>('[role="button"]').forEach((node) => {
    node.removeAttribute('role');
    node.removeAttribute('tabindex');
    node.removeAttribute('aria-pressed');
  });
  camera.querySelectorAll<HTMLAnchorElement>('a').forEach((node) => {
    node.removeAttribute('href');
    node.removeAttribute('target');
    node.removeAttribute('rel');
  });

  prepareBench(camera);
  room.appendChild(camera);
  document.body.appendChild(room);
  return room;
}

export async function downloadMuseumRoomWallpaper(sourceCamera: HTMLElement) {
  const size = getMuseumWallpaperSize();
  await document.fonts.ready;
  await waitForImages(sourceCamera);

  const exportRoom = createExportRoom(sourceCamera, size);
  try {
    await waitForImages(exportRoom);
    await waitForNextPaint();

    const { getFontEmbedCSS, toPng } = await import('html-to-image');
    const fontEmbedCSS = await getFontEmbedCSS(exportRoom);
    const dataUrl = await toPng(exportRoom, {
      backgroundColor: '#494b3c',
      cacheBust: true,
      fontEmbedCSS,
      height: size.cssHeight,
      includeQueryParams: true,
      pixelRatio: size.pixelRatio,
      style: {
        left: '0',
        opacity: '1',
        position: 'relative',
        top: '0',
        transform: 'none',
      },
      width: size.cssWidth,
    });

    triggerDownload(dataUrl, `Day-Atlas-Museum-${size.outputWidth}x${size.outputHeight}.png`);
    return size;
  } finally {
    exportRoom.remove();
  }
}
