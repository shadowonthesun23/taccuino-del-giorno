'use client';

import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type CSSProperties } from 'react';
import { BookOpen, Download, Feather, Loader2 } from 'lucide-react';
import type { LanguageCode } from '@/lib/types';
import { garamond, janeAust } from '@/lib/fonts';
import { SITE_WATERMARK } from '@/lib/constants';
import { t } from '@/lib/translation';
import { DecorativeInitialText } from '@/components/ui/Typography';
import type { EditorialMediaCrop } from '@/lib/editorial-media';
import { DEFAULT_EDITORIAL_MEDIA_CROP, getEditorialMediaCropImageStyle, getRenderableImageUrl } from '@/lib/editorial-media';
import {
  clampReadingText,
  getReadingHeadingLines,
  getReadingSocialCardLayout,
  normalizeBibleReference,
  normalizeReadingInlineText,
  normalizeReadingText,
  type ReadingSocialCardKind,
} from '@/app/lib/readingCardDesign';

interface ReadingExportCardProps {
  kind: ReadingSocialCardKind;
  testo: string;
  autore?: string;
  fonte: string;
  fotoUrl?: string | null;
  fotoCrop?: EditorialMediaCrop;
  dataOdierna: string;
  dataIso?: string;
  isDark: boolean;
  saveImageLabel?: string;
  lingua?: LanguageCode;
}

export interface ReadingExportCardHandle {
  exportImage: () => Promise<void>;
}

const CARD_W = 360;
const CARD_H = 640;
const EXPORT_W = 1080;
const EXPORT_H = 1920;

function getComputedFontFamily(fontClassName: string): string | null {
  const probe = document.createElement('span');
  probe.className = fontClassName;
  probe.style.position = 'fixed';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  document.body.appendChild(probe);
  const family = window.getComputedStyle(probe).fontFamily || null;
  probe.remove();
  return family;
}

function getExportFileName(kind: ReadingSocialCardKind, heading: string): string {
  const slug = heading
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
  return `taccuino-${kind}-${slug || 'del-giorno'}.png`;
}

