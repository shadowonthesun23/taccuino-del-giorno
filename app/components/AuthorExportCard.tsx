'use client';

import { useState } from 'react';
import { EB_Garamond, Caveat } from 'next/font/google';
import { Download, EyeOff, Loader2 } from 'lucide-react';
import { clampText, getAuthorCardLayout, getAuthorCardPalette } from '@/app/lib/authorCardDesign';

const garamond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
});
const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

interface AuthorExportCardProps {
  autoreGiorno: string;
  breveDescrizione: string;
  fotoAutoreUrl?: string | null;
  citazione: { testo: string; autore: string; fonte: string };
  dataOdierna: string;
  isDark: boolean;
  onHidePreview?: () => void;
  hidePreviewLabel?: string;
  saveImageLabel?: string;
}

const CARD_W = 360;
const CARD_H = 640;

export default function AuthorExportCard({
  autoreGiorno,
  breveDescrizione,
  fotoAutoreUrl,
  citazione,
  dataOdierna,
  isDark,
  onHidePreview,
  hidePreviewLabel = 'Nascondi',
  saveImageLabel = 'Salva',
}: AuthorExportCardProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch('/api/genera-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoreGiorno, breveDescrizione, fotoAutoreUrl, citazione, dataOdierna, isDark }),
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          errMsg = errJson.error || JSON.stringify(errJson);
        } catch {
          errMsg = await res.text();
        }
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const nomeFile = autoreGiorno
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      link.download = `taccuino-${nomeFile}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Errore durante l'export:", e);
      alert(`Errore: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
  };

  const palette = getAuthorCardPalette(isDark);
  const layout = getAuthorCardLayout(citazione.testo, breveDescrizione);
  const citTesto = clampText(citazione.testo, layout.maxCitationChars);
  const descTesto = clampText(breveDescrizione, layout.maxDescriptionChars);

  // Scala 1:3 rispetto al PNG satori (1080×1920 → 360×640)
  const S = 1 / 3;

  return (
    <div className="relative group">
      <div className="mb-3 flex flex-nowrap items-center justify-center gap-2">
        {onHidePreview && (
          <button
            onClick={onHidePreview}
            title={hidePreviewLabel}
            aria-label={hidePreviewLabel}
            className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-widest backdrop-blur-sm transition-colors ${
              isDark
                ? 'border-[#DE6B58]/55 bg-[#DE6B58]/10 text-[#DE6B58] hover:border-[#DE6B58] hover:bg-[#DE6B58]/15'
                : 'border-[#DE6B58]/60 bg-[#F4F0E6]/75 text-[#DE6B58] hover:border-[#DE6B58] hover:bg-[#DE6B58]/10'
            }`}
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
          className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-widest backdrop-blur-sm transition-colors disabled:cursor-wait disabled:opacity-60 ${
            isDark
              ? 'border-[#DE6B58]/55 bg-[#DE6B58]/10 text-[#DE6B58] hover:border-[#DE6B58] hover:bg-[#DE6B58]/15'
              : 'border-[#DE6B58]/60 bg-[#F4F0E6]/75 text-[#DE6B58] hover:border-[#DE6B58] hover:bg-[#DE6B58]/10'
          }`}
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
          className={garamond.className}
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

          {/* ── Washi tape data ── */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: `${layout.tapeMarginBottom}px`, position: 'relative', height: `${layout.tapeHeight}px`, flexShrink: 0, zIndex: 1 }}>
            {/* Tape body con tacche triangolari ai bordi — replica makeWashiTapeSvg */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={layout.tapeWidth}
              height={layout.tapeHeight}
              viewBox={`0 0 ${layout.tapeWidth} ${layout.tapeHeight}`}
              style={{ transform: 'rotate(-2deg)' }}
            >
              <polygon
                points={[
                  [0.01, 0.02], [0.99, 0], [0.98, 0.12], [1, 0.24],
                  [0.98, 0.36], [1, 0.48], [0.98, 0.62], [1, 0.74],
                  [0.98, 0.88], [0.99, 1], [0.02, 0.98], [0, 0.85],
                  [0.02, 0.7], [0, 0.58], [0.02, 0.44], [0, 0.3],
                  [0.02, 0.16], [0, 0.05],
                ].map(([x, y]) => `${Math.round(layout.tapeWidth * x)},${Math.round(layout.tapeHeight * y)}`).join(' ')}
                fill={palette.tapeBg}
              />
              <path d={`M ${layout.tapeWidth * 0.08} ${layout.tapeHeight * 0.2} C ${layout.tapeWidth * 0.34} ${layout.tapeHeight * 0.1}, ${layout.tapeWidth * 0.58} ${layout.tapeHeight * 0.26}, ${layout.tapeWidth * 0.92} ${layout.tapeHeight * 0.14}`} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
              <path d={`M ${layout.tapeWidth * 0.08} ${layout.tapeHeight * 0.86} C ${layout.tapeWidth * 0.38} ${layout.tapeHeight * 0.96}, ${layout.tapeWidth * 0.6} ${layout.tapeHeight * 0.78}, ${layout.tapeWidth * 0.92} ${layout.tapeHeight * 0.9}`} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />
            </svg>
            {/* Testo data centrato sul tape */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className={caveat.className} style={{ fontSize: `${layout.dateFontSize}px`, fontWeight: 700, color: palette.tapeText, transform: 'rotate(-2deg)' }}>
                {dataOdierna}
              </span>
            </div>
          </div>

          {/* ── Etichetta ── */}
          <span
            style={{
              fontSize: `${layout.labelFontSize}px`,
              fontWeight: 700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: palette.accent,
              marginBottom: `${layout.labelMarginBottom}px`,
              flexShrink: 0,
              position: 'relative',
              zIndex: 1,
            }}
          >
            Autore del Giorno
          </span>

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
            {fotoAutoreUrl && (
              <div
                style={{
                  transform: 'rotate(-2deg)',
                  background: isDark ? '#F4F0E6' : '#FDFCF8',
                  border: `3px solid ${isDark ? '#D8CDBC' : palette.borderColor}`,
                  padding: `${layout.photoPaddingTop}px ${layout.photoPaddingX}px ${layout.photoPaddingBottom}px`,
                  boxShadow: palette.photoShadow,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
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
              </div>
            )}
          </div>

          {/* ── Nome autore ── */}
          <h2
            style={{
              fontSize: `${layout.authorFontSize}px`,
              fontWeight: 700,
              color: palette.textPrimary,
              textAlign: 'center',
              margin: `0 0 ${layout.authorMarginBottom}px`,
              lineHeight: 1.1,
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
              padding: `${layout.quotePaddingY}px ${layout.quotePaddingX}px ${layout.quotePaddingY + 2}px`,
              background: palette.cardBg,
              border: `3px solid ${palette.borderColor}`,
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
