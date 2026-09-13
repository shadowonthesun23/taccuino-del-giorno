import { blobToDataUrl } from '@/lib/browser-utils';
import { museumCameraTransform, RESTING_MUSEUM_CAMERA } from '@/lib/museum-camera';

export type MuseumRoomExportFormat = 'jpeg' | 'png';

export const MUSEUM_ROOM_JPEG_QUALITY = 0.93;
export const MUSEUM_ROOM_TARGET_PIXEL_RATIO = 2;
export const MUSEUM_ROOM_MAX_SIDE = 4096;

const IMAGE_WAIT_TIMEOUT_MS = 8_000;

export interface MuseumRoomExportResult {
  format: MuseumRoomExportFormat;
  width: number;
  height: number;
  size: number;
  quality?: number;
}

export function getMuseumRoomExportSize(
  cssWidth: number,
  cssHeight: number,
  targetPixelRatio = MUSEUM_ROOM_TARGET_PIXEL_RATIO,
  maxSide = MUSEUM_ROOM_MAX_SIDE,
) {
  const safeWidth = Math.max(1, cssWidth);
  const safeHeight = Math.max(1, cssHeight);
  const pixelRatio = Math.min(targetPixelRatio, maxSide / Math.max(safeWidth, safeHeight));

  return {
    pixelRatio,
    width: Math.max(1, Math.round(safeWidth * pixelRatio)),
    height: Math.max(1, Math.round(safeHeight * pixelRatio)),
  };
}

function describeImageSource(source: string) {
  return source.length > 160 ? `${source.slice(0, 157)}…` : source;
}

function waitForImage(image: HTMLImageElement) {
  return new Promise<void>((resolve, reject) => {
    let timeoutId: number | null = null;
    let settled = false;
    const source = image.currentSrc || image.src || '(sorgente sconosciuta)';
    const cleanup = () => {
      image.removeEventListener('load', finish);
      image.removeEventListener('error', fail);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        reject(new Error(`Risorsa grafica non disponibile: ${describeImageSource(source)}`));
        return;
      }
      void (typeof image.decode === 'function' ? image.decode() : Promise.resolve())
        .then(() => resolve())
        .catch(() => reject(new Error(`Risorsa grafica non decodificata: ${describeImageSource(source)}`)));
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`Risorsa grafica non caricata: ${describeImageSource(source)}`));
    };

    if (image.complete) {
      finish();
      return;
    }

    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', fail, { once: true });
    timeoutId = window.setTimeout(fail, IMAGE_WAIT_TIMEOUT_MS);
  });
}

async function waitForImages(root: HTMLElement) {
  await Promise.all(Array.from(root.querySelectorAll<HTMLImageElement>('img')).map(waitForImage));
}

function resolveImageSource(source: string) {
  const resolved = new URL(source, window.location.href);
  if (resolved.origin === window.location.origin) return resolved.href;
  return `/api/image-proxy?url=${encodeURIComponent(resolved.href)}`;
}

