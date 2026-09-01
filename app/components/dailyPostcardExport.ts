import { blobToDataUrl } from '@/lib/browser-utils';
import { garamond } from '@/lib/fonts';

export const DAILY_POSTCARD_EXPORT_WIDTH = 720;
export const DAILY_POSTCARD_EXPORT_HEIGHT = 480;
export const DAILY_POSTCARD_EXPORT_PIXEL_RATIO = 4;

const IMAGE_WAIT_TIMEOUT_MS = 8_000;
const JPEG_QUALITY = 0.96;
const POSTCARD_EXPORT_VARIABLES = [
  '--postcard-paper',
  '--postcard-paper-deep',
  '--postcard-ink',
  '--postcard-rule',
] as const;

export type DailyPostcardFace = 'front' | 'back';

function decodeImage(image: HTMLImageElement) {
  if (image.naturalWidth <= 0 || typeof image.decode !== 'function') return Promise.resolve();
  return image.decode().catch(() => undefined);
}

function waitForImage(image: HTMLImageElement) {
  return new Promise<void>((resolve) => {
    let timeoutId: number | null = null;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      image.removeEventListener('load', finish);
      image.removeEventListener('error', finish);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      void decodeImage(image).finally(resolve);
    };

    if (image.complete) {
      finish();
      return;
    }

    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
    timeoutId = window.setTimeout(finish, IMAGE_WAIT_TIMEOUT_MS);
  });
}

async function waitForImages(root: HTMLElement) {
  await Promise.all(Array.from(root.querySelectorAll<HTMLImageElement>('img')).map(waitForImage));
}

function resolveImageSource(source: string) {
  try {
    const resolved = new URL(source, window.location.href);
    if (resolved.origin === window.location.origin) return resolved.href;
    return `/api/image-proxy?url=${encodeURIComponent(resolved.href)}`;
  } catch {
    return source;
  }
}

