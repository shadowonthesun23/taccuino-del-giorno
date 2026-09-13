import { toPng } from 'html-to-image';

const IMAGE_WAIT_TIMEOUT_MS = 8_000;
const MAX_OUTPUT_DIMENSION = 4_096;
const MAX_OUTPUT_PIXELS = 16_000_000;

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
        reject(new Error('Una delle immagini della sala non è disponibile.'));
        return;
      }
      if (typeof image.decode === 'function') {
        void image.decode().then(() => resolve()).catch(() => reject(new Error('Impossibile decodificare una delle immagini della sala.')));
      } else {
        resolve();
      }
    };
    const handleLoad = () => finish();
    const handleError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Impossibile caricare una delle immagini della sala.'));
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
      reject(new Error('Tempo di attesa scaduto durante il caricamento della sala.'));
    }, IMAGE_WAIT_TIMEOUT_MS);
  });
}

async function waitForRoomAssets(root: HTMLElement) {
  await Promise.all(Array.from(root.querySelectorAll<HTMLImageElement>('img')).map(waitForImage));
  if ('fonts' in document) await document.fonts.ready;
}

function getSafePixelRatio(width: number, height: number) {
  const desiredRatio = Math.max(1, window.devicePixelRatio || 1);
  const dimensionRatio = Math.min(MAX_OUTPUT_DIMENSION / width, MAX_OUTPUT_DIMENSION / height);
  const pixelRatio = Math.sqrt(MAX_OUTPUT_PIXELS / (width * height));
  return Math.max(1, Math.min(desiredRatio, dimensionRatio, pixelRatio));
}

function getDownloadName(date: string | null, width: number, height: number) {
  const datePart = date ? `-${date}` : '';
  return `Day-Atlas-Museum${datePart}-${width}x${height}.png`;
}

function triggerDownload(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export interface MuseumRoomExportResult {
  width: number;
  height: number;
}

export async function downloadMuseumRoomWallpaper(): Promise<MuseumRoomExportResult> {
  const sourceRoom = document.querySelector<HTMLElement>('.museum-gallery-room.is-open');
  if (!sourceRoom) throw new Error('La sala museale non è aperta.');

  await waitForRoomAssets(sourceRoom);

  const cssWidth = Math.max(1, Math.round(window.innerWidth));
  const cssHeight = Math.max(1, Math.round(window.innerHeight));
  const pixelRatio = getSafePixelRatio(cssWidth, cssHeight);
  const outputWidth = Math.round(cssWidth * pixelRatio);
  const outputHeight = Math.round(cssHeight * pixelRatio);

  const clone = sourceRoom.cloneNode(true) as HTMLElement;
  clone.classList.remove('is-close', 'is-exiting');
  clone.classList.add('is-open', 'is-exporting');
  clone.removeAttribute('inert');
  clone.setAttribute('aria-hidden', 'true');
  clone.querySelectorAll('.museum-room-exit, .museum-room-download').forEach((element) => element.remove());

  Object.assign(clone.style, {
    position: 'fixed',
    inset: '0 auto auto 0',
    width: `${cssWidth}px`,
    height: `${cssHeight}px`,
    zIndex: '-2147483647',
    pointerEvents: 'none',
    overflow: 'hidden',
  });

  const camera = clone.querySelector<HTMLElement>('.museum-camera');
  if (!camera) throw new Error('Composizione della sala non disponibile.');
  camera.classList.remove('is-dragging');
  camera.style.transform = 'translate3d(0px, 0px, 0) scale(1)';
  camera.style.transition = 'none';
  camera.style.width = '100%';
  camera.style.height = '100%';

  const bench = clone.querySelector<HTMLElement>('.museum-bench-foreground');
  if (bench) {
    const benchWidth = Math.min(470, Math.max(350, cssWidth * 0.27));
    bench.style.width = `${benchWidth}px`;
  }

  document.body.appendChild(clone);

  try {
    await waitForRoomAssets(clone);
    const dataUrl = await toPng(clone, {
      width: cssWidth,
      height: cssHeight,
      pixelRatio,
      cacheBust: true,
      backgroundColor: '#494b3c',
    });
    const date = clone.querySelector<HTMLTimeElement>('.museum-room-signage time')?.dateTime || null;
    triggerDownload(dataUrl, getDownloadName(date, outputWidth, outputHeight));
    return { width: outputWidth, height: outputHeight };
  } finally {
    clone.remove();
  }
}