async function fetchImageDataUrl(source: string) {
  if (/^data:image\//iu.test(source)) return source;
  const response = await fetch(/^blob:/iu.test(source) ? source : resolveImageSource(source), {
    cache: 'force-cache',
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error(`Risorsa grafica non recuperabile (HTTP ${response.status}).`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('La risorsa recuperata non è un’immagine valida.');
  return blobToDataUrl(blob);
}

async function inlineCloneImages(clone: HTMLElement) {
  const cache = new Map<string, Promise<string>>();
  await Promise.all(Array.from(clone.querySelectorAll<HTMLImageElement>('img')).map(async (image) => {
    const source = image.currentSrc || image.src;
    if (!source) throw new Error('Una risorsa grafica della stanza non ha una sorgente.');
    let dataUrl = cache.get(source);
    if (!dataUrl) {
      dataUrl = fetchImageDataUrl(source);
      cache.set(source, dataUrl);
    }
    image.removeAttribute('srcset');
    image.removeAttribute('loading');
    image.src = await dataUrl;
    await waitForImage(image);
  }));
}

async function inlineCssImageUrls(value: string, cache: Map<string, Promise<string>>) {
  const sources = Array.from(value.matchAll(/url\((['"]?)(.*?)\1\)/giu))
    .map((match) => match[2])
    .filter((source) => source && !source.startsWith('data:'));
  const replacements = await Promise.all(sources.map(async (source) => {
    let dataUrl = cache.get(source);
    if (!dataUrl) {
      dataUrl = fetchImageDataUrl(source);
      cache.set(source, dataUrl);
    }
    return { source, dataUrl: await dataUrl };
  }));

  return replacements.reduce(
    (result, replacement) => result.split(replacement.source).join(replacement.dataUrl),
    value,
  );
}

async function inlineCriticalCssImages(source: HTMLElement, clone: HTMLElement) {
  const cache = new Map<string, Promise<string>>();
  const pairs = [
    ['.museum-wall-backdrop', ['background-image']],
    ['.museum-frame-inner', ['border-image-source']],
    ['.museum-wall-label', ['background-image']],
  ] as const;

  await Promise.all(pairs.flatMap(([selector, properties]) => {
    const sourceNodes = Array.from(source.querySelectorAll<HTMLElement>(selector));
    const cloneNodes = Array.from(clone.querySelectorAll<HTMLElement>(selector));
    return sourceNodes.flatMap((sourceNode, index) => properties.map(async (property) => {
      const cloneNode = cloneNodes[index];
      if (!cloneNode) return;
      const value = window.getComputedStyle(sourceNode).getPropertyValue(property);
      if (!value.includes('url(')) return;
      cloneNode.style.setProperty(property, await inlineCssImageUrls(value, cache));
    }));
  }));
}

function waitForStablePaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

function prepareExportClone(source: HTMLElement, width: number, height: number) {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  clone.querySelectorAll('[data-export-ignore]').forEach((node) => node.remove());
  clone.classList.remove('is-close', 'is-exiting');
  clone.classList.add('is-open', 'is-export-clone');
  clone.removeAttribute('inert');
  clone.setAttribute('aria-hidden', 'true');
  Object.assign(clone.style, {
    height: `${height}px`,
    inset: 'auto',
    left: 'auto',
    opacity: '1',
    pointerEvents: 'none',
    position: 'relative',
    top: 'auto',
    width: `${width}px`,
    zIndex: 'auto',
  });

  const camera = clone.querySelector<HTMLElement>('.museum-camera');
  if (!camera) throw new Error('Camera della stanza museale non trovata.');
  camera.classList.remove('is-dragging');
  camera.style.transform = museumCameraTransform(RESTING_MUSEUM_CAMERA);
  camera.style.transition = 'none';
  camera.style.willChange = 'auto';
  camera.removeAttribute('tabindex');

  clone.querySelectorAll<HTMLElement>('[tabindex], [role="button"]')
    .forEach((node) => {
      node.removeAttribute('tabindex');
      node.removeAttribute('role');
      node.style.cursor = 'default';
      node.style.outline = 'none';
    });

  return clone;
}

async function convertToJpeg(pngBlob: Blob, backgroundColor: string) {
  const sourceUrl = URL.createObjectURL(pngBlob);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await waitForImage(image);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas JPEG non disponibile.');
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    const jpegBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', MUSEUM_ROOM_JPEG_QUALITY);
    });
    if (!jpegBlob) throw new Error('Impossibile creare il file JPEG.');
    return jpegBlob;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = objectUrl;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }
}

export async function downloadMuseumRoom(
  source: HTMLElement,
  dataIso: string,
  format: MuseumRoomExportFormat,
): Promise<MuseumRoomExportResult> {
  await document.fonts.ready;
  await waitForImages(source);
  const { getFontEmbedCSS, toBlob } = await import('html-to-image');
  const cssWidth = source.clientWidth || window.innerWidth;
  const cssHeight = source.clientHeight || window.innerHeight;
  const exportSize = getMuseumRoomExportSize(cssWidth, cssHeight);
  const backgroundColor = window.getComputedStyle(source).backgroundColor || '#494b3c';
  const fontEmbedCSS = await getFontEmbedCSS(source);
  const clone = prepareExportClone(source, cssWidth, cssHeight);
  const exportFrame = document.createElement('div');
  Object.assign(exportFrame.style, {
    backgroundColor,
    boxSizing: 'border-box',
    height: `${cssHeight}px`,
    left: '0',
    opacity: '0.001',
    overflow: 'hidden',
    pointerEvents: 'none',
    position: 'fixed',
    top: '0',
    width: `${cssWidth}px`,
    zIndex: '0',
  });
  exportFrame.appendChild(clone);
  document.body.appendChild(exportFrame);

  try {
    await inlineCloneImages(clone);
    await inlineCriticalCssImages(source, clone);
    await waitForStablePaint();
    const pngBlob = await toBlob(exportFrame, {
      backgroundColor,
      cacheBust: true,
      fontEmbedCSS,
      height: cssHeight,
      includeQueryParams: true,
      pixelRatio: exportSize.pixelRatio,
      style: { opacity: '1' },
      width: cssWidth,
    });
    if (!pngBlob) throw new Error('Impossibile renderizzare la stanza museale.');
    const blob = format === 'jpeg' ? await convertToJpeg(pngBlob, backgroundColor) : pngBlob;
    const extension = format === 'jpeg' ? 'jpg' : 'png';
    const filename = `day-atlas-museum-room-${dataIso}-${exportSize.width}x${exportSize.height}.${extension}`;
    triggerBlobDownload(blob, filename);
    return {
      format,
      width: exportSize.width,
      height: exportSize.height,
      size: blob.size,
      quality: format === 'jpeg' ? MUSEUM_ROOM_JPEG_QUALITY : undefined,
    };
  } finally {
    exportFrame.remove();
  }
}
