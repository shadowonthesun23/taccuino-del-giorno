'use client';

import { useRef, useState, type CSSProperties } from 'react';
import { Download, EyeOff, Feather, Loader2 } from 'lucide-react';
import type { LanguageCode } from '@/lib/types';
import { garamond, janeAust } from '@/lib/fonts';
import { SITE_WATERMARK } from '@/lib/constants';
import { t } from '@/lib/translation';
import {
  clampText,
  formatAuthorCardDate,
  getAuthorInitials,
  getAuthorSocialCardLayout,
  splitAuthorNameForSocialCard,
} from '@/app/lib/authorCardDesign';
import type { EditorialMediaCrop } from '@/lib/editorial-media';
import { DEFAULT_EDITORIAL_MEDIA_CROP, getEditorialMediaCropImageStyle } from '@/lib/editorial-media';
import { sanitizeAuthorDescription } from '@/lib/author-description';

interface AuthorExportCardProps {
  autoreGiorno: string;
  breveDescrizione: string;
  fotoAutoreUrl?: string | null;
  fotoAutoreCrop?: EditorialMediaCrop;
  citazione: { testo: string; autore: string; fonte: string };
  dataOdierna: string;
  dataIso?: string;
  isDark: boolean;
  onHidePreview?: () => void;
  hidePreviewLabel?: string;
  saveImageLabel?: string;
  lingua?: LanguageCode;
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

function normalizeInlineText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export default function AuthorExportCard({
  autoreGiorno,
  breveDescrizione,
  fotoAutoreUrl,
  fotoAutoreCrop,
  citazione,
  dataOdierna,
  dataIso,
  isDark,
  onHidePreview,
  hidePreviewLabel = 'Nascondi',
  saveImageLabel = 'Salva',
  lingua = 'IT',
}: AuthorExportCardProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const authorName = normalizeInlineText(autoreGiorno) || 'Autore';
  const authorDescription = sanitizeAuthorDescription(breveDescrizione);
  const dateLabel = normalizeInlineText(dataOdierna) || (dataIso ? formatAuthorCardDate(dataIso) : '');
  const layout = getAuthorSocialCardLayout(
    citazione.testo,
    authorDescription,
    authorName,
    Boolean(fotoAutoreUrl),
    dateLabel,
  );
  const citationText = clampText(citazione.testo, layout.quoteMaxChars);
  const descriptionText = authorDescription;
  const authorNameLines = splitAuthorNameForSocialCard(authorName);
  const initials = getAuthorInitials(authorName).slice(0, 3) || 'TDG';
  const firstLetterIndex = citationText.search(/\p{L}/u);
  const quoteInitialIndex = firstLetterIndex >= 0 ? firstLetterIndex : citationText ? 0 : -1;
  const quotePrefix = quoteInitialIndex > 0 ? citationText.slice(0, quoteInitialIndex) : '';
  const quoteInitial = quoteInitialIndex >= 0 ? citationText[quoteInitialIndex] ?? '' : '';
  const quoteRemainder = quoteInitialIndex >= 0 ? citationText.slice(quoteInitialIndex + 1) : '';
  const quoteAuthor = clampText(normalizeInlineText(citazione.autore), 64);
  const quoteSource = clampText(normalizeInlineText(citazione.fonte), 76);
  const authorImageCrop = fotoAutoreCrop ?? DEFAULT_EDITORIAL_MEDIA_CROP;
  const scale = 1 / 3;

  const handleExport = async () => {
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
      const fileName = authorName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      link.download = `taccuino-${fileName}.png`;
      link.href = url;
      link.click();
    } catch (error) {
      console.error("Errore durante l'export:", error);
      alert(`Errore: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setExporting(false);
    }
  };

  const nameStyle: CSSProperties = {
    fontSize: `${layout.nameFontSize}px`,
    lineHeight: layout.nameLineHeight,
    width: `${layout.nameWidth}px`,
    display: 'block',
    overflow: 'visible',
  };

  const descriptionStyle: CSSProperties = {
    fontSize: `${layout.descriptionFontSize}px`,
    lineHeight: layout.descriptionLineHeight,
    width: `${layout.descriptionWidth}px`,
  };

  const quoteStyle: CSSProperties = {
    fontSize: `${layout.quoteFontSize}px`,
    lineHeight: layout.quoteLineHeight,
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: layout.quoteMaxLines,
  };

  return (
    <div className="relative group">
      <div className="author-export-actions">
        {onHidePreview && (
          <button
            onClick={onHidePreview}
            title={hidePreviewLabel}
            aria-label={hidePreviewLabel}
            className={`author-export-action notebook-action notebook-action-compact notebook-action-secondary ${isDark ? 'is-dark' : ''}`}
          >
            <EyeOff className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{hidePreviewLabel}</span>
          </button>
        )}
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
          data-author-card-variant={layout.variant}
          data-author-card-quote-tier={citationText.length <= 120 ? 'short' : citationText.length <= 250 ? 'medium' : 'long'}
          className={`${garamond.className} social-export-card author-social-export-card${isDark ? ' is-dark' : ''}`}
          style={{
            width: `${EXPORT_W}px`,
            height: `${EXPORT_H}px`,
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
            backgroundColor: paletteBackground(isDark),
            color: isDark ? '#F0E5D4' : '#2A2522',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* The same paper surfaces used by the notebook, kept quiet behind the data. */}
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
            className={`${garamond.className} author-tape-title-wrapper author-social-badge`}
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
            <Feather className="author-social-badge-feather" size={28} strokeWidth={1.5} aria-hidden="true" />
            <span className={`${garamond.className} author-social-badge-label`}>
              {t('authorOfTheDay', lingua)}
            </span>
          </div>

          <figure
            className={`author-social-photo${fotoAutoreUrl ? '' : ' is-missing'}`}
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
            <span className="masking-tape author-social-photo-tape" aria-hidden="true" />
            <div className="author-social-photo-frame">
              {fotoAutoreUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="author-social-photo-image"
                  draggable={false}
                  src={fotoAutoreUrl}
                  alt={authorName}
                  crossOrigin="anonymous"
                  style={{
                    ...getEditorialMediaCropImageStyle(authorImageCrop),
                  }}
                />
              ) : (
                <div className="author-social-photo-fallback" aria-label={authorName}>
                  <span>{initials}</span>
                </div>
              )}
            </div>
          </figure>

          <h2
            className={`${garamond.className} author-social-name`}
            style={{
              position: 'absolute',
              top: `${layout.nameTop}px`,
              left: `${layout.nameLeft}px`,
              zIndex: 4,
              ...nameStyle,
            }}
          >
            {authorNameLines.map((line, index) => (
              <span key={`${line}-${index}`} style={{ display: 'block' }}>
                {line}
              </span>
            ))}
          </h2>

          <p
            className={`${garamond.className} author-social-description`}
            style={{
              position: 'absolute',
              top: `${layout.descriptionTop}px`,
              left: `${layout.descriptionLeft}px`,
              zIndex: 4,
              ...descriptionStyle,
            }}
          >
            {descriptionText}
          </p>

          <blockquote
            className={`${garamond.className} author-social-quote`}
            style={{
              position: 'absolute',
              top: `${layout.quoteTop}px`,
              left: `${layout.quoteLeft}px`,
              width: `${layout.quoteWidth}px`,
              zIndex: 4,
            }}
          >
            <span
              className="author-social-quote-rule"
              aria-hidden="true"
              style={{ width: `${layout.quoteRuleWidth}px` }}
            />
            <p className="author-social-quote-copy" aria-label={citationText} style={quoteStyle}>
              {quotePrefix && <span>{quotePrefix}</span>}
              {quoteInitial && (
                <span className="decorative-initial decorative-initial-red author-social-quote-initial" aria-hidden="true">
                  {quoteInitial}
                </span>
              )}
              <span>{quoteRemainder}</span>
            </p>
            {(quoteAuthor || quoteSource) && (
              <footer
                className="author-social-quote-attribution"
                style={{
                  marginTop: `${layout.attributionGap}px`,
                  fontSize: `${layout.attributionFontSize}px`,
                }}
              >
                {quoteAuthor && <span className="author-social-quote-author">— {quoteAuthor}</span>}
                {quoteSource && <cite className="author-social-quote-source">{quoteSource}</cite>}
              </footer>
            )}
          </blockquote>

          <footer
            className="author-social-footer"
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
}

function paletteBackground(isDark: boolean): string {
  return isDark ? '#2B261F' : '#F4F0E6';
}
