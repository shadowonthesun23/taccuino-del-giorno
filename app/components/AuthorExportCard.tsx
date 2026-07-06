'use client';

import { useRef, useState } from 'react';
import { IM_Fell_Double_Pica, Caveat } from 'next/font/google';
import localFont from 'next/font/local';
import { Download, EyeOff, Loader2, Feather } from 'lucide-react';
import {
  clampText,
  formatAuthorCardDate,
  getAuthorCardLayout,
  getAuthorCardPalette,
  getAuthorInitials,
  getAuthorNameFontSize,
} from '@/app/lib/authorCardDesign';

const garamond = IM_Fell_Double_Pica({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
});
const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});
const stampwriter = localFont({
  src: '../../public/fonts/STAMPWRITER-KIT.ttf',
  display: 'swap',
  preload: false,
  fallback: ['Courier New', 'monospace'],
});

interface AuthorExportCardProps {
  autoreGiorno: string;
  breveDescrizione: string;
  fotoAutoreUrl?: string | null;
  citazione: { testo: string; autore: string; fonte: string };
  dataOdierna: string;
  dataIso?: string;
  isDark: boolean;
  onHidePreview?: () => void;
  hidePreviewLabel?: string;
  saveImageLabel?: string;
  lingua?: string;
}

const CARD_W = 360;
const CARD_H = 640;

