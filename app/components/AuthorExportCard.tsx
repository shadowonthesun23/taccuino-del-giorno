'use client';

import { useRef, useState } from 'react';
import { EB_Garamond, Caveat } from 'next/font/google';
import { Download, Loader2 } from 'lucide-react';

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
}

const CARD_W = 360;
const CARD_H = 640;
const SCALE = 3;

function truncateCitation(testo: string): { testo: string; fontSize: string } {
  const len = testo.length;
  if (len <= 200) return { testo, fontSize: '13px' };
  if (len <= 350) return { testo, fontSize: '11.5px' };
  if (len <= 500) {
    const truncated = testo.slice(0, 350).trimEnd();
    return { testo: truncated + (testo.length > 350 ? '…' : ''), fontSize: '10.5px' };
  }
  const truncated = testo.slice(0, 300).trimEnd();
  return { testo: truncated + (testo.length > 300 ? '…' : ''), fontSize: '9.5px' };
}

export default function AuthorExportCard({
  autoreGiorno,
  breveDescrizione,
  fotoAutoreUrl,
  citazione,
  dataOdierna,
  isDark,
}: AuthorExportCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;

      // Porta la card esattamente in cima al viewport
      cardRef.current.scrollIntoView({ block: 'start', behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 150));

      // Cattura direttamente il nodo della card.
      // x/y dicono a html2canvas di partire dall'angolo in alto-sinistra dell'elemento stesso,
      // width/height limitano la finestra di rendering alle sole dimensioni della card.
      const canvas = await html2canvas(cardRef.current, {
        scale: SCALE,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
        x: 0,
        y: 0,
        width: CARD_W,
        height: CARD_H,
        windowWidth: CARD_W,
        windowHeight: CARD_H,
      });

      // Il canvas prodotto è già esattamente CARD_W*SCALE x CARD_H*SCALE
      const link = document.createElement('a');
      const nomeFile = autoreGiorno
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      link.download = `taccuino-${nomeFile}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.93);
      link.click();
    } catch (e) {
      console.error("Errore durante l'export:", e);
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

  return (
    <div className="relative group">
      <div className="flex justify-end mb-2">
        <button
          onClick={handleExport}
          disabled={exporting}
          title="Esporta come immagine"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-bold tracking-widest uppercase transition-all"
          style={{
            borderColor: accent,
            color: accent,
            background: 'transparent',
            opacity: exporting ? 0.6 : 1,
            cursor: exporting ? 'wait' : 'pointer',
          }}
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? 'Esportando...' : 'Salva come immagine'}
        </button>
      </div>

      <div
        style={{
          width: `${CARD_W}px`,
          height: `${CARD_H}px`,
          overflow: 'hidden',
          margin: '0 auto',
          borderRadius: '16px',
          border: `1px solid ${borderColor}`,
        }}
      >
        <div
          ref={cardRef}
          className={garamond.className}
          style={{
            width: `${CARD_W}px`,
            height: `${CARD_H}px`,
            background: bg,
            backgroundImage: 'url("/beige-paper.png")',
            backgroundRepeat: 'repeat',
            backgroundBlendMode: 'multiply',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 24px 16px',
            boxSizing: 'border-box',
          }}
        >
          {/* Data tape */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '6px', flexShrink: 0 }}>
            <div
              className={caveat.className}
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: textMuted,
                background: '#e8dcc6',
                padding: '4px 24px 6px',
                borderRadius: '2px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                lineHeight: 1,
                textAlign: 'center',
                display: 'inline-block',
              }}
            >
              {dataOdierna}
            </div>
          </div>

          {/* Etichetta */}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: accent,
              marginBottom: '8px',
              flexShrink: 0,
            }}
          >
            Autore del Giorno
          </span>

          {/* Diapositiva */}
          {fotoAutoreUrl && (
            <div style={{ transform: 'rotate(-2deg)', marginBottom: '4px', flexShrink: 0 }}>
              <div
                style={{
                  background: cardBg,
                  border: `1px solid ${borderColor}`,
                  padding: '8px 8px 20px 8px',
                  boxShadow: '0 4px 16px -4px rgba(0,0,0,0.18)',
                }}
              >
                <img
                  src={fotoAutoreUrl}
                  alt={autoreGiorno}
                  crossOrigin="anonymous"
                  style={{
                    display: 'block',
                    width: '104px',
                    height: '132px',
                    objectFit: 'cover',
                    filter: 'grayscale(100%) contrast(90%) brightness(1.05)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Nome autore */}
          <h2
            style={{
              fontSize: '26px',
              fontWeight: 700,
              color: textPrimary,
              textAlign: 'center',
              margin: '0 0 4px',
              lineHeight: 1.1,
              flexShrink: 0,
            }}
          >
            {autoreGiorno}
          </h2>

          {/* Biografia */}
          <p
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: textMuted,
              textAlign: 'center',
              margin: '0 0 8px',
              lineHeight: 1.45,
              maxWidth: '290px',
              flexShrink: 0,
            }}
          >
            {breveDescrizione}
          </p>

          {/* Divisore watercolor */}
          <div
            aria-hidden="true"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '4px', flexShrink: 0, pointerEvents: 'none' }}
          >
            <svg viewBox="0 0 800 36" xmlns="http://www.w3.org/2000/svg" style={{ width: '80%', height: '24px', display: 'block' }}>
              <defs>
                <filter id="ec-wc-blur" x="-10%" y="-60%" width="120%" height="220%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.04 0.3" numOctaves={4} seed={8} result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale={5} xChannelSelector="R" yChannelSelector="G" result="displaced" />
                  <feGaussianBlur in="displaced" stdDeviation={1.2} result="blurred" />
                  <feComposite in="blurred" in2="SourceGraphic" operator="atop" />
                </filter>
                <filter id="ec-wc-edge" x="-5%" y="-80%" width="110%" height="260%">
                  <feTurbulence type="turbulence" baseFrequency="0.08 0.6" numOctaves={3} seed={14} result="noise2" />
                  <feDisplacementMap in="SourceGraphic" in2="noise2" scale={3} xChannelSelector="R" yChannelSelector="G" />
                </filter>
              </defs>
              <path d="M 30 20 Q 120 12 220 18 Q 320 24 420 16 Q 520 9 630 19 Q 710 26 770 18" fill="none" stroke={wcColor} strokeWidth="7" strokeLinecap="round" opacity="0.55" filter="url(#ec-wc-blur)" />
              <path d="M 60 16 Q 180 10 300 15 Q 430 20 550 13 Q 660 8 750 16" fill="none" stroke={wcColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.3" filter="url(#ec-wc-edge)" />
              <path d="M 100 22 Q 250 28 400 21 Q 550 14 700 23" fill="none" stroke={wcColor} strokeWidth="3" strokeLinecap="round" opacity="0.18" filter="url(#ec-wc-blur)" />
            </svg>
          </div>

          {/* Box citazione */}
          <div
            style={{
              width: '100%',
              padding: '10px 14px',
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: '10px',
              boxSizing: 'border-box',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: '28px',
                lineHeight: 1,
                color: accent,
                opacity: 0.35,
                fontFamily: 'Georgia, serif',
                display: 'block',
                marginBottom: '2px',
              }}
            >
              &ldquo;
            </span>
            <p
              style={{
                fontSize: citFontSize,
                fontStyle: 'italic',
                fontWeight: 500,
                color: textPrimary,
                lineHeight: 1.55,
                margin: '0 0 6px',
              }}
            >
              {citTesto}
            </p>
            <p
              style={{
                fontSize: '10px',
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
