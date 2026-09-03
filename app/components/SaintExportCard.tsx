'use client';

import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type CSSProperties } from 'react';
import { Church, Download, EyeOff, Loader2 } from 'lucide-react';
import type { LanguageCode } from '@/lib/types';
import { garamond, janeAust } from '@/lib/fonts';
import { SITE_WATERMARK } from '@/lib/constants';
import { t } from '@/lib/translation';
import { clampText } from '@/app/lib/authorCardDesign';
import {
  getSaintSocialCardLayout,
  normalizeSaintCardText,
  splitSaintNameForSocialCard,
  type SaintSocialCardEntry,
} from '@/app/lib/saintCardDesign';
import { DEFAULT_EDITORIAL_MEDIA_CROP, getEditorialMediaCropImageStyle, getRenderableImageUrl } from '@/lib/editorial-media';

interface SaintExportCardProps {
  santi: SaintSocialCardEntry[];
  fotoSantoUrl?: string | null;
  dataOdierna: string;
  dataIso?: string;
  isDark: boolean;
  onHidePreview?: () => void;
  hidePreviewLabel?: string;
  saveImageLabel?: string;
  lingua?: LanguageCode;
}

export interface SaintExportCardHandle {
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

function getSaintMeta(saint: SaintSocialCardEntry | undefined): string {
  if (!saint) return '';

  const role = normalizeSaintCardText(saint.ruolo);
  const years = normalizeSaintCardText(saint.anni);
  return [role, years ? `(${years})` : ''].filter(Boolean).join(' ');
}

function getExportFileName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

const SaintExportCard = forwardRef<SaintExportCardHandle, SaintExportCardProps>(function SaintExportCard({
  santi,
  fotoSantoUrl,
  dataOdierna,
  dataIso,
  isDark,
  onHidePreview,
  hidePreviewLabel = 'Nascondi',
  saveImageLabel = 'Salva',
  lingua = 'IT',
}, ref) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const primarySaint = santi[0];
  const primaryName = normalizeSaintCardText(primarySaint?.nome) || 'Santo del giorno';
  const saintImageUrl = getRenderableImageUrl(fotoSantoUrl);
  const hasPhoto = Boolean(saintImageUrl);
  const dateLabel = normalizeSaintCardText(dataOdierna);
  const layout = getSaintSocialCardLayout(santi, hasPhoto, dateLabel);
  const primaryNameLines = splitSaintNameForSocialCard(primaryName);
  const primaryMeta = getSaintMeta(primarySaint);
  const primaryDescription = clampText(primarySaint?.biografia ?? '', layout.primaryDescriptionMaxChars);
  const additionalSaints = santi.slice(1);
  const saintImageCrop = DEFAULT_EDITORIAL_MEDIA_CROP;
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
      link.download = `taccuino-santo-${getExportFileName(primaryName) || 'del-giorno'}.png`;
      link.href = url;
      link.click();
    } catch (error) {
      console.error("Errore durante l'export:", error);
      alert(`Errore: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setExporting(false);
    }
  }, [exporting, layout.footerSignatureFontSize, primaryName]);

  useImperativeHandle(ref, () => ({ exportImage: handleExport }), [handleExport]);

  const nameStyle: CSSProperties = {
    fontSize: `${layout.primaryNameFontSize}px`,
    lineHeight: layout.primaryNameLineHeight,
    width: `${layout.primaryNameWidth}px`,
    display: 'block',
  };

  const primaryMetaStyle: CSSProperties = {
    fontSize: `${layout.primaryMetaFontSize}px`,
    lineHeight: layout.primaryMetaLineHeight,
    width: `${layout.primaryMetaWidth}px`,
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
  };

  const primaryDescriptionStyle: CSSProperties = {
    fontSize: `${layout.primaryDescriptionFontSize}px`,
    lineHeight: layout.primaryDescriptionLineHeight,
    width: `${layout.primaryDescriptionWidth}px`,
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: layout.primaryDescriptionMaxLines,
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
          data-saint-card-variant={layout.variant}
          data-saint-card-photo={hasPhoto ? 'available' : 'missing'}
          className={`${garamond.className} social-export-card author-social-export-card saint-social-export-card${isDark ? ' is-dark' : ''}`}
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
          {/* The same paper surfaces used by the author social folio. */}
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
            <Church className="author-social-badge-feather" size={28} strokeWidth={1.5} aria-hidden="true" />
            <span className={`${garamond.className} author-social-badge-label`}>
              {t('correspondenceSaint', lingua)}
            </span>
          </div>

          {hasPhoto && (
            <figure
              className="author-social-photo saint-social-photo"
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="author-social-photo-image"
                  draggable={false}
                  src={saintImageUrl}
                  alt={primaryName}
                  crossOrigin="anonymous"
                  style={getEditorialMediaCropImageStyle(saintImageCrop)}
                />
              </div>
            </figure>
          )}

          {primaryNameLines.length > 0 && (
            <h2
              className={`${garamond.className} saint-social-name`}
              style={{
                position: 'absolute',
                top: `${layout.primaryNameTop}px`,
                left: `${layout.primaryNameLeft}px`,
                zIndex: 4,
                ...nameStyle,
              }}
            >
              {primaryNameLines.map((line, index) => (
                <span key={`${line}-${index}`} style={{ display: 'block' }}>
                  {line}
                </span>
              ))}
            </h2>
          )}

          {primaryMeta && (
            <p
              className={`${garamond.className} saint-social-primary-meta`}
              style={{
                position: 'absolute',
                top: `${layout.primaryMetaTop}px`,
                left: `${layout.primaryNameLeft}px`,
                zIndex: 4,
                ...primaryMetaStyle,
              }}
            >
              {clampText(primaryMeta, 120)}
            </p>
          )}

          {primaryDescription && (
            <p
              className={`${garamond.className} saint-social-primary-description`}
              aria-label={primaryDescription}
              style={{
                position: 'absolute',
                top: `${layout.primaryDescriptionTop}px`,
                left: `${layout.primaryDescriptionLeft}px`,
                zIndex: 4,
                ...primaryDescriptionStyle,
              }}
            >
              {primaryDescription}
            </p>
          )}

          {additionalSaints.length > 0 && (
            <ul
              className="saint-social-secondary-list"
              style={{
                position: 'absolute',
                top: `${layout.secondaryTop}px`,
                left: '82px',
                width: `${layout.secondaryWidth}px`,
                zIndex: 4,
              }}
            >
              {additionalSaints.map((saint, index) => {
                const nameLines = splitSaintNameForSocialCard(normalizeSaintCardText(saint.nome));
                const meta = getSaintMeta(saint);
                const description = clampText(saint.biografia, layout.secondaryDescriptionMaxChars);
                const itemStyle: CSSProperties = {
                  height: `${layout.secondaryItemHeight}px`,
                  marginBottom: index === additionalSaints.length - 1 ? 0 : layout.secondaryItemGap,
                };

                return (
                  <li key={`${saint.nome}-${index}`} className="saint-social-secondary" style={itemStyle}>
                    <h3
                      className={`${garamond.className} saint-social-secondary-name`}
                      style={{
                        fontSize: `${layout.secondaryNameFontSize}px`,
                        lineHeight: layout.secondaryNameLineHeight,
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: layout.secondaryNameMaxLines,
                      }}
                    >
                      {nameLines.length > 0 ? nameLines.map((line, lineIndex) => (
                        <span key={`${line}-${lineIndex}`} style={{ display: 'block' }}>
                          {line}
                        </span>
                      )) : normalizeSaintCardText(saint.nome)}
                    </h3>
                    {meta && (
                      <p
                        className={`${garamond.className} saint-social-secondary-meta`}
                        style={{
                          fontSize: `${layout.secondaryMetaFontSize}px`,
                          lineHeight: layout.secondaryMetaLineHeight,
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: layout.secondaryMetaMaxLines,
                        }}
                      >
                        {clampText(meta, 110)}
                      </p>
                    )}
                    {description && (
                      <p
                        className={`${garamond.className} saint-social-secondary-description`}
                        style={{
                          fontSize: `${layout.secondaryDescriptionFontSize}px`,
                          lineHeight: layout.secondaryDescriptionLineHeight,
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: layout.secondaryDescriptionMaxLines,
                        }}
                      >
                        {description}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <footer
            className="author-social-footer saint-social-footer"
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

export default SaintExportCard;