async function fetchImageDataUrl(source: string) {
  const response = await fetch(resolveImageSource(source), {
    cache: 'force-cache',
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error(`Immagine non disponibile (${response.status}).`);
  return blobToDataUrl(await response.blob());
}

async function inlineCloneImages(root: HTMLElement, sourceRoot: HTMLElement) {
  const cloneImages = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
  const sourceImages = Array.from(sourceRoot.querySelectorAll<HTMLImageElement>('img'));

  await Promise.all(cloneImages.map(async (image, index) => {
    const sourceImage = sourceImages[index] ?? image;
    const source = sourceImage.currentSrc || sourceImage.src || image.currentSrc || image.src;
    if (!source || /^(?:data|blob):/iu.test(source)) return;

    const dataUrl = await fetchImageDataUrl(source);
    image.removeAttribute('srcset');
    image.removeAttribute('loading');
    image.src = dataUrl;
    await decodeImage(image);
  }));
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function copyPostcardVariables(sourceCard: HTMLElement, target: HTMLElement) {
  const sourceStyle = window.getComputedStyle(sourceCard);
  POSTCARD_EXPORT_VARIABLES.forEach((property) => {
    const value = sourceStyle.getPropertyValue(property).trim();
    if (value) target.style.setProperty(property, value);
  });
  target.style.color = sourceStyle.color;
}

function createExportFrame(sourceCard: HTMLElement, face: DailyPostcardFace, fontFamily: string) {
  const clone = sourceCard.cloneNode(true) as HTMLElement;
  const selectedFaceClass = `daily-postcard-${face}`;

  clone.querySelectorAll<HTMLElement>('.daily-postcard-face').forEach((faceNode) => {
    if (!faceNode.classList.contains(selectedFaceClass)) {
      faceNode.remove();
      return;
    }

    faceNode.removeAttribute('aria-hidden');
    faceNode.style.backfaceVisibility = 'visible';
    faceNode.style.transform = 'none';
  });

  clone.classList.remove('is-flipped');
  clone.classList.add('daily-postcard-export-card', garamond.className);
  clone.removeAttribute('aria-label');
  clone.removeAttribute('aria-pressed');
  clone.removeAttribute('role');
  clone.removeAttribute('tabindex');
  Object.assign(clone.style, {
    boxSizing: 'border-box',
    fontFamily,
    height: `${DAILY_POSTCARD_EXPORT_HEIGHT}px`,
    inset: 'auto',
    margin: '0',
    maxHeight: 'none',
    maxWidth: 'none',
    overflow: 'hidden',
    pointerEvents: 'none',
    position: 'relative',
    transform: 'none',
    transformOrigin: 'top left',
    transition: 'none',
    width: `${DAILY_POSTCARD_EXPORT_WIDTH}px`,
    willChange: 'auto',
  });

  const exportFrame = document.createElement('div');
  exportFrame.className = `${garamond.className} daily-postcard-export-frame`;
  Object.assign(exportFrame.style, {
    backgroundColor: face === 'back' ? '#f2eadb' : '#e6d8c0',
    boxSizing: 'border-box',
    height: `${DAILY_POSTCARD_EXPORT_HEIGHT}px`,
    left: '0',
    opacity: '0.001',
    overflow: 'hidden',
    pointerEvents: 'none',
    position: 'fixed',
    top: '0',
    width: `${DAILY_POSTCARD_EXPORT_WIDTH}px`,
    zIndex: '0',
  });
  // The live card inherits these variables from `.daily-postcard`. The
  // export frame is mounted directly under body, so copy them explicitly or
  // the back's ink, divider, and address rules fall back to the page theme.
  copyPostcardVariables(sourceCard, exportFrame);
  exportFrame.appendChild(clone);
  document.body.appendChild(exportFrame);

  return { clone, exportFrame };
}

function dataUrlToBlob(dataUrl: string) {
  const [metadata, encoded] = dataUrl.split(',', 2);
  if (!metadata || !encoded) throw new Error('Il JPEG generato non è valido.');

  const binary = window.atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);

  const mimeType = /^data:([^;]+)/iu.exec(metadata)?.[1] || 'image/jpeg';
  return new Blob([bytes], { type: mimeType });
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = objectUrl;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export async function downloadDailyPostcardFace(
  sourceCard: HTMLElement,
  dataIso: string,
  face: DailyPostcardFace,
) {
  await document.fonts.ready;
  const { getFontEmbedCSS, toJpeg } = await import('html-to-image');
  const sourceFontFamily = window.getComputedStyle(sourceCard).fontFamily;
  // JaneAust is shipped as a local TTF. Restricting html-to-image to WOFF2
  // silently removes that face from the embedded stylesheet and makes the
  // exported wordmark fall back to a browser serif/cursive font.
  const fontEmbedCSS = await getFontEmbedCSS(sourceCard);

  const sourceFace = sourceCard.querySelector<HTMLElement>(`.daily-postcard-${face}`);
  if (!sourceFace) throw new Error(`Faccia ${face} della cartolina non trovata.`);

  await waitForImages(sourceFace);
  const { clone, exportFrame } = createExportFrame(sourceCard, face, sourceFontFamily);

  try {
    await inlineCloneImages(clone, sourceFace);
    await waitForImages(clone);
    await waitForNextPaint();

    const dataUrl = await toJpeg(exportFrame, {
      backgroundColor: face === 'back' ? '#f2eadb' : '#e6d8c0',
      cacheBust: false,
      fontEmbedCSS,
      height: DAILY_POSTCARD_EXPORT_HEIGHT,
      includeQueryParams: true,
      pixelRatio: DAILY_POSTCARD_EXPORT_PIXEL_RATIO,
      quality: JPEG_QUALITY,
      style: {
        opacity: '1',
        transform: 'none',
      },
      width: DAILY_POSTCARD_EXPORT_WIDTH,
    });
    const filename = `cartolina-${dataIso}-${face === 'front' ? 'fronte' : 'retro'}.jpeg`;
    triggerBlobDownload(dataUrlToBlob(dataUrl), filename);
  } finally {
    exportFrame.remove();
  }
}