export default function AuthorExportCard({
  autoreGiorno,
  breveDescrizione,
  fotoAutoreUrl,
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

  const handleExport = async () => {
    if (exporting || !exportRef.current) return;
    setExporting(true);
    try {
      await document.fonts.ready;
      const { toPng } = await import('html-to-image');
      const url = await toPng(exportRef.current, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        cacheBust: true,
        style: {
          transform: 'none',
          transformOrigin: 'top left',
        },
      });
      const link = document.createElement('a');
      const nomeFile = autoreGiorno
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      link.download = `taccuino-${nomeFile}.png`;
      link.href = url;
      link.click();
    } catch (e) {
      console.error("Errore durante l'export:", e);
      alert(`Errore: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
  };

  const palette = getAuthorCardPalette(isDark);
  const layout = getAuthorCardLayout(citazione.testo, breveDescrizione, autoreGiorno);
  const citTesto = clampText(citazione.testo, layout.maxCitationChars);
  const descTesto = clampText(breveDescrizione, layout.maxDescriptionChars);
  const initials = getAuthorInitials(autoreGiorno).slice(0, 3) || 'TDG';
  const dateTapeHeight = 76;
  const dateFontSize = Math.max(46, layout.dateFontSize);
  const authorFontSize = getAuthorNameFontSize(autoreGiorno, layout.authorFontSize);
  const authorNameWraps = autoreGiorno.replace(/\s+/g, ' ').trim().length > 34;
  const photoCaption = `${initials} · ${formatAuthorCardDate(dataIso, dataOdierna)}`;

  // Scala 1:3 rispetto al PNG satori (1080×1920 → 360×640)
  const S = 1 / 3;

  return (
    <div className="relative group">
      <div className="author-export-actions">
        {onHidePreview && (
          <button
            onClick={onHidePreview}
            title={hidePreviewLabel}
            aria-label={hidePreviewLabel}
            className={`author-export-action ${isDark ? 'is-dark' : ''}`}
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
          className={`author-export-action is-primary ${isDark ? 'is-dark' : ''}`}
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <Download className="h-3.5 w-3.5 shrink-0" />}
          <span className="truncate">{exporting ? 'Generando' : saveImageLabel}</span>
        </button>
      </div>

      {/* Outer wrapper: dimensioni fisse della preview, clip del contenuto */}
      <div
        style={{
          position: 'relative',
          width: `${CARD_W}px`,
          height: `${CARD_H}px`,
          margin: '0 auto',
          borderRadius: '16px',
          border: `1px solid ${palette.previewBorder}`,
          overflow: 'hidden',
          boxShadow: palette.previewShadow,
        }}
      >
        {/*
          Inner div: replica la struttura satori in px originali (1080×1920),
          poi scalata via transform-origin top-left a 1/3.
          Così font-size, padding e proporzioni sono identici al PNG.
        */}
        <div
          ref={exportRef}
          className={`${garamond.className} social-export-card`}
          style={{
            width: '1080px',
            height: '1920px',
            transformOrigin: 'top left',
            transform: `scale(${S})`,
            backgroundColor: palette.bg,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: `${layout.topPadding}px ${layout.sidePadding}px ${layout.bottomPadding}px`,
            boxSizing: 'border-box',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            draggable={false}
            src="/images/sfondo-taccuino.webp"
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '1080px',
              height: '1920px',
              objectFit: 'cover',
              opacity: palette.imageOpacity,
              filter: isDark ? 'grayscale(35%) contrast(86%) brightness(0.7)' : 'grayscale(10%) contrast(90%) brightness(1.08)',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '64px 44px 54px',
              borderRadius: '46px',
              background: palette.spotlight,
              boxShadow: isDark
                ? '0 0 120px 96px rgba(30,30,30,0.54)'
                : '0 0 120px 96px rgba(255,252,242,0.36)',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'url("/beige-paper.png")',
              backgroundRepeat: 'repeat',
              opacity: isDark ? 0.06 : 0.16,
              mixBlendMode: isDark ? 'screen' : 'soft-light',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: '128px',
              left: '50%',
              transform: 'translateX(-50%) rotate(-0.8deg)',
              zIndex: 1,
              color: palette.textMuted,
              opacity: isDark ? 0.38 : 0.46,
              textAlign: 'center',
            }}
          >
            <div className={stampwriter.className} style={{ fontSize: '26px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Il giorno da custodire
            </div>
            <div style={{ height: '1px', margin: '12px auto 0', width: '260px', background: palette.wcColor, opacity: 0.42 }} />
          </div>
          {/* ── Washi tape data ── */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: `${Math.max(22, layout.tapeMarginBottom - 4)}px`, position: 'relative', height: `${dateTapeHeight}px`, flexShrink: 0, zIndex: 1 }}>
            <span
              className={`${caveat.className} masking-tape journal-date-tape`}
              style={{
                alignSelf: 'center',
                fontSize: `${dateFontSize}px`,
                lineHeight: 1,
                padding: '6px 24px 8px',
                whiteSpace: 'nowrap',
              }}
            >
              {dataOdierna}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', height: '68px', marginBottom: `${layout.labelMarginBottom + 20}px`, position: 'relative', zIndex: 2, flexShrink: 0 }}>
            <div className="author-tape-title-wrapper select-none">
              <span className="badge-tape-bg" aria-hidden="true" />
              <Feather className="w-[19px] h-[19px] text-[#E5B869] flex-shrink-0" strokeWidth={1.6} />
              <span className={`${garamond.className} italic text-[22px] font-medium text-[#f4f0e6] leading-none`}>
                {lingua === 'IT' ? 'Autore del giorno' : 'Author of the day'}
              </span>
            </div>
          </div>

          {/* ── Watermark — figlio diretto del root 1080px, right:0 = vero bordo card ── */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: '22px',
                fontWeight: 400,
                color: palette.textMuted,
                opacity: 0.45,
                transform: 'rotate(90deg)',
                whiteSpace: 'nowrap',
                letterSpacing: '0.15em',
                display: 'block',
              }}
            >
              ig: @antonelloan23
            </span>
          </div>

          {/* ── Foto ── */}
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: `${layout.photoMarginBottom}px`, flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <div
              style={{
                transform: fotoAutoreUrl ? 'rotate(-2deg)' : 'rotate(1.2deg)',
                background: isDark ? '#F4F0E6' : '#FDFCF8',
                border: `3px solid ${isDark ? '#D8CDBC' : palette.borderColor}`,
                borderRadius: '5px 4px 8px 5px',
                padding: `${layout.photoPaddingTop}px ${layout.photoPaddingX}px ${layout.photoPaddingBottom}px`,
                boxShadow: palette.photoShadow,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              <div
                className="masking-tape author-photo-tape"
                aria-hidden="true"
                style={{
                  animation: 'none',
                  position: 'absolute',
                  top: '-19px',
                  left: '-35px',
                  width: '102px',
                  height: '32px',
                  zIndex: 3,
                  opacity: 0.82,
                  transform: 'rotate(-32deg)',
                }}
              />
              {fotoAutoreUrl ? (
                <img
                  draggable={false}
                  src={fotoAutoreUrl}
                  alt={autoreGiorno}
                  crossOrigin="anonymous"
                  style={{
                    display: 'block',
                    width: `${layout.photoWidth}px`,
                    height: `${layout.photoHeight}px`,
                    objectFit: 'cover',
                    filter: 'grayscale(100%) contrast(92%) brightness(1.04)',
                  }}
                />
              ) : (
                <div
                  style={{
                    alignItems: 'center',
                    background:
                      `linear-gradient(135deg, ${isDark ? 'rgba(43,38,32,0.07)' : 'rgba(222,107,88,0.08)'}, transparent 52%), ${isDark ? '#EDE5D8' : '#F6F0E5'}`,
                    color: '#8B6D4E',
                    display: 'flex',
                    flexDirection: 'column',
                    height: `${layout.photoHeight}px`,
                    justifyContent: 'center',
                    width: `${layout.photoWidth}px`,
                  }}
                >
                  <span className={stampwriter.className} style={{ color: '#B85045', fontSize: '28px', letterSpacing: '0.18em', marginBottom: '22px', textTransform: 'uppercase' }}>
                    Ex Libris
                  </span>
                  <span style={{ border: '3px solid rgba(139,109,78,0.42)', borderRadius: '999px', color: '#654B35', fontSize: '74px', fontWeight: 700, height: '150px', lineHeight: '146px', textAlign: 'center', width: '150px' }}>
                    {initials}
                  </span>
                </div>
              )}
              <span
                className={caveat.className}
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: `${layout.photoPaddingX + 4}px`,
                  color: 'rgba(95,73,52,0.78)',
                  fontSize: '28px',
                  lineHeight: 1,
                  transform: 'rotate(-1.5deg)',
                  whiteSpace: 'nowrap',
                }}
              >
                {photoCaption}
              </span>
            </div>
          </div>

          {/* ── Nome autore ── */}
          <h2
            style={{
              fontSize: `${authorFontSize}px`,
              fontWeight: 700,
              color: palette.textPrimary,
              textAlign: 'center',
              margin: `0 0 ${layout.authorMarginBottom}px`,
              lineHeight: 1.1,
              width: '100%',
              maxWidth: '920px',
              whiteSpace: authorNameWraps ? 'normal' : 'nowrap',
              wordBreak: 'normal',
              flexShrink: 0,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {autoreGiorno}
          </h2>

          {/* ── Descrizione ── */}
          <p
            style={{
              fontSize: `${layout.descFontSize}px`,
              fontWeight: 400,
              color: palette.textBody,
              textAlign: 'center',
              margin: `0 0 ${layout.descMarginBottom}px`,
              lineHeight: layout.descLineHeight,
              maxWidth: `${layout.descMaxWidth}px`,
              flexShrink: 0,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {descTesto}
          </p>

          {/* ── Divisore (senza filtri SVG, identico a satori) ── */}
          <div aria-hidden="true" style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: `${layout.dividerMarginBottom}px`, flexShrink: 0, pointerEvents: 'none', position: 'relative', zIndex: 1 }}>
            <svg viewBox="0 0 800 36" xmlns="http://www.w3.org/2000/svg" style={{ width: '864px', height: '26px', display: 'block' }}>
              <path d="M 30 20 Q 120 12 220 18 Q 320 24 420 16 Q 520 9 630 19 Q 710 26 770 18" fill="none" stroke={palette.wcColor} strokeWidth="7" strokeLinecap="round" opacity="0.55" />
              <path d="M 60 16 Q 180 10 300 15 Q 430 20 550 13 Q 660 8 750 16" fill="none" stroke={palette.wcColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
              <path d="M 100 22 Q 250 28 400 21 Q 550 14 700 23" fill="none" stroke={palette.wcColor} strokeWidth="3" strokeLinecap="round" opacity="0.18" />
            </svg>
          </div>

          {/* ── Box citazione ── */}
          <div
            style={{
              width: '100%',
              padding: `${layout.quotePaddingY}px ${layout.quotePaddingX}px ${layout.quotePaddingY + 2}px ${layout.quotePaddingX + 18}px`,
              background: palette.cardBg,
              border: '0',
              borderRadius: `${layout.quoteRadius}px`,
              boxSizing: 'border-box',
              flexShrink: 0,
              position: 'relative',
              zIndex: 1,
              boxShadow: `${palette.quoteShadow}, ${palette.quoteInset}`,
            }}
          >
            <span
              style={{
                fontSize: `${layout.quoteMarkFontSize}px`,
                lineHeight: 0.7,
                color: palette.accent,
                opacity: 0.35,
                display: 'block',
                marginBottom: `${layout.quoteMarkMarginBottom}px`,
              }}
            >
              &ldquo;
            </span>
            <p
              style={{
                fontSize: `${layout.quoteFontSize}px`,
                fontStyle: 'italic',
                fontWeight: 400,
                color: palette.textPrimary,
                lineHeight: layout.quoteLineHeight,
                margin: `0 0 ${layout.quoteMarginBottom}px`,
              }}
            >
              {citTesto}
            </p>
            <p
              style={{
                fontSize: `${layout.sourceFontSize}px`,
                fontWeight: 700,
                color: palette.textMuted,
                textAlign: 'right',
                margin: 0,
              }}
            >
              &mdash; {citazione.autore}
              {citazione.fonte ? (
                <span style={{ fontWeight: 400, fontStyle: 'italic' }}>, {citazione.fonte}</span>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
