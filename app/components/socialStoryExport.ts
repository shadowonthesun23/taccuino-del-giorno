import { garamond } from '@/lib/fonts';

export const SOCIAL_STORY_WIDTH = 1080;
export const SOCIAL_STORY_HEIGHT = 1920;

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

export async function downloadSocialStory(
  source: HTMLElement,
  filename: string,
  isDark: boolean,
) {
  await document.fonts.ready;
  const { toPng } = await import('html-to-image');

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

    const dataUrl = await toPng(exportFrame, {
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
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } finally {
    exportFrame.remove();
  }
}
