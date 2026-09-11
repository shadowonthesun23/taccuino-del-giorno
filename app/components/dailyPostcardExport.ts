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

function describeImageSource(source: string) {
  return source.length > 160 ? `${source.slice(0, 157)}…` : source;
}

function decodeImage(image: HTMLImageElement) {
  if (typeof image.decode !== 'function') return Promise.resolve();
  return image.decode();
}

function waitForImage(image: HTMLImageElement) {
  return new Promise<void>((resolve, reject) => {
    let timeoutId: number | null = null;
    let settled = false;
    const source = image.currentSrc || image.src || '(sorgente sconosciuta)';
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
        reject(new Error(`Immagine della cartolina non disponibile: ${describeImageSource(source)}`));
        return;
      }
      void decodeImage(image).then(() => {
        if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
          reject(new Error(`Immagine della cartolina non decodificata: ${describeImageSource(source)}`));
          return;
        }
        resolve();
      }).catch(() => reject(new Error(`Immagine della cartolina non decodificata: ${describeImageSource(source)}`)));
    };
    const handleLoad = () => finish();
    const handleError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`Immagine della cartolina non caricata: ${describeImageSource(source)}`));
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
      reject(new Error(`Timeout caricamento immagine della cartolina: ${describeImageSource(source)}`));
    }, IMAGE_WAIT_TIMEOUT_MS);
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
  if (/^data:image\//iu.test(source)) return source;

  const resolvedSource = /^blob:/iu.test(source) ? source : resolveImageSource(source);
  try {
    const response = await fetch(resolvedSource, {
      cache: 'force-cache',
      credentials: 'same-origin',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error(`tipo ${blob.type || 'sconosciuto'}`);
    return await blobToDataUrl(blob);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'errore sconosciuto';
    throw new Error(`Immagine non recuperabile (${describeImageSource(source)}): ${reason}`);
  }
}

function parseObjectPosition(value: string) {
  const parts = value.trim().split(/\s+/u);
  const parsePart = (part: string | undefined, fallback: number) => {
    if (!part) return fallback;
    if (part === 'left' || part === 'top') return 0;
    if (part === 'center') return 0.5;
    if (part === 'right' || part === 'bottom') return 1;
    if (part.endsWith('%')) {
      const percentage = Number.parseFloat(part);
      if (Number.isFinite(percentage)) return percentage / 100;
    }
    return fallback;
  };

  return {
    x: parsePart(parts[0], 0.5),
    y: parsePart(parts[1], 0.5),
  };
}

function getSvgImageGeometry(
  objectFit: string,
  objectPosition: string,
  boxWidth: number,
  boxHeight: number,
  naturalWidth: number,
  naturalHeight: number,
) {
  if (objectFit === 'fill') return { x: 0, y: 0, width: boxWidth, height: boxHeight };

  const containScale = Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight);
  const scale = objectFit === 'contain'
    ? containScale
    : objectFit === 'scale-down'
      ? Math.min(1, containScale)
      : Math.max(boxWidth / naturalWidth, boxHeight / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  const position = parseObjectPosition(objectPosition);
  return {
    x: (boxWidth - width) * position.x,
    y: (boxHeight - height) * position.y,
    width,
    height,
  };
}

function createSvgRasterReplacement(source: HTMLImageElement, sourceImage: HTMLImageElement, dataUrl: string) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', source.className);
  svg.style.cssText = source.style.cssText;

  const computed = window.getComputedStyle(source);
  const preservedProperties = [
    'position', 'inset', 'top', 'right', 'bottom', 'left', 'width', 'height',
    'transform', 'transform-origin', 'opacity', 'border-radius', 'outline',
    'outline-offset', 'mix-blend-mode', 'z-index',
  ] as const;
  preservedProperties.forEach((property) => {
    svg.style.setProperty(property, computed.getPropertyValue(property));
  });
  svg.style.overflow = 'hidden';

  const boxWidth = Number.parseFloat(computed.width) || source.clientWidth;
  const boxHeight = Number.parseFloat(computed.height) || source.clientHeight;
  if (boxWidth <= 0 || boxHeight <= 0 || sourceImage.naturalWidth <= 0 || sourceImage.naturalHeight <= 0) {
    throw new Error(`Geometria immagine della cartolina non valida: ${describeImageSource(sourceImage.currentSrc || sourceImage.src)}`);
  }
  svg.setAttribute('viewBox', `0 0 ${boxWidth} ${boxHeight}`);
  svg.setAttribute('preserveAspectRatio', 'none');

  const geometry = getSvgImageGeometry(
    computed.objectFit,
    computed.objectPosition,
    boxWidth,
    boxHeight,
    sourceImage.naturalWidth,
    sourceImage.naturalHeight,
  );
  const svgImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  svgImage.setAttribute('x', String(geometry.x));
  svgImage.setAttribute('y', String(geometry.y));
  svgImage.setAttribute('width', String(geometry.width));
  svgImage.setAttribute('height', String(geometry.height));
  svgImage.setAttribute('preserveAspectRatio', 'none');
  svgImage.setAttribute('href', dataUrl);
  svgImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataUrl);
  svg.appendChild(svgImage);

  svg.setAttribute('role', 'img');
  const alt = source.getAttribute('alt');
  if (alt) svg.setAttribute('aria-label', alt);
  else svg.setAttribute('aria-hidden', 'true');
  return svg;
}

