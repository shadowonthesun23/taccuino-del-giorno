import { garamond } from '@/lib/fonts';
import { blobToDataUrl } from '@/lib/browser-utils';

export const SOCIAL_STORY_WIDTH = 1080;
export const SOCIAL_STORY_HEIGHT = 1920;

type ShareNavigator = Navigator & {
  canShare?: (data?: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

function waitForImages(root: HTMLElement) {
  return Promise.all(Array.from(root.querySelectorAll('img')).map(async (image) => {
    if (image.complete && image.naturalWidth > 0) {
      await image.decode().catch(() => undefined);
      return;
    }

    await new Promise<void>((resolve) => {
      const finish = () => {
        image.removeEventListener('load', finish);
        image.removeEventListener('error', finish);
        resolve();
      };
      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
    });
  }));
}

async function inlineCloneImages(root: HTMLElement) {
  const dataUrlCache = new Map<string, Promise<string | null>>();
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'));

  await Promise.all(images.map(async (image) => {
    const source = image.currentSrc || image.src;
    if (!source || source.startsWith('data:') || source.startsWith('blob:')) return;

    let dataUrlPromise = dataUrlCache.get(source);
    if (!dataUrlPromise) {
      dataUrlPromise = fetch(source, { cache: 'force-cache', credentials: 'same-origin' })
        .then((response) => {
          if (!response.ok) throw new Error(`Immagine non disponibile (${response.status}).`);
          return response.blob();
        })
        .then(blobToDataUrl)
        .catch(() => null);
      dataUrlCache.set(source, dataUrlPromise);
    }

    const dataUrl = await dataUrlPromise;
    if (!dataUrl) return;

    image.removeAttribute('srcset');
    image.removeAttribute('loading');
    image.src = dataUrl;
    await image.decode().catch(() => undefined);
  }));
}

function revealTypewriterClone(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('.typewriter-character').forEach((character) => {
    character.classList.remove('is-pending');
    character.classList.add('is-visible');
    character.style.color = 'inherit';
  });
  root.querySelectorAll<HTMLElement>('.typewriter-phrase-caret-anchor, .typewriter-caret').forEach((caret) => {
    caret.remove();
  });
}

function isMobileBrowser() {
  const userAgent = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod|Mobile/iu.test(userAgent)
    || (navigator.maxTouchPoints > 1 && /Macintosh/iu.test(userAgent));
}

function canShareFiles(files: File[]) {
  const shareNavigator = navigator as ShareNavigator;
  if (
    !isMobileBrowser()
    || typeof shareNavigator.share !== 'function'
    || typeof shareNavigator.canShare !== 'function'
  ) return false;

  try {
    return shareNavigator.canShare({ files });
  } catch {
    return false;
  }
}

function toStoryFile(blob: Blob, filename: string) {
  return new File([blob], filename, { type: blob.type || 'image/png' });
}

function triggerBlobDownload(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.download = file.name;
  link.href = objectUrl;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

async function deliverStoryFiles(files: File[], shareTitle: string) {
  const shareNavigator = navigator as ShareNavigator;
  if (canShareFiles(files)) {
    try {
      await shareNavigator.share!({ files, title: shareTitle });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      // Fall back to object-URL downloads when the share sheet is unavailable
      // or the browser rejects the request after the async render completes.
    }
  }

  for (const file of files) {
    triggerBlobDownload(file);
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }
}

async function renderSocialStoryBlob(
  source: HTMLElement,
  isDark: boolean,
) {
  await document.fonts.ready;
  const { toBlob } = await import('html-to-image');

  const exportFontProbe = document.createElement('span');
  exportFontProbe.className = garamond.className;
  exportFontProbe.style.position = 'fixed';
  exportFontProbe.style.visibility = 'hidden';
  exportFontProbe.style.pointerEvents = 'none';
  document.body.appendChild(exportFontProbe);
  const exportFontFamily = window.getComputedStyle(exportFontProbe).fontFamily;
  exportFontProbe.remove();

  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'));
  clone.querySelectorAll('[data-export-ignore], [data-social-export-ignore]').forEach((node) => node.remove());
  clone.classList.add('social-story-export-clone', garamond.className);
  clone.style.boxSizing = 'border-box';
  clone.style.height = `${SOCIAL_STORY_HEIGHT}px`;
  clone.style.maxHeight = 'none';
  clone.style.maxWidth = 'none';
  clone.style.margin = '0';
  clone.style.transform = 'none';
  clone.style.width = `${SOCIAL_STORY_WIDTH}px`;
  clone.style.fontFamily = exportFontFamily;
  // A Story may be exported while the live typewriter is still composing the
  // word. The clone must always contain the complete editorial text.
  revealTypewriterClone(clone);

  const exportFrame = document.createElement('div');
  exportFrame.className = `${garamond.className} social-story-download-frame${isDark ? ' is-dark' : ''}`;
  exportFrame.style.position = 'fixed';
  // Keep the frame in the document viewport while it is behind the UI. Some
  // html-to-image/browser combinations return a transparent canvas for nodes
  // positioned far outside the viewport.
  exportFrame.style.left = '0';
  exportFrame.style.top = '0';
  exportFrame.style.width = `${SOCIAL_STORY_WIDTH}px`;
  exportFrame.style.height = `${SOCIAL_STORY_HEIGHT}px`;
  exportFrame.style.boxSizing = 'border-box';
  exportFrame.style.overflow = 'hidden';
  exportFrame.style.pointerEvents = 'none';
  exportFrame.style.zIndex = '-1';
  exportFrame.appendChild(clone);
  document.body.appendChild(exportFrame);

  try {
    await waitForImages(clone);
    // Mobile Safari/Chromium can serialize the surrounding text while
    // dropping images that are still represented by HTTP URLs in the SVG
    // foreignObject. Embed each loaded photo in the clone first so the final
    // PNG has no external image dependency left to resolve.
    await inlineCloneImages(clone);
    await waitForImages(clone);

    const correspondenceSheet = clone.querySelector<HTMLElement>('.daily-correspondences-sheet');
    if (correspondenceSheet) {
      const rootStyles = window.getComputedStyle(clone);
      const paddingTop = Number.parseFloat(rootStyles.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(rootStyles.paddingBottom) || 0;
      const availableHeight = Math.max(SOCIAL_STORY_HEIGHT - paddingTop - paddingBottom, 1);
      const contentHeight = Math.max(correspondenceSheet.offsetHeight, correspondenceSheet.scrollHeight, 1);
      const scale = Math.min(1, availableHeight / contentHeight);
      correspondenceSheet.style.transform = `scale(${scale})`;
      correspondenceSheet.style.transformOrigin = 'top center';
    }

    // Inline SVG paint values for the new story clones. html-to-image can
    // miss stylesheet-only fills when serializing SVG children, which makes
    // the light half of the new moon glyph render as a black circle in PNGs.
    if (source.dataset.socialStory !== 'all-in-one') {
      clone.querySelectorAll<SVGElement>('svg, svg *').forEach((element) => {
        const styles = window.getComputedStyle(element);
        if (styles.fill !== 'none') element.style.fill = styles.fill;
        if (styles.stroke !== 'none') element.style.stroke = styles.stroke;
        if (styles.strokeWidth !== '0px') element.style.strokeWidth = styles.strokeWidth;
        if (styles.opacity !== '1') element.style.opacity = styles.opacity;
      });
    }

    const blob = await toBlob(exportFrame, {
      width: SOCIAL_STORY_WIDTH,
      height: SOCIAL_STORY_HEIGHT,
      pixelRatio: 1,
      cacheBust: true,
      includeQueryParams: true,
      // Missing-media cards keep their paper placeholder in the export, but
      // their inline Lucide fallback can make html-to-image reject the whole
      // foreignObject in Chromium. The placeholder itself is CSS-only and
      // remains fully exportable without that decorative child SVG.
      filter: (node) => !(
        node instanceof SVGElement
        && Boolean(node.parentElement?.closest('.social-story-media-empty, .correspondence-missing-media, .correspondence-saint-mark'))
      ),
    });
    if (!blob) throw new Error('Impossibile creare il file PNG della Story.');
    return blob;
  } finally {
    exportFrame.remove();
  }
}

export async function downloadSocialStory(
  source: HTMLElement,
  filename: string,
  isDark: boolean,
) {
  const blob = await renderSocialStoryBlob(source, isDark);
  await deliverStoryFiles([toStoryFile(blob, filename)], filename.replace(/\.png$/iu, ''));
}

export async function downloadSocialStories(
  stories: Array<{ source: HTMLElement; filename: string }>,
  isDark: boolean,
) {
  const files: File[] = [];
  for (const story of stories) {
    const blob = await renderSocialStoryBlob(story.source, isDark);
    files.push(toStoryFile(blob, story.filename));
  }

  if (files.length) await deliverStoryFiles(files, 'Stories del giorno');
}
