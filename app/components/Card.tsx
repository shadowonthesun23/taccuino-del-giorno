'use client';

import { useRef, useState, useCallback } from 'react';
import { Bookmark, BookmarkCheck, Download } from 'lucide-react';
import { garamond, masterSignature } from '@/lib/fonts';
import { SITE_WATERMARK } from '@/lib/constants';


const badgeVariants: Record<string, string> = {
  citazione: 'badge-tilt-right',
  parola: 'badge-tilt-left',
  santi: 'badge-tilt-right',
  opera: 'badge-tilt-left',
  avvenimenti: 'badge-tilt-right',
  poesia: 'badge-tilt-left',
  bibbia: 'badge-tilt-right',
  apod: 'badge-tilt-left',
};

const SOCIAL_EXPORT_WIDTH = 1080;
const SOCIAL_EXPORT_HEIGHT = 1920;
const SOCIAL_EXPORT_SIDE_PADDING = 54;
const SOCIAL_EXPORT_TOP_PADDING = 210;
const SOCIAL_EXPORT_BOTTOM_PADDING = 156;
const SOCIAL_EXPORT_LAYOUT_WIDTH = 900;

const SOCIAL_EXPORT_TARGET_HEIGHTS: Record<string, number> = {
  citazione: 1320,
  parola: 1440,
  santi: 1460,
  opera: 1460,
  avvenimenti: 1400,
  poesia: 1460,
  bibbia: 1460,
  musica: 1460,
  apod: 1460,
};

interface CardProps {
  id?: string;
  title?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  isDark: boolean;
  children: React.ReactNode;
  className?: string;
  filename?: string;
  isSaved?: boolean;
  onToggleSaved?: () => void;
  saveLabel?: string;
  exportDate?: string;
}