async function replaceCloneRasterImages(root: HTMLElement, sourceRoot: HTMLElement) {
  const cloneImages = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
  const sourceImages = Array.from(sourceRoot.querySelectorAll<HTMLImageElement>('img'));

  await Promise.all(cloneImages.map(async (image, index) => {
    const sourceImage = sourceImages[index] ?? image;
    const source = sourceImage.currentSrc || sourceImage.src || image.currentSrc || image.src;
    if (!source) throw new Error('Sorgente immagine della cartolina mancante.');

    const dataUrl = await fetchImageDataUrl(source);
    const replacement = createSvgRasterReplacement(image, sourceImage, dataUrl);
    if (image.classList.contains('daily-postcard-image')) replacement.style.zIndex = '0';
    image.replaceWith(replacement);
  }));

  const vignette = root.querySelector<HTMLElement>('.daily-postcard-front-vignette');
  if (vignette) vignette.style.zIndex = '1';
  if (root.querySelector('img')) throw new Error('La conversione raster SVG della cartolina è incompleta.');
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

function replacePostcardAddressInputs(sourceCard: HTMLElement, clone: HTMLElement) {
  const sourceInputs = Array.from(sourceCard.querySelectorAll<HTMLTextAreaElement>('.daily-postcard-address-input'));
  const cloneInputs = Array.from(clone.querySelectorAll<HTMLTextAreaElement>('.daily-postcard-address-input'));

  cloneInputs.forEach((cloneInput, index) => {
    const sourceInput = sourceInputs[index];
    const writtenValue = sourceInput?.value ?? '';
    const writtenText = document.createElement('span');
    writtenText.className = cloneInput.className.replace('daily-postcard-address-input', 'daily-postcard-address-written');
    writtenText.textContent = writtenValue;
    cloneInput.replaceWith(writtenText);
  });
}

function getPostcardExportHeight(sourceCard: HTMLElement) {
  const sourceWidth = sourceCard.offsetWidth || DAILY_POSTCARD_EXPORT_WIDTH;
  const sourceHeight = sourceCard.offsetHeight || DAILY_POSTCARD_EXPORT_HEIGHT;
  const scaledHeight = Math.round((sourceHeight * DAILY_POSTCARD_EXPORT_WIDTH) / sourceWidth);

  return Math.max(DAILY_POSTCARD_EXPORT_HEIGHT, scaledHeight);
}

function createExportFrame(sourceCard: HTMLElement, face: DailyPostcardFace, fontFamily: string, exportHeight: number) {
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
  replacePostcardAddressInputs(sourceCard, clone);
  clone.removeAttribute('aria-label');
  clone.removeAttribute('aria-pressed');
  clone.removeAttribute('role');
  clone.removeAttribute('tabindex');
  Object.assign(clone.style, {
    boxSizing: 'border-box',
    fontFamily,
    height: `${exportHeight}px`,
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
    height: `${exportHeight}px`,
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

async function convertRenderedBlobToJpeg(renderedBlob: Blob) {
  const sourceUrl = URL.createObjectURL(renderedBlob);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await waitForImage(image);

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas JPEG della cartolina non disponibile.');
    context.drawImage(image, 0, 0);

    const jpegBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
    });
    if (!jpegBlob) throw new Error('Impossibile creare il JPEG della cartolina.');
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
  const { getFontEmbedCSS, toBlob } = await import('html-to-image');
  const sourceFontFamily = window.getComputedStyle(sourceCard).fontFamily;
  // JaneAust is shipped as a local TTF. Restricting html-to-image to WOFF2
  // silently removes that face from the embedded stylesheet and makes the
  // exported wordmark fall back to a browser serif/cursive font.
  const fontEmbedCSS = await getFontEmbedCSS(sourceCard);

  const sourceFace = sourceCard.querySelector<HTMLElement>(`.daily-postcard-${face}`);
  if (!sourceFace) throw new Error(`Faccia ${face} della cartolina non trovata.`);

  await waitForImages(sourceFace);
  const exportHeight = getPostcardExportHeight(sourceCard);
  const { clone, exportFrame } = createExportFrame(sourceCard, face, sourceFontFamily, exportHeight);

  try {
    await replaceCloneRasterImages(clone, sourceFace);
    await waitForNextPaint();

    const renderedBlob = await toBlob(exportFrame, {
      backgroundColor: face === 'back' ? '#f2eadb' : '#e6d8c0',
      cacheBust: true,
      fontEmbedCSS,
      height: exportHeight,
      includeQueryParams: true,
      pixelRatio: DAILY_POSTCARD_EXPORT_PIXEL_RATIO,
      style: {
        opacity: '1',
        transform: 'none',
      },
      width: DAILY_POSTCARD_EXPORT_WIDTH,
    });
    if (!renderedBlob) throw new Error('Impossibile renderizzare la cartolina.');
    const jpegBlob = await convertRenderedBlobToJpeg(renderedBlob);
    const filename = `cartolina-${dataIso}-${face === 'front' ? 'fronte' : 'retro'}.jpeg`;
    triggerBlobDownload(jpegBlob, filename);
  } finally {
    exportFrame.remove();
  }
}