const ReadingExportCard = forwardRef<ReadingExportCardHandle, ReadingExportCardProps>(function ReadingExportCard({
  kind,
  testo,
  autore,
  fonte,
  fotoUrl,
  fotoCrop,
  dataOdierna,
  dataIso,
  isDark,
  saveImageLabel = 'Salva',
  lingua = 'IT',
}, ref) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const dateLabel = normalizeReadingInlineText(dataOdierna);
  const readingImageUrl = getRenderableImageUrl(fotoUrl);
  const hasPhoto = kind === 'poesia' && Boolean(readingImageUrl);
  const rawHeadingText = normalizeReadingInlineText(kind === 'poesia' ? autore : fonte);
  const headingText = (kind === 'bibbia' ? normalizeBibleReference(rawHeadingText) : rawHeadingText)
    || (kind === 'poesia' ? 'Poesia' : 'Passaggio biblico');
  const sourceText = normalizeReadingInlineText(fonte);
  const bodyText = normalizeReadingText(testo) || '—';
  const layout = getReadingSocialCardLayout(kind, bodyText, headingText, hasPhoto, dateLabel);
  const headingLines = getReadingHeadingLines(kind, headingText);
  const displayedBody = clampReadingText(bodyText, layout.bodyMaxChars);
  const photoCrop = fotoCrop ?? DEFAULT_EDITORIAL_MEDIA_CROP;
  const scale = 1 / 3;

  const handleExport = useCallback(async () => {
    if (exporting || !exportRef.current) return;
    setExporting(true);
    try {
      await document.fonts.ready;
      const exportFontFamily = getComputedFontFamily(garamond.className);
      const exportJaneAustFamily = getComputedFontFamily(janeAust.className);
      if (exportJaneAustFamily) {
        await document.fonts.load(`${layout.footerSignatureFontSize}px ${exportJaneAustFamily}`);
      }
      const { toPng } = await import('html-to-image');
      const url = await toPng(exportRef.current, {
        width: EXPORT_W,
        height: EXPORT_H,
        pixelRatio: 1,
        cacheBust: true,
        style: {
          transform: 'none',
          transformOrigin: 'top left',
          ...(exportFontFamily ? { fontFamily: exportFontFamily } : {}),
        },
      });
      const link = document.createElement('a');
      link.download = getExportFileName(kind, headingText);
      link.href = url;
      link.click();
    } catch (error) {
      console.error("Errore durante l'export:", error);
      alert(`Errore: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setExporting(false);
    }
  }, [exporting, headingText, kind, layout.footerSignatureFontSize]);

  useImperativeHandle(ref, () => ({ exportImage: handleExport }), [handleExport]);

  const headingStyle: CSSProperties = {
    fontSize: `${layout.headingFontSize}px`,
    lineHeight: layout.headingLineHeight,
    width: `${layout.headingWidth}px`,
    display: 'block',
    overflow: 'visible',
  };

  const sourceStyle: CSSProperties = {
    fontSize: `${layout.sourceFontSize}px`,
    lineHeight: layout.sourceLineHeight,
    width: `${layout.sourceWidth}px`,
    display: 'block',
    overflow: 'visible',
  };

  const bodyStyle: CSSProperties = {
    fontSize: `${layout.bodyFontSize}px`,
    lineHeight: layout.bodyLineHeight,
    width: `${layout.bodyWidth}px`,
    display: 'block',
    overflow: 'visible',
  };

  const BadgeIcon = kind === 'poesia' ? Feather : BookOpen;

  return (
    <div className="relative group">
      <div className="author-export-actions">
        <button
          onClick={handleExport}
          disabled={exporting}
          title={saveImageLabel}
          aria-label={saveImageLabel}
          className={`author-export-action notebook-action notebook-action-compact notebook-action-primary is-primary ${isDark ? 'is-dark' : ''}`}
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Download className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{exporting ? t('generating', lingua) : saveImageLabel}</span>
        </button>
      </div>

      <div
        className="author-export-preview-frame"
        style={{
          position: 'relative',
          width: `${CARD_W}px`,
          height: `${CARD_H}px`,
          margin: '0 auto',
          overflow: 'hidden',
          borderRadius: '16px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(181,149,106,0.18)'}`,
          boxShadow: isDark
            ? '0 24px 54px -42px rgba(0,0,0,0.92)'
            : '0 22px 48px -40px rgba(42,37,34,0.46)',
        }}
      >
        <div
          ref={exportRef}
          data-date={dataIso || undefined}
          data-reading-kind={kind}
          data-reading-card-variant={layout.variant}
          data-reading-card-photo={hasPhoto ? 'available' : 'missing'}
          className={`${garamond.className} social-export-card author-social-export-card reading-social-export-card reading-social-export-${kind}${isDark ? ' is-dark' : ''}`}
          style={{
            width: `${EXPORT_W}px`,
            height: `${EXPORT_H}px`,
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
            backgroundColor: isDark ? '#2B261F' : '#F4F0E6',
            color: isDark ? '#F0E5D4' : '#2A2522',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Shared paper surfaces keep the reading folios in the same family as Author and Saint. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="author-social-paper-texture"
            src="/images/sfondo-taccuino.webp"
            alt=""
            aria-hidden="true"
            draggable={false}
          />
          <div className="author-social-paper-fiber" aria-hidden="true" />

          <div
            className="author-social-date"
            style={{
              position: 'absolute',
              top: '76px',
              left: '82px',
              width: `${layout.dateWidth}px`,
              zIndex: 5,
            }}
          >
            <span className={`${garamond.className} author-social-date-label`} style={{ fontSize: `${layout.dateFontSize}px` }}>
              {dateLabel}
            </span>
            <span className="author-social-date-rule" aria-hidden="true" />
          </div>

          <div
            className={`${garamond.className} author-tape-title-wrapper author-social-badge reading-social-badge`}
            style={{
              position: 'absolute',
              top: '78px',
              right: '76px',
              width: `${layout.badgeWidth}px`,
              height: `${layout.badgeHeight}px`,
              zIndex: 5,
            }}
          >
            <span className="badge-tape-bg" aria-hidden="true" />
            <BadgeIcon className="author-social-badge-feather" size={28} strokeWidth={1.5} aria-hidden="true" />
            <span className={`${garamond.className} author-social-badge-label`}>
              {t(kind === 'poesia' ? 'poemCard' : 'bibleCard', lingua)}
            </span>
          </div>

          {hasPhoto && (
            <figure
              className="author-social-photo reading-social-photo"
              style={{
                position: 'absolute',
                top: `${layout.photoTop}px`,
                right: `${layout.photoRight}px`,
                width: `${layout.photoWidth}px`,
                height: `${layout.photoHeight}px`,
                padding: `${layout.photoPadding}px`,
                transform: `rotate(${layout.photoAngle}deg)`,
                zIndex: 2,
              }}
            >
              <span className="masking-tape author-social-photo-tape reading-social-photo-tape" aria-hidden="true" />
              <div className="author-social-photo-frame reading-social-photo-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="author-social-photo-image reading-social-photo-image"
                  draggable={false}
                  src={readingImageUrl}
                  alt={headingText}
                  crossOrigin="anonymous"
                  style={getEditorialMediaCropImageStyle(photoCrop)}
                />
              </div>
            </figure>
          )}

          {headingLines.length > 0 && (
            <h2
              className={`${garamond.className} reading-social-heading`}
              style={{
                position: 'absolute',
                top: `${layout.headingTop}px`,
                left: `${layout.headingLeft}px`,
                zIndex: 4,
                ...headingStyle,
              }}
            >
              {headingLines.map((line, index) => (
                <span key={`${line}-${index}`} style={{ display: 'block' }}>
                  {line}
                </span>
              ))}
            </h2>
          )}

          {kind === 'poesia' && sourceText && (
            <p
              className={`${garamond.className} reading-social-source`}
              style={{
                position: 'absolute',
                top: `${layout.sourceTop}px`,
                left: `${layout.headingLeft}px`,
                zIndex: 4,
                ...sourceStyle,
              }}
            >
              {clampReadingText(sourceText, 150)}
            </p>
          )}

          <span
            className="reading-social-body-rule"
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: `${layout.bodyRuleTop}px`,
              left: `${layout.bodyLeft}px`,
              width: `${layout.bodyRuleWidth}px`,
              zIndex: 3,
            }}
          />

          <div
            className="reading-social-body-wrap"
            style={{
              position: 'absolute',
              top: `${layout.bodyTop}px`,
              left: `${layout.bodyLeft}px`,
              zIndex: 4,
              ...bodyStyle,
            }}
          >
            <DecorativeInitialText
              text={displayedBody}
              className={`reading-social-body ${kind === 'poesia' ? 'is-poem' : 'is-bible'}`}
              initialTone={kind === 'poesia' ? 'blue' : 'red'}
              initialClassName="reading-social-dropcap"
              copyClassName="reading-social-body-copy"
            />
          </div>

          <footer
            className="author-social-footer reading-social-footer"
            style={{
              position: 'absolute',
              right: '72px',
              bottom: `${layout.footerBottom}px`,
              left: '72px',
              zIndex: 4,
            }}
          >
            <span className="author-social-footer-rule" aria-hidden="true" />
            <strong
              className={`${janeAust.className} jane-aust-wordmark notebook-wordmark author-social-wordmark`}
              style={{ fontSize: `${layout.footerSignatureFontSize}px` }}
            >
              {t('dayTitle', lingua)}
            </strong>
            <span className="author-social-site" style={{ fontSize: `${layout.footerUrlFontSize}px` }}>
              {SITE_WATERMARK}
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
});

export default ReadingExportCard;