export default function Card({
  id,
  title,
  icon: Icon,
  isDark,
  children,
  className = '',
  filename,
  isSaved = false,
  onToggleSaved,
  saveLabel = 'Custodisci questa scheda',
  exportDate,
}: CardProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!sectionRef.current || exporting) return;
    setExporting(true);
    let exportFrame: HTMLDivElement | null = null;

    try {
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

      const source = sectionRef.current;
      const clone = source.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(
        [
          '[data-export-ignore]',
          'button',
          '.music-link-actions',
          '.saint-card-credit',
          '.reading-note',
          '.quote-example-note',
          '.margin-note',
          '.editorial-link-button',
          '.opera-postcard-source-label',
          '.apod-postcard-source-label',
        ].join(', ')
      ).forEach((node) => node.remove());

      exportFrame = document.createElement('div');
      exportFrame.className = `${garamond.className} social-export-frame${isDark ? ' is-dark' : ''}`;
      exportFrame.style.position = 'fixed';
      exportFrame.style.left = '0';
      exportFrame.style.top = '0';
      exportFrame.style.width = `${SOCIAL_EXPORT_WIDTH}px`;
      exportFrame.style.height = `${SOCIAL_EXPORT_HEIGHT}px`;
      exportFrame.style.boxSizing = 'border-box';
      exportFrame.style.display = 'flex';
      exportFrame.style.alignItems = 'center';
      exportFrame.style.justifyContent = 'center';
      exportFrame.style.padding = `${SOCIAL_EXPORT_TOP_PADDING}px ${SOCIAL_EXPORT_SIDE_PADDING}px ${SOCIAL_EXPORT_BOTTOM_PADDING}px`;
      exportFrame.style.overflow = 'hidden';
      exportFrame.style.pointerEvents = 'none';
      exportFrame.style.zIndex = '-1';
      exportFrame.style.backgroundColor = isDark ? '#201d19' : '#eee5d3';
      exportFrame.style.backgroundImage = [
        isDark
          ? 'linear-gradient(160deg, rgba(32, 29, 25, 0.94), rgba(42, 37, 32, 0.9))'
          : 'linear-gradient(160deg, rgba(246, 239, 226, 0.8), rgba(238, 229, 211, 0.88))',
        'url("/images/sfondo-taccuino.webp")',
        isDark
          ? 'radial-gradient(ellipse 80% 45% at 50% 16%, rgba(222, 183, 133, 0.12), transparent 70%)'
          : 'radial-gradient(ellipse 80% 45% at 50% 16%, rgba(255, 255, 255, 0.62), transparent 70%)',
      ].join(', ');
      exportFrame.style.backgroundSize = 'cover, cover, cover';
      exportFrame.style.backgroundPosition = 'center, center, center';
      exportFrame.style.fontFamily = exportFontFamily;
      
      const computedStyle = window.getComputedStyle(source);
      const parentTapeFilter = computedStyle.getPropertyValue('--tape-filter') || 'none';
      exportFrame.style.setProperty('--tape-filter', parentTapeFilter);

      const exportVignette = document.createElement('div');
      exportVignette.style.position = 'absolute';
      exportVignette.style.inset = '28px';
      exportVignette.style.border = isDark
        ? '1px solid rgba(255, 255, 255, 0.08)'
        : '1px solid rgba(117, 88, 57, 0.13)';
      exportVignette.style.borderRadius = '34px';
      exportVignette.style.boxShadow = isDark
        ? 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -80px 120px rgba(0,0,0,0.08)'
        : 'inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -80px 120px rgba(117,88,57,0.055)';
      exportVignette.style.pointerEvents = 'none';
      exportVignette.style.zIndex = '0';

      const exportMasthead = document.createElement('div');
      exportMasthead.style.position = 'absolute';
      exportMasthead.style.top = '62px';
      exportMasthead.style.left = '72px';
      exportMasthead.style.right = '72px';
      exportMasthead.style.display = 'flex';
      exportMasthead.style.alignItems = 'flex-end';
      exportMasthead.style.justifyContent = 'space-between';
      exportMasthead.style.paddingBottom = '21px';
      exportMasthead.style.borderBottom = isDark
        ? '1px solid rgba(238,229,211,0.18)'
        : '1px solid rgba(117,88,57,0.2)';
      exportMasthead.style.color = isDark ? '#f0e5d4' : '#4f3b2d';
      exportMasthead.style.pointerEvents = 'none';
      exportMasthead.style.zIndex = '3';

      const exportWordmark = document.createElement('span');
      exportWordmark.className = masterSignature.className;
      exportWordmark.textContent = 'Il giorno da custodire';
      exportWordmark.style.fontSize = '48px';
      exportWordmark.style.lineHeight = '0.88';
      exportWordmark.style.whiteSpace = 'nowrap';
      exportWordmark.style.transform = 'translateY(2px) rotate(-0.3deg)';

      const exportDateLabel = document.createElement('span');
      exportDateLabel.textContent = exportDate || 'Edizione quotidiana';
      exportDateLabel.style.fontSize = '19px';
      exportDateLabel.style.fontStyle = 'normal';
      exportDateLabel.style.letterSpacing = '0.13em';
      exportDateLabel.style.textTransform = 'uppercase';
      exportDateLabel.style.whiteSpace = 'nowrap';
      exportDateLabel.style.opacity = '0.76';

      exportMasthead.append(exportWordmark, exportDateLabel);

      const exportSignature = document.createElement('div');
      exportSignature.textContent = 'Un foglio quotidiano di cultura, memoria e ascolto';
      exportSignature.style.position = 'absolute';
      exportSignature.style.left = '0';
      exportSignature.style.right = '0';
      exportSignature.style.bottom = '56px';
      exportSignature.style.color = isDark ? 'rgba(238,229,211,0.48)' : 'rgba(79,59,45,0.48)';
      exportSignature.style.fontSize = '19px';
      exportSignature.style.fontStyle = 'italic';
      exportSignature.style.letterSpacing = '0.09em';
      exportSignature.style.lineHeight = '1';
      exportSignature.style.textAlign = 'center';
      exportSignature.style.transform = 'rotate(-0.5deg)';
      exportSignature.style.pointerEvents = 'none';

      const contentMaxWidth = SOCIAL_EXPORT_WIDTH - SOCIAL_EXPORT_SIDE_PADDING * 2;
      const contentMaxHeight = SOCIAL_EXPORT_HEIGHT - SOCIAL_EXPORT_TOP_PADDING - SOCIAL_EXPORT_BOTTOM_PADDING;
      const exportLayoutWidth = SOCIAL_EXPORT_LAYOUT_WIDTH;
      const widthScale = contentMaxWidth / exportLayoutWidth;

      const measureWrap = document.createElement('div');
      measureWrap.style.position = 'fixed';
      measureWrap.style.left = '-10000px';
      measureWrap.style.top = '0';
      measureWrap.style.width = `${exportLayoutWidth}px`;
      measureWrap.style.visibility = 'hidden';
      measureWrap.style.pointerEvents = 'none';
      measureWrap.style.zIndex = '-1';

      clone.style.width = `${exportLayoutWidth}px`;
      clone.style.maxWidth = 'none';
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.boxSizing = 'border-box';
      clone.style.fontFamily = exportFontFamily;
      clone.style.margin = '0';
      clone.classList.add(garamond.className, 'social-export-card');
      if (isDark) clone.classList.add('is-dark');
      if (id) clone.dataset.socialExportSection = id;
      measureWrap.appendChild(clone);
      document.body.appendChild(measureWrap);

      let exportLayoutHeight = Math.max(clone.getBoundingClientRect().height, 1);

      const targetHeight = Math.min(
        SOCIAL_EXPORT_TARGET_HEIGHTS[id ?? ''] ?? 1260,
        contentMaxHeight
      );
      if (exportLayoutHeight * widthScale < targetHeight) {
        clone.classList.add('social-export-card-spacious');
        clone.style.minHeight = `${targetHeight / widthScale}px`;
        exportLayoutHeight = Math.max(clone.getBoundingClientRect().height, 1);
      }

      const scale = Math.min(widthScale, contentMaxHeight / exportLayoutHeight);
      measureWrap.remove();

      const contentWrap = document.createElement('div');
      contentWrap.style.width = `${contentMaxWidth}px`;
      contentWrap.style.height = `${contentMaxHeight}px`;
      contentWrap.style.display = 'flex';
      contentWrap.style.alignItems = 'center';
      contentWrap.style.justifyContent = 'center';
      contentWrap.style.overflow = 'hidden';
      contentWrap.style.position = 'relative';
      contentWrap.style.zIndex = '2';

      const scaledCardMount = document.createElement('div');
      scaledCardMount.style.width = `${exportLayoutWidth * scale}px`;
      scaledCardMount.style.height = `${exportLayoutHeight * scale}px`;
      scaledCardMount.style.position = 'relative';
      scaledCardMount.style.flex = '0 0 auto';

      clone.style.transform = `scale(${scale})`;
      clone.style.transformOrigin = 'top left';

      scaledCardMount.appendChild(clone);
      contentWrap.appendChild(scaledCardMount);
      exportFrame.append(exportVignette, exportMasthead, contentWrap, exportSignature);
      document.body.appendChild(exportFrame);

      const dataUrl = await toPng(exportFrame, {
        width: SOCIAL_EXPORT_WIDTH,
        height: SOCIAL_EXPORT_HEIGHT,
        pixelRatio: 1,
      });
      const link = document.createElement('a');
      link.download = `taccuino-${filename ?? 'card'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Errore export card:', err);
    } finally {
      exportFrame?.remove();
      setExporting(false);
    }
  }, [exportDate, exporting, filename, id, isDark]);

  return (
    <div id={id} className={className}>
      <section
        ref={sectionRef}
        className={`${garamond.className} ${
          isDark ? 'bg-[#2A2A2A]/90 border-white/10' : 'bg-[#FDFCF8] border-[#EBE5DB]'
        } border rounded-2xl p-6 md:p-8 card-paper-shadow editorial-card relative group h-full ${id ? `card-section-${id}` : ''}`}
      >

        {filename && (
          <button
            data-export-ignore
            onClick={handleExport}
            disabled={exporting}
            aria-label="Scarica come immagine"
            data-label="Scarica come immagine"
            className={`card-export-button notebook-action notebook-action-compact notebook-action-icon ${isDark ? 'is-dark' : ''}`}
          >
            {exporting ? (
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {onToggleSaved && (
          <button
            type="button"
            data-export-ignore
            onClick={onToggleSaved}
            aria-label={isSaved ? 'Rimuovi dalle cose custodite' : saveLabel}
            data-label={isSaved ? 'Rimuovi dalle cose custodite' : saveLabel}
            aria-pressed={isSaved}
            className={`card-save-button notebook-action notebook-action-compact notebook-action-icon ${filename ? 'has-export' : ''} ${isDark ? 'is-dark' : ''} ${isSaved ? 'is-saved' : ''}`}
          >
            {isSaved ? (
              <BookmarkCheck className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        )}

        <span className="card-export-watermark" aria-hidden="true">{SITE_WATERMARK}</span>

        {title && (
          <div className="card-section-heading flex items-center justify-start relative z-10">
            <h3 
              className={`${garamond.className} italic section-typewriter-badge badge-${id} ${id ? badgeVariants[id] ?? '' : ''} text-sm m-0`}
            >
              <span className="badge-tape-bg" aria-hidden="true" />
              {Icon && <Icon className="w-[17px] h-[17px] flex-shrink-0" strokeWidth={1.6} />}
              <span>{title}</span>
            </h3>
          </div>
        )}
        <div className={`card-content relative z-10 ${isDark ? 'text-[#D2C9B9]' : 'text-[#2A2522]'}`}>{children}</div>
      </section>
    </div>
  );
}
