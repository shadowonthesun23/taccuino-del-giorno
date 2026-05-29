'use client';

import { useState } from 'react';
import { EB_Garamond, Caveat } from 'next/font/google';
import { Download, EyeOff, Loader2 } from 'lucide-react';

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

// Valori in px originali satori (il div interno è 1080px, scalato 1/3 via CSS transform)
function truncateCitation(testo: string): { testo: string; fontSize: string } {
  const len = testo.length;
  if (len <= 200) return { testo, fontSize: '39px' };
  if (len <= 350) return { testo, fontSize: '34px' };
  if (len <= 500) {
    const truncated = testo.slice(0, 350).trimEnd();
    return { testo: truncated + (testo.length > 350 ? '\u2026' : ''), fontSize: '31px' };
  }
  const truncated = testo.slice(0, 300).trimEnd();
  return { testo: truncated + (testo.length > 300 ? '\u2026' : ''), fontSize: '28px' };
}

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
        body: JSON.stringify({ autoreGiorno, breveDescrizione, fotoAutoreUrl, citazione, dataOdierna }),
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

  const bg = '#F4F0E6';
  const textPrimary = '#2A2522';
  const textMuted = '#8A817C';
  const accent = '#DE6B58';
  const cardBg = '#FDFCF8';
  const borderColor = '#EBE5DB';
  const wcColor = '#b5956a';

  const { testo: citTesto, fontSize: citFontSize } = truncateCitation(citazione.testo);

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
          border: `1px solid ${borderColor}`,
          overflow: 'hidden',
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
            backgroundColor: bg,
            backgroundImage: 'url("/beige-paper.png")',
            backgroundRepeat: 'repeat',
            backgroundBlendMode: 'soft-light',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '90px 72px 48px',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          {/* ── Washi tape data ── */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '36px', position: 'relative', height: '88px', flexShrink: 0 }}>
            {/* Tape body con tacche triangolari ai bordi — replica makeWashiTapeSvg */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={560}
              height={88}
              viewBox="0 0 560 88"
              style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)' }}
            >
              {/* Tape pieno */}
              <rect width="560" height="88" fill="#e8dcc6" />
              {/* Riflesso luce */}
              <rect x="11" y="0" width="538" height="88" fill="rgba(255,255,255,0.18)" />
              {/* Tacche sinistra — triangoli che puntano a destra (verso interno) */}
              {Array.from({ length: Math.ceil(88 / 11) }, (_, i) => (
                <path key={`l${i}`} d={`M 0,${i * 11} L 11,${i * 11 + 5.5} L 0,${i * 11 + 11} Z`} fill={bg} />
              ))}
              {/* Tacche destra */}
              {Array.from({ length: Math.ceil(88 / 11) }, (_, i) => (
                <path key={`r${i}`} d={`M 560,${i * 11} L 549,${i * 11 + 5.5} L 560,${i * 11 + 11} Z`} fill={bg} />
              ))}
              {/* Ombra bottom */}
              <rect x="11" y="86" width="538" height="2" fill="rgba(0,0,0,0.07)" />
            </svg>
            {/* Testo data centrato sul tape */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className={caveat.className} style={{ fontSize: '52px', fontWeight: 700, color: textMuted }}>
                {dataOdierna}
              </span>
            </div>
          </div>

          {/* ── Etichetta ── */}
          <span
            style={{
              fontSize: '33px',
              fontWeight: 700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: accent,
              marginBottom: '24px',
              flexShrink: 0,
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
                color: textMuted,
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
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '12px', flexShrink: 0 }}>
            {fotoAutoreUrl && (
              <div
                style={{
                  transform: 'rotate(-2deg)',
                  background: cardBg,
                  border: `3px solid ${borderColor}`,
                  padding: '24px 24px 60px 24px',
                  boxShadow: '0 8px 24px -6px rgba(0,0,0,0.2)',
                }}
              >
                <img
                  src={fotoAutoreUrl}
                  alt={autoreGiorno}
                  crossOrigin="anonymous"
                  style={{
                    display: 'block',
                    width: '312px',
                    height: '396px',
                    objectFit: 'cover',
                    filter: 'grayscale(100%)',
                  }}
                />
              </div>
            )}
          </div>

          {/* ── Nome autore ── */}
          <h2
            style={{
              fontSize: '78px',
              fontWeight: 700,
              color: textPrimary,
              textAlign: 'center',
              margin: '0 0 12px',
              lineHeight: 1.1,
              flexShrink: 0,
            }}
          >
            {autoreGiorno}
          </h2>

          {/* ── Descrizione ── */}
          <p
            style={{
              fontSize: '36px',
              fontWeight: 400,
              color: textMuted,
              textAlign: 'center',
              margin: '0 0 20px',
              lineHeight: 1.45,
              maxWidth: '870px',
              flexShrink: 0,
            }}
          >
            {breveDescrizione}
          </p>

          {/* ── Divisore (senza filtri SVG, identico a satori) ── */}
          <div aria-hidden="true" style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '20px', flexShrink: 0, pointerEvents: 'none' }}>
            <svg viewBox="0 0 800 36" xmlns="http://www.w3.org/2000/svg" style={{ width: '864px', height: '26px', display: 'block' }}>
              <path d="M 30 20 Q 120 12 220 18 Q 320 24 420 16 Q 520 9 630 19 Q 710 26 770 18" fill="none" stroke={wcColor} strokeWidth="7" strokeLinecap="round" opacity="0.55" />
              <path d="M 60 16 Q 180 10 300 15 Q 430 20 550 13 Q 660 8 750 16" fill="none" stroke={wcColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
              <path d="M 100 22 Q 250 28 400 21 Q 550 14 700 23" fill="none" stroke={wcColor} strokeWidth="3" strokeLinecap="round" opacity="0.18" />
            </svg>
          </div>

          {/* ── Box citazione ── */}
          <div
            style={{
              width: '100%',
              padding: '24px 42px 28px',
              background: cardBg,
              border: `3px solid ${borderColor}`,
              borderRadius: '30px',
              boxSizing: 'border-box',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: '80px',
                lineHeight: 0.7,
                color: accent,
                opacity: 0.35,
                display: 'block',
                marginBottom: '8px',
              }}
            >
              &ldquo;
            </span>
            <p
              style={{
                fontSize: `${citFontSize}`,
                fontStyle: 'italic',
                fontWeight: 400,
                color: textPrimary,
                lineHeight: 1.55,
                margin: '0 0 18px',
              }}
            >
              {citTesto}
            </p>
            <p
              style={{
                fontSize: '30px',
                fontWeight: 700,
                color: textMuted,
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
